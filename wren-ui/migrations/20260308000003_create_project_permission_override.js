/**
 * Create the `project_permission_override` table.
 *
 * Stores per-project viewer permission overrides. Project owners can
 * restrict Viewer access to Modeling and Knowledge sections from the
 * default "read_only" down to "no_permission".
 *
 * One row per project. Defaults are "read_only" for both sections.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('project_permission_override', (table) => {
    table.increments('id').primary();
    table.integer('project_id').notNullable().unique();
    table
      .string('viewer_modeling_access')
      .notNullable()
      .defaultTo('read_only')
      .comment('read_only | no_permission');
    table
      .string('viewer_knowledge_access')
      .notNullable()
      .defaultTo('read_only')
      .comment('read_only | no_permission');

    table
      .foreign('project_id')
      .references('id')
      .inTable('project')
      .onDelete('CASCADE');

    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('project_permission_override');
};
