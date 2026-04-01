/**
 * Migration: Create billing_config table for per-organization cost tracking.
 *
 * Stores token pricing, billing currency, and period settings.
 * Also adds a monthly_usage_cache table for pre-computed monthly aggregation.
 */

exports.up = async function (knex) {
  // ── billing_config ───────────────────────────────────
  await knex.schema.createTable('billing_config', (table) => {
    table.increments('id').primary();
    table
      .integer('organization_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('organization')
      .onDelete('CASCADE');

    // Cost per 1 000 tokens (allows fractions like $0.002 / 1K tokens)
    table.decimal('cost_per_1k_input_tokens', 12, 6).notNullable().defaultTo(0);
    table.decimal('cost_per_1k_output_tokens', 12, 6).notNullable().defaultTo(0);

    // Currency (ISO 4217)
    table.string('currency', 3).notNullable().defaultTo('USD');

    // Optional monthly spend alert threshold (in currency)
    table.decimal('monthly_spend_alert', 12, 2).nullable();

    // Billing period anchor day (1-28, default 1 = 1st of each month)
    table.integer('billing_period_anchor_day').notNullable().defaultTo(1);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // ── monthly_usage_cache ──────────────────────────────
  await knex.schema.createTable('monthly_usage_cache', (table) => {
    table.increments('id').primary();
    table
      .integer('organization_id')
      .notNullable()
      .references('id')
      .inTable('organization')
      .onDelete('CASCADE');

    table.integer('year').notNullable();
    table.integer('month').notNullable(); // 1-12

    // Aggregated counters
    table.integer('total_requests').notNullable().defaultTo(0);
    table.integer('successful_requests').notNullable().defaultTo(0);
    table.integer('failed_requests').notNullable().defaultTo(0);
    table.bigInteger('tokens_input').notNullable().defaultTo(0);
    table.bigInteger('tokens_output').notNullable().defaultTo(0);
    table.bigInteger('tokens_total').notNullable().defaultTo(0);
    table.decimal('estimated_cost', 14, 4).notNullable().defaultTo(0);

    // Per-key breakdown stored as JSON for flexibility
    // [{ apiKeyId, apiKeyType, totalRequests, tokensTotal, estimatedCost }]
    table.jsonb('per_key_breakdown').nullable();

    // Per-api-type breakdown stored as JSON
    // [{ apiType, totalRequests, tokensTotal, estimatedCost }]
    table.jsonb('per_api_type_breakdown').nullable();

    table.timestamp('last_computed_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // One row per org per month
    table.unique(['organization_id', 'year', 'month']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('monthly_usage_cache');
  await knex.schema.dropTableIfExists('billing_config');
};
