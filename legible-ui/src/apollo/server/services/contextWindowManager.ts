/**
 * Context Window Manager — handles token budgeting, message truncation,
 * and conversation summarization for agent chat sessions.
 *
 * Uses a character-based token estimator (≈4 chars per token for English text)
 * to avoid heavy tokenizer dependencies.
 */
import { getLogger } from '@server/utils';
import { ChatMessage } from '@server/services/llmService';

const logger = getLogger('ContextWindowManager');

// ─── Constants ─────────────────────────────────────────

/** Average chars per token for English text (GPT-family models). */
const CHARS_PER_TOKEN = 4;

/** Default context window budget (in tokens). */
const DEFAULT_MAX_TOKENS = 8000;

/** Minimum tokens reserved for the model's response. */
const RESPONSE_RESERVE = 1024;

/** Maximum messages to keep in sliding window when no config specified. */
const DEFAULT_MAX_MESSAGES = 50;

// ─── Types ─────────────────────────────────────────────

export interface MemoryConfig {
  /** Maximum messages to retain (0 = unlimited). */
  maxMessages?: number;
  /** Maximum input token budget for the context window. */
  maxTokens?: number;
  /** Strategy for managing long histories. */
  strategy?: 'sliding_window' | 'summarize';
  /** Whether to inject RAG context from the project knowledge base. */
  ragEnabled?: boolean;
  /** Max number of RAG results to include. */
  ragMaxResults?: number;
}

export interface ContextBudget {
  /** Tokens allocated for system messages (system prompt + RAG context). */
  systemBudget: number;
  /** Tokens allocated for conversation history. */
  historyBudget: number;
  /** Total budget used. */
  totalUsed: number;
  /** Messages that were dropped. */
  droppedCount: number;
}

// ─── Interface ─────────────────────────────────────────

export interface IContextWindowManager {
  /**
   * Estimate the token count for a string.
   */
  estimateTokens(text: string): number;

  /**
   * Estimate the token count for a ChatMessage array.
   */
  estimateMessagesTokens(messages: ChatMessage[]): number;

  /**
   * Apply context window management to a set of messages.
   * Returns a trimmed set of messages that fits within the token budget.
   */
  fitToWindow(
    messages: ChatMessage[],
    config?: MemoryConfig,
    ragContext?: string,
  ): { messages: ChatMessage[]; budget: ContextBudget };

  /**
   * Generate a summary of a conversation for use as compressed context.
   */
  summarizeConversation(messages: ChatMessage[]): string;
}

// ─── Implementation ────────────────────────────────────

export class ContextWindowManager implements IContextWindowManager {
  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  public estimateMessagesTokens(messages: ChatMessage[]): number {
    let total = 0;
    for (const msg of messages) {
      // Each message has ~4 tokens of overhead (role, delimiters)
      total += 4 + this.estimateTokens(msg.content);
    }
    return total;
  }

  public fitToWindow(
    messages: ChatMessage[],
    config?: MemoryConfig,
    ragContext?: string,
  ): { messages: ChatMessage[]; budget: ContextBudget } {
    const maxTokens = (config?.maxTokens || DEFAULT_MAX_TOKENS) - RESPONSE_RESERVE;
    const maxMessages = config?.maxMessages || DEFAULT_MAX_MESSAGES;
    const strategy = config?.strategy || 'sliding_window';

    // Separate system messages from conversation
    const systemMsgs = messages.filter((m) => m.role === 'system');
    const conversationMsgs = messages.filter((m) => m.role !== 'system');

    // Calculate system budget (system prompts + RAG context)
    let systemTokens = this.estimateMessagesTokens(systemMsgs);
    const ragTokens = ragContext ? this.estimateTokens(ragContext) + 4 : 0;
    systemTokens += ragTokens;

    const historyBudget = Math.max(0, maxTokens - systemTokens);

    // Apply message limit first
    let trimmedConversation = conversationMsgs;
    if (maxMessages > 0 && trimmedConversation.length > maxMessages) {
      trimmedConversation = trimmedConversation.slice(-maxMessages);
    }

    // Apply token budgeting
    let droppedCount = 0;

    if (strategy === 'sliding_window') {
      trimmedConversation = this.applySlidingWindow(
        trimmedConversation,
        historyBudget,
      );
      droppedCount = conversationMsgs.length - trimmedConversation.length;
    } else if (strategy === 'summarize') {
      const result = this.applySummarization(
        conversationMsgs,
        trimmedConversation,
        historyBudget,
      );
      trimmedConversation = result.messages;
      droppedCount = result.droppedCount;
    }

    // Reconstruct the full message array
    const result: ChatMessage[] = [...systemMsgs];

    // Inject RAG context as a system message after the main system prompt
    if (ragContext) {
      result.push({
        role: 'system',
        content: ragContext,
      });
    }

    result.push(...trimmedConversation);

    const totalUsed = this.estimateMessagesTokens(result);

    logger.debug(
      `Context window: ${totalUsed} tokens used, ${droppedCount} messages dropped, ` +
        `${result.length} messages retained (strategy=${strategy})`,
    );

    return {
      messages: result,
      budget: {
        systemBudget: systemTokens,
        historyBudget,
        totalUsed,
        droppedCount,
      },
    };
  }

