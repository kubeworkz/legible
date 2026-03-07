/**
 * Add description column to the dashboard_item table.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('dashboard_item', (table) => {
    table.text('description').nullable().defaultTo(null);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('dashboard_item', (table) => {
    table.dropColumn('description');
  });
};
