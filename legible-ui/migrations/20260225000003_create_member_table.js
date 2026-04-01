/**
 * Create the `member` table linking users to organizations with roles.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('member', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').notNullable();
    table.integer('user_id').notNullable();
    table
      .string('role')
      .notNullable()
      .defaultTo('member')
      .comment('owner | admin | member | viewer');
    table
      .integer('invited_by')
      .nullable()
      .comment('User who sent the invitation');

    table
      .foreign('organization_id')
      .references('id')
      .inTable('organization')
      .onDelete('CASCADE');
    table
      .foreign('user_id')
      .references('id')
      .inTable('user')
      .onDelete('CASCADE');
    table
      .foreign('invited_by')
      .references('id')
      .inTable('user')
      .onDelete('SET NULL');

    table.unique(['organization_id', 'user_id']);
    table.index(['organization_id']);
    table.index(['user_id']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('member');
};
