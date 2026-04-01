/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Create gateway table — one OpenShell gateway per organization
  await knex.schema.createTable('gateway', (table) => {
    table.increments('id').primary();
    table
      .integer('organization_id')
      .unsigned()
      .notNullable()
      .unique()
      .references('id')
      .inTable('organization')
      .onDelete('CASCADE');
    table.string('status').notNullable().defaultTo('stopped');
    table.string('endpoint').nullable();
    table.integer('port').nullable();
    table.integer('pid').nullable();
    table.string('cpus').notNullable().defaultTo('4.0');
    table.string('memory').notNullable().defaultTo('16g');
    table.integer('sandbox_count').notNullable().defaultTo(0);
    table.integer('max_sandboxes').notNullable().defaultTo(20);
    table.string('version').nullable();
    table.string('error_message').nullable();
    table.timestamp('last_health_check').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // Add gateway_id to agent table for tracking which gateway runs the sandbox
  await knex.schema.alterTable('agent', (table) => {
    table
      .integer('gateway_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('gateway')
      .onDelete('SET NULL');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('agent', (table) => {
    table.dropColumn('gateway_id');
  });
  await knex.schema.dropTableIfExists('gateway');
};
