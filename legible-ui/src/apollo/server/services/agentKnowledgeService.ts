/**
 * Agent Knowledge Service — retrieves relevant instructions and SQL pairs
 * from the project knowledge base to inject into agent context.
 */
import { getLogger } from '@server/utils';
import { IInstructionRepository } from '@server/repositories/instructionRepository';
import { ISqlPairRepository } from '@server/repositories/sqlPairRepository';

const logger = getLogger('AgentKnowledgeService');

export interface KnowledgeResult {
  instructions: string[];
  sqlPairs: { question: string; sql: string }[];
  tokenEstimate: number;
}

export interface IAgentKnowledgeService {
  /**
   * Retrieve relevant knowledge from the project's knowledge base.
   * Returns formatted instructions and SQL pairs as context.
   */
  retrieveKnowledge(
    projectId: number,
    query: string,
    maxResults?: number,
  ): Promise<KnowledgeResult>;

  /**
   * Format knowledge results as a string suitable for injecting into system context.
   */
  formatAsContext(knowledge: KnowledgeResult): string;
}

export class AgentKnowledgeService implements IAgentKnowledgeService {
  private readonly instructionRepository: IInstructionRepository;
  private readonly sqlPairRepository: ISqlPairRepository;

  constructor({
    instructionRepository,
    sqlPairRepository,
  }: {
    instructionRepository: IInstructionRepository;
    sqlPairRepository: ISqlPairRepository;
  }) {
    this.instructionRepository = instructionRepository;
    this.sqlPairRepository = sqlPairRepository;
  }

  public async retrieveKnowledge(
    projectId: number,
    query: string,
    maxResults = 5,
  ): Promise<KnowledgeResult> {
    const queryLower = query.toLowerCase();

    // Fetch all project instructions and sql pairs
    const [instructions, sqlPairs] = await Promise.all([
      this.instructionRepository.findAllBy({ projectId } as any),
      this.sqlPairRepository.findAllBy({ projectId } as any),
    ]);

    // Score instructions by relevance to the query
    const scoredInstructions = instructions.map((inst) => ({
      instruction: inst,
      score: this.scoreRelevance(
        queryLower,
        inst.instruction + ' ' + (inst.questions || []).join(' '),
      ),
    }));
    scoredInstructions.sort((a, b) => b.score - a.score);

    // Score SQL pairs by relevance
    const scoredPairs = sqlPairs.map((pair) => ({
      pair,
      score: this.scoreRelevance(
        queryLower,
        pair.question + ' ' + pair.sql,
      ),
    }));
    scoredPairs.sort((a, b) => b.score - a.score);

    // Take top results — include all default instructions plus top scored
    const defaultInstructions = instructions
      .filter((i) => i.isDefault)
      .map((i) => i.instruction);

    const relevantInstructions = scoredInstructions
      .filter((s) => s.score > 0 && !s.instruction.isDefault)
      .slice(0, maxResults)
      .map((s) => s.instruction.instruction);

    const allInstructions = [
      ...defaultInstructions,
      ...relevantInstructions,
    ];

    const relevantPairs = scoredPairs
      .filter((s) => s.score > 0)
      .slice(0, maxResults)
      .map((s) => ({ question: s.pair.question, sql: s.pair.sql }));

    // Estimate tokens (~4 chars per token)
    const contextText =
      allInstructions.join(' ') +
      relevantPairs.map((p) => p.question + p.sql).join(' ');
    const tokenEstimate = Math.ceil(contextText.length / 4);

    logger.debug(
      `Knowledge retrieval for project ${projectId}: ` +
        `${allInstructions.length} instructions, ${relevantPairs.length} sql pairs ` +
        `(~${tokenEstimate} tokens)`,
    );

    return {
      instructions: allInstructions,
      sqlPairs: relevantPairs,
      tokenEstimate,
    };
  }

  public formatAsContext(knowledge: KnowledgeResult): string {
    const parts: string[] = [];

    if (knowledge.instructions.length > 0) {
      parts.push('[Knowledge Base — Instructions]');
      knowledge.instructions.forEach((inst, i) => {
        parts.push(`${i + 1}. ${inst}`);
      });
    }

    if (knowledge.sqlPairs.length > 0) {
      parts.push('');
      parts.push('[Knowledge Base — Example SQL Queries]');
      knowledge.sqlPairs.forEach((pair, i) => {
        parts.push(`${i + 1}. Question: ${pair.question}`);
        parts.push(`   SQL: ${pair.sql}`);
      });
    }

    if (parts.length === 0) return '';

    return parts.join('\n');
  }

  /**
   * Simple keyword-overlap relevance scoring.
   * Returns a score ≥ 0 indicating how many query words appear in the text.
   */
  private scoreRelevance(queryLower: string, text: string): number {
    const textLower = text.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((w) => w.length > 2); // skip tiny words

    if (queryWords.length === 0) return 1; // no meaningful query words — include everything

    let matches = 0;
    for (const word of queryWords) {
      if (textLower.includes(word)) {
        matches++;
      }
    }
    return matches / queryWords.length;
  }
}
