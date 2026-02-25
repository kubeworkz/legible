/**
 * Create the `organization` table for multi-tenant grouping.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('organization', (table) => {
    table.increments('id').primary();
    table
      .string('display_name')
      .notNullable()
      .comment('Organization display name');
    table
      .string('slug')
      .notNullable()
      .unique()
      .comment('URL-friendly unique identifier');
    table.string('logo_url').nullable().comment('Organization logo URL');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('organization');
};
