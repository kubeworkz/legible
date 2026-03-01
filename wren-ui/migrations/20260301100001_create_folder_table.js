/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 *
 * Creates the folder table for organising dashboards and threads
 * into Personal, Public, or custom folders.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('folder', (table) => {
    table.increments('id').primary();
    table
      .integer('project_id')
      .notNullable()
      .references('id')
      .inTable('project')
      .onDelete('CASCADE');
    table.string('name').notNullable();
    table
      .string('type')
      .notNullable()
      .defaultTo('custom')
      .comment('personal | public | custom');
    table
      .integer('owner_id')
      .notNullable()
      .comment('userId of the folder creator');
    table
      .string('visibility')
      .notNullable()
      .defaultTo('private')
      .comment('private | shared');
    table.integer('sort_order').notNullable().defaultTo(0);
    table.timestamps(true, true);
  });

  // Each project gets at most one personal and one public folder
  // (scoped per owner for personal).
  await knex.schema.createTable('folder_access', (table) => {
    table.increments('id').primary();
    table
      .integer('folder_id')
      .notNullable()
      .references('id')
      .inTable('folder')
      .onDelete('CASCADE');
    table
      .integer('user_id')
      .notNullable()
      .comment('userId who is granted access');
    table
      .string('role')
      .notNullable()
      .defaultTo('viewer')
      .comment('editor | viewer');
    table.timestamps(true, true);

    table.unique(['folder_id', 'user_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('folder_access');
  await knex.schema.dropTableIfExists('folder');
};
