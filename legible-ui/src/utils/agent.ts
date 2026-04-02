/**
 * Builds a `legible agent create` CLI command string from the agent configuration
 * chosen in the UI wizard.
 */
export function buildAgentCliCommand(opts: {
  name: string;
  communitySandbox?: string;
  blueprintName?: string;
  image?: string;
  inferenceProfile?: string;
}): string {
  const parts = ['legible agent create', JSON.stringify(opts.name)];

  if (opts.communitySandbox) {
    // Community sandbox — use the community image ID
    parts.push('--from', opts.communitySandbox);
  } else if (opts.blueprintName) {
    parts.push('--blueprint', opts.blueprintName);
    if (opts.inferenceProfile) {
      parts.push('--profile', opts.inferenceProfile);
    }
  } else if (opts.image) {
    parts.push('--from', opts.image);
  }

  return parts.join(' ');
}
