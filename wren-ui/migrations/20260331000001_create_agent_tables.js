/**
 * Create agent and agent_audit_log tables.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('agent', (table) => {
      table.increments('id').primary();
      table
        .integer('project_id')
        .notNullable()
        .references('id')
        .inTable('project')
        .onDelete('CASCADE');
      table.string('name').notNullable();
      table.string('sandbox_name').notNullable().unique();
      table
        .string('status')
        .notNullable()
        .defaultTo('creating')
        .comment(
          'creating | running | stopped | failed',
        );
      table.string('provider_name').nullable();
      table.text('policy_yaml').nullable();
      table.string('image').nullable();
      table.jsonb('metadata').nullable();
      table
        .string('created_at')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .string('updated_at')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .createTable('agent_audit_log', (table) => {
      table.increments('id').primary();
      table
        .integer('agent_id')
        .notNullable()
        .references('id')
        .inTable('agent')
        .onDelete('CASCADE');
      table.string('action').notNullable().comment('created | started | stopped | failed | policy_updated');
      table.text('detail').nullable();
      table
        .string('created_at')
        .notNullable()
        .defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('agent_audit_log')
    .dropTableIfExists('agent');
};