  public summarizeConversation(messages: ChatMessage[]): string {
    // Generate a concise text summary from conversation messages.
    // This is a heuristic summary (no LLM call) — extracts key exchanges.
    const exchanges: string[] = [];
    for (const msg of messages) {
      if (msg.role === 'system') continue;
      const prefix = msg.role === 'user' ? 'User' : 'Assistant';
      const content =
        msg.content.length > 200
          ? msg.content.substring(0, 197) + '...'
          : msg.content;
      exchanges.push(`${prefix}: ${content}`);
    }

    // Keep only the first few and last few for the summary
    if (exchanges.length <= 6) {
      return `[Previous conversation summary]\n${exchanges.join('\n')}`;
    }

    const head = exchanges.slice(0, 3);
    const tail = exchanges.slice(-3);
    return (
      `[Previous conversation summary (${messages.length} messages)]\n` +
      `${head.join('\n')}\n...\n${tail.join('\n')}`
    );
  }

  // ─── Private helpers ────────────────────────────────────

  /**
   * Sliding window: keep the most recent messages that fit in the budget.
   * Always preserves at least the last user message.
   */
  private applySlidingWindow(
    messages: ChatMessage[],
    budgetTokens: number,
  ): ChatMessage[] {
    if (messages.length === 0) return [];

    // Work backwards from the most recent messages
    const result: ChatMessage[] = [];
    let tokenCount = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = 4 + this.estimateTokens(messages[i].content);
      if (tokenCount + msgTokens > budgetTokens && result.length > 0) {
        break;
      }
      result.unshift(messages[i]);
      tokenCount += msgTokens;
    }

    return result;
  }

  /**
   * Summarization strategy: if the conversation is too long,
   * summarize older messages and keep recent ones verbatim.
   */
  private applySummarization(
    allConversation: ChatMessage[],
    trimmedConversation: ChatMessage[],
    budgetTokens: number,
  ): { messages: ChatMessage[]; droppedCount: number } {
    const currentTokens = this.estimateMessagesTokens(trimmedConversation);

    if (currentTokens <= budgetTokens) {
      return { messages: trimmedConversation, droppedCount: 0 };
    }

    // Need to compress. Keep the most recent N messages that fit in 70% of budget,
    // use remaining 30% for summary of older messages.
    const summaryBudget = Math.floor(budgetTokens * 0.3);
    const recentBudget = budgetTokens - summaryBudget;

    const recentMessages = this.applySlidingWindow(
      trimmedConversation,
      recentBudget,
    );
    const droppedCount = allConversation.length - recentMessages.length;

    // Summarize the older messages
    const olderMessages = allConversation.slice(
      0,
      allConversation.length - recentMessages.length,
    );

    if (olderMessages.length > 0) {
      const summary = this.summarizeConversation(olderMessages);
      // Truncate summary to fit in budget
      const maxSummaryChars = summaryBudget * CHARS_PER_TOKEN;
      const truncatedSummary =
        summary.length > maxSummaryChars
          ? summary.substring(0, maxSummaryChars - 3) + '...'
          : summary;

      return {
        messages: [
          { role: 'user' as const, content: truncatedSummary },
          ...recentMessages,
        ],
        droppedCount,
      };
    }

    return { messages: recentMessages, droppedCount };
  }
}
