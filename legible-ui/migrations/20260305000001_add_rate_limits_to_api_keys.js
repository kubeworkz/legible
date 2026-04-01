/**
 * Add rate limiting and quota columns to org_api_key and project_api_key tables.
 *
 * - rate_limit_rpm: max requests per minute (null = unlimited)
 * - rate_limit_rpd: max requests per day (null = unlimited)
 * - token_quota_monthly: max tokens per calendar month (null = unlimited)
 * - token_quota_used: tokens consumed this billing period
 * - quota_reset_at: when the monthly token quota resets next
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('org_api_key', (table) => {
    table.integer('rate_limit_rpm').nullable(); // requests per minute
    table.integer('rate_limit_rpd').nullable(); // requests per day
    table.bigInteger('token_quota_monthly').nullable(); // monthly token budget
    table.bigInteger('token_quota_used').defaultTo(0); // tokens used this period
    table.timestamp('quota_reset_at').nullable(); // next reset timestamp
  });

  await knex.schema.alterTable('project_api_key', (table) => {
    table.integer('rate_limit_rpm').nullable();
    table.integer('rate_limit_rpd').nullable();
    table.bigInteger('token_quota_monthly').nullable();
    table.bigInteger('token_quota_used').defaultTo(0);
    table.timestamp('quota_reset_at').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('org_api_key', (table) => {
    table.dropColumn('rate_limit_rpm');
    table.dropColumn('rate_limit_rpd');
    table.dropColumn('token_quota_monthly');
    table.dropColumn('token_quota_used');
    table.dropColumn('quota_reset_at');
  });

  await knex.schema.alterTable('project_api_key', (table) => {
    table.dropColumn('rate_limit_rpm');
    table.dropColumn('rate_limit_rpd');
    table.dropColumn('token_quota_monthly');
    table.dropColumn('token_quota_used');
    table.dropColumn('quota_reset_at');
  });
};
