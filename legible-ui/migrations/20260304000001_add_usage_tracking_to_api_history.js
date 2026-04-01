/**
 * Add API key attribution and token usage tracking columns to api_history.
 *
 * - api_key_id: which API key made the request (null for session-based auth)
 * - api_key_type: 'org' | 'project' | null
 * - organization_id: organization that owns the key/session
 * - tokens_input: LLM input/prompt tokens consumed
 * - tokens_output: LLM output/completion tokens consumed
 * - tokens_total: total tokens consumed
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('api_history', (table) => {
    // API key attribution
    table.integer('api_key_id').nullable();
    table.string('api_key_type', 10).nullable(); // 'org' | 'project'
    table.integer('organization_id').nullable();

    // Token usage tracking
    table.integer('tokens_input').nullable();
    table.integer('tokens_output').nullable();
    table.integer('tokens_total').nullable();

    // Index for usage aggregation queries
    table.index(['organization_id', 'created_at'], 'idx_api_history_org_date');
    table.index(['api_key_id', 'created_at'], 'idx_api_history_key_date');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('api_history', (table) => {
    table.dropIndex(
      ['organization_id', 'created_at'],
      'idx_api_history_org_date',
    );
    table.dropIndex(['api_key_id', 'created_at'], 'idx_api_history_key_date');
    table.dropColumn('api_key_id');
    table.dropColumn('api_key_type');
    table.dropColumn('organization_id');
    table.dropColumn('tokens_input');
    table.dropColumn('tokens_output');
    table.dropColumn('tokens_total');
  });
};
