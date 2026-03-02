/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 *
 * Creates the spreadsheet table for spreadsheet/grid views of SQL results.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('spreadsheet', (table) => {
    table.increments('id').primary();
    table
      .integer('project_id')
      .notNullable()
      .references('id')
      .inTable('project')
      .onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description').nullable();
    table
      .integer('folder_id')
      .nullable()
      .references('id')
      .inTable('folder')
      .onDelete('SET NULL');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.text('source_sql').nullable();
    table.text('columns_metadata').nullable().comment('JSON: column definitions');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('spreadsheet');
};
