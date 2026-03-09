/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('project', (table) => {
    // Encrypted LLM API key for BYOK (Bring Your Own Key).
    // NULL means "use the system default key".
    table.text('llm_api_key').nullable().defaultTo(null);
    // Provider name (e.g. 'openrouter', 'openai', 'anthropic')
    table.string('llm_provider').nullable().defaultTo(null);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('project', (table) => {
    table.dropColumn('llm_api_key');
    table.dropColumn('llm_provider');
  });
};
