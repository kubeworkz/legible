/**
 * LLM Service — calls LLM providers for Agent Builder workflow nodes.
 *
 * Supports OpenAI-compatible APIs (OpenAI, OpenRouter, Groq, Azure)
 * and Anthropic, using the project's BYOK key.
 */
import axios from 'axios';
import { getLogger } from '@server/utils';
import { Encryptor } from '@server/utils';
import { getConfig } from '@server/config';
import { IProjectRepository } from '@server/repositories/projectRepository';

const logger = getLogger('LLMService');

// ─── Types ─────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

// ─── Provider base URLs ────────────────────────────────

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  anthropic: 'https://api.anthropic.com',
  azure: '', // set via custom endpoint
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  openrouter: 'openai/gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  anthropic: 'claude-sonnet-4-20250514',
};

// ─── Interface ─────────────────────────────────────────

export interface ILLMService {
  chatCompletion(
    projectId: number,
    messages: ChatMessage[],
    options?: LLMCallOptions,
  ): Promise<LLMResponse>;
}

// ─── Implementation ────────────────────────────────────

export class LLMService implements ILLMService {
  private readonly projectRepository: IProjectRepository;
  private readonly encryptor: Encryptor;

  constructor({
    projectRepository,
  }: {
    projectRepository: IProjectRepository;
  }) {
    this.projectRepository = projectRepository;
    const config = getConfig();
    this.encryptor = new Encryptor(config);
  }

  public async chatCompletion(
    projectId: number,
    messages: ChatMessage[],
    options: LLMCallOptions = {},
  ): Promise<LLMResponse> {
    // Get the project's BYOK config
    const project = await this.projectRepository.findOneBy({ id: projectId });
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    if (!project.llmApiKey) {
      throw new Error(
        'No LLM API key configured for this project. ' +
          'Set one in Settings > BYOK.',
      );
    }

    const apiKey = this.decryptApiKey(project.llmApiKey);
    const provider = (project.llmProvider || 'openrouter').toLowerCase();
    const model = options.model || DEFAULT_MODELS[provider] || 'gpt-4o-mini';

    logger.info(
      `LLM call: provider=${provider}, model=${model}, messages=${messages.length}`,
    );

    if (provider === 'anthropic') {
      return this.callAnthropic(apiKey, model, messages, options);
    }

    // OpenAI-compatible providers
    return this.callOpenAICompatible(apiKey, provider, model, messages, options);
  }

  // ─── OpenAI-compatible ───────────────────────────────

  private async callOpenAICompatible(
    apiKey: string,
    provider: string,
    model: string,
    messages: ChatMessage[],
    options: LLMCallOptions,
  ): Promise<LLMResponse> {
    const baseUrl = PROVIDER_BASE_URLS[provider] || PROVIDER_BASE_URLS.openai;
    const url = `${baseUrl}/chat/completions`;

    const body: any = {
      model,
      messages,
    };

    if (options.temperature != null) body.temperature = options.temperature;
    if (options.maxTokens != null) body.max_tokens = options.maxTokens;
    if (options.topP != null) body.top_p = options.topP;
    if (options.stop) body.stop = options.stop;

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 120000, // 2 minute timeout
      });

      const data = response.data;
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content || '',
        model: data.model || model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        finishReason: choice?.finish_reason || 'stop',
      };
    } catch (err: any) {
      const detail =
        err.response?.data?.error?.message || err.response?.data?.detail || err.message;
      logger.error(`LLM call failed (${provider}/${model}): ${detail}`);
      throw new Error(`LLM call failed: ${detail}`);
    }
  }

  // ─── Anthropic Messages API ──────────────────────────

  private async callAnthropic(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    options: LLMCallOptions,
  ): Promise<LLMResponse> {
    const url = `${PROVIDER_BASE_URLS.anthropic}/v1/messages`;

    // Anthropic requires system prompt separate from messages
    const systemMessages = messages.filter((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');
    const systemPrompt =
      systemMessages.map((m) => m.content).join('\n') || undefined;

    const body: any = {
      model,
      messages: nonSystemMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: options.maxTokens || 4096,
    };

    if (systemPrompt) body.system = systemPrompt;
    if (options.temperature != null) body.temperature = options.temperature;
    if (options.topP != null) body.top_p = options.topP;
    if (options.stop) body.stop_sequences = options.stop;

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        timeout: 120000,
      });

      const data = response.data;
      const text =
        data.content
          ?.filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('') || '';

      return {
        content: text,
        model: data.model || model,
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens:
            (data.usage?.input_tokens || 0) +
            (data.usage?.output_tokens || 0),
        },
        finishReason: data.stop_reason || 'end_turn',
      };
    } catch (err: any) {
      const detail =
        err.response?.data?.error?.message || err.response?.data?.detail || err.message;
      logger.error(`Anthropic call failed (${model}): ${detail}`);
      throw new Error(`LLM call failed: ${detail}`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────

  private decryptApiKey(encrypted: string): string {
    const decrypted = this.encryptor.decrypt(encrypted);
    const parsed = JSON.parse(decrypted);
    return parsed.key;
  }
}
