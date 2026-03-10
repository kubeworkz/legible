/**
 * Migration: Create query_usage table for per-query metering.
 *
 * Each row represents one chargeable SQL query execution.
 * Sample/playground dataset queries are excluded at the application layer.
 *
 * Pricing model: $0.02 per query, first 500 queries per org free.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('query_usage', (table) => {
    table.increments('id').primary();

    table
      .integer('organization_id')
      .notNullable()
      .references('id')
      .inTable('organization')
      .onDelete('CASCADE');

    table
      .integer('project_id')
      .notNullable()
      .references('id')
      .inTable('project')
      .onDelete('CASCADE');

    // User who triggered the query (null for API-key-only access)
    table.integer('user_id').nullable();

    // Source of the query (e.g. 'thread_preview', 'dashboard_item',
    // 'spreadsheet', 'model_preview', 'view_preview', 'direct_sql',
    // 'api_run_sql', 'api_ask', 'api_stream_ask', 'api_vega_chart')
    table.string('source', 64).notNullable();

    // Cost in USD for this query
    table.decimal('cost', 10, 4).notNullable().defaultTo(0.02);

    // Whether this query was within the free tier
    table.boolean('is_free_tier').notNullable().defaultTo(false);

    // Execution duration in milliseconds
    table.integer('duration_ms').nullable();

    // SQL hash for dedup analysis (SHA-256 of the SQL text)
    table.string('sql_hash', 64).nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for billing aggregation
    table.index(['organization_id', 'created_at'], 'idx_query_usage_org_date');
    table.index(['project_id', 'created_at'], 'idx_query_usage_proj_date');
    table.index(['user_id', 'created_at'], 'idx_query_usage_user_date');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('query_usage');
};
