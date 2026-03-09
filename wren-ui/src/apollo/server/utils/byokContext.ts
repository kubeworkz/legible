import { AsyncLocalStorage } from 'async_hooks';

/**
 * BYOK (Bring Your Own Key) request-scoped context.
 *
 * Uses Node.js AsyncLocalStorage to propagate the decrypted BYOK API key
 * through the request lifecycle without modifying every function signature.
 *
 * The context is set in the graphql handler before Apollo processes the request,
 * and read by the WrenAI adaptor when making HTTP calls to the AI service.
 */
export interface ByokConfig {
  apiKey: string;
  provider: string;
}

export const byokStore = new AsyncLocalStorage<ByokConfig | null>();

/**
 * Get the current request's BYOK config, if any.
 * Returns null if no BYOK key is set for the current project.
 */
export function getCurrentByokConfig(): ByokConfig | null {
  return byokStore.getStore() ?? null;
}
