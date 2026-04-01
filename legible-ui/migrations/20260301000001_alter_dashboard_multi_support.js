/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 *
 * Adds columns to support multiple dashboards per project:
 * - description: optional text description for the dashboard
 * - sort_order: integer for sidebar ordering (0-based)
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('dashboard', (table) => {
    table
      .text('description')
      .nullable()
      .defaultTo(null)
      .comment('Optional description of the dashboard');
    table
      .integer('sort_order')
      .notNullable()
      .defaultTo(0)
      .comment('Display order in the sidebar (lower = first)');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('dashboard', (table) => {
    table.dropColumn('description');
    table.dropColumn('sort_order');
  });
};
