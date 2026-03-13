/**
 * Create the `magic_link` table for passwordless authentication tokens.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('magic_link', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('user')
      .onDelete('CASCADE')
      .comment('The user this magic link belongs to');
    table
      .string('token')
      .notNullable()
      .unique()
      .comment('One-time login token sent via email');
    table
      .timestamp('expires_at')
      .notNullable()
      .comment('When this magic link expires');
    table
      .timestamp('used_at')
      .nullable()
      .comment('When the token was consumed (null = unused)');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('magic_link');
};
