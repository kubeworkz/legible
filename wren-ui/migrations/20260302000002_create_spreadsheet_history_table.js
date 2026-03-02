/**
 * Create spreadsheet_history table for version tracking.
 * Each row is a snapshot of the spreadsheet state at a point in time.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('spreadsheet_history', (table) => {
    table.increments('id').primary();
    table
      .integer('spreadsheet_id')
      .notNullable()
      .references('id')
      .inTable('spreadsheet')
      .onDelete('CASCADE');
    table
      .integer('version')
      .notNullable()
      .comment('Auto-incrementing version number per spreadsheet');
    table
      .string('change_type')
      .notNullable()
      .defaultTo('saved')
      .comment('Type: created | saved | restored');
    table.text('source_sql').nullable();
    table.text('columns_metadata').nullable().comment('JSON snapshot');
    table
      .string('change_summary')
      .nullable()
      .comment('Human-readable description of the change');
    table.timestamps(true, true);

    // Unique version per spreadsheet
    table.unique(['spreadsheet_id', 'version']);
    // Index for listing history
    table.index(['spreadsheet_id', 'created_at']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('spreadsheet_history');
};
