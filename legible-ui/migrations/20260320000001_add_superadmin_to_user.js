/**
 * Add is_superadmin flag to the `user` table.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('user', (table) => {
    table
      .boolean('is_superadmin')
      .notNullable()
      .defaultTo(false)
      .comment('Whether the user has superadmin privileges');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('user', (table) => {
    table.dropColumn('is_superadmin');
  });
};
