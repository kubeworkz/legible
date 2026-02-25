/**
 * Create the `user` table for authentication and identity.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('user', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable().unique().comment('Login email address');
    table.string('password_hash').notNullable().comment('Bcrypt hash');
    table.string('display_name').notNullable().comment('User display name');
    table.string('avatar_url').nullable().comment('Profile picture URL');
    table
      .boolean('is_active')
      .notNullable()
      .defaultTo(true)
      .comment('Soft-disable flag');
    table.timestamp('last_login_at').nullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('user');
};
