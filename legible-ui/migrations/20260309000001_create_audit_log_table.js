/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('audit_log', (table) => {
    table.increments('id').primary();
    table
      .timestamp('timestamp')
      .notNullable()
      .defaultTo(knex.fn.now());
    table.integer('user_id').nullable();
    table.string('user_email').nullable();
    table.string('client_ip').nullable();
    table.integer('organization_id').nullable();
    table.integer('project_id').nullable();
    table.string('category').notNullable();
    table.string('action').notNullable();
    table.string('target_type').nullable();
    table.string('target_id').nullable();
    table.string('result').notNullable().defaultTo('success');
    table.text('detail').nullable();
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());

    // Indexes for common query patterns
    table.index(['category'], 'idx_audit_log_category');
    table.index(['action'], 'idx_audit_log_action');
    table.index(['user_id'], 'idx_audit_log_user_id');
    table.index(['organization_id'], 'idx_audit_log_org_id');
    table.index(['project_id'], 'idx_audit_log_project_id');
    table.index(['timestamp'], 'idx_audit_log_timestamp');
    table.index(['category', 'action'], 'idx_audit_log_category_action');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('audit_log');
};
