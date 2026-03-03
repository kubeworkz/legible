/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 *
 * Adds a creator_name column to the spreadsheet table.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('spreadsheet', (table) => {
    table.string('creator_name').nullable().defaultTo(null);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('spreadsheet', (table) => {
    table.dropColumn('creator_name');
  });
};
