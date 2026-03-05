/**
 * Add timezone column to the organization table.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('organization', (table) => {
    table
      .string('timezone')
      .nullable()
      .defaultTo(null)
      .comment('IANA timezone identifier, e.g. America/Toronto');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('organization', (table) => {
    table.dropColumn('timezone');
  });
};
