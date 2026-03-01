/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 *
 * Adds folder_id foreign key to dashboard and thread tables
 * so items can be organised into folders.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('dashboard', (table) => {
    table
      .integer('folder_id')
      .nullable()
      .references('id')
      .inTable('folder')
      .onDelete('SET NULL')
      .comment('Folder this dashboard belongs to (null = unorganised)');
  });

  await knex.schema.alterTable('thread', (table) => {
    table
      .integer('folder_id')
      .nullable()
      .references('id')
      .inTable('folder')
      .onDelete('SET NULL')
      .comment('Folder this thread belongs to (null = unorganised)');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('thread', (table) => {
    table.dropColumn('folder_id');
  });
  await knex.schema.alterTable('dashboard', (table) => {
    table.dropColumn('folder_id');
  });
};
