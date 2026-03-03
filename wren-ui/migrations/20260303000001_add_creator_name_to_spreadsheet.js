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

  // Backfill: set creator_name for existing spreadsheets from the first user
  const users = await knex('user').orderBy('id', 'asc').limit(1);
  if (users.length > 0) {
    const name = users[0].display_name || users[0].email || null;
    if (name) {
      await knex('spreadsheet').whereNull('creator_name').update({ creator_name: name });
    }
  }
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
