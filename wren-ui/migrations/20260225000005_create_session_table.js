/**
 * Create the `session` table for auth token storage.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('session', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table
      .string('token', 512)
      .notNullable()
      .unique()
      .comment('Session token (opaque or JWT)');
    table
      .timestamp('expires_at')
      .notNullable()
      .comment('Absolute session expiry');

    table
      .foreign('user_id')
      .references('id')
      .inTable('user')
      .onDelete('CASCADE');

    table.index(['user_id']);
    table.index(['token']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('session');
};
