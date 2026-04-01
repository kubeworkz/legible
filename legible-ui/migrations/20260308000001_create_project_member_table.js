/**
 * Create the `project_member` table linking users to projects with roles.
 *
 * Roles: owner | contributor | viewer
 *   - owner: full control (manage members, delete project, etc.)
 *   - contributor: can edit models, run queries, create dashboards
 *   - viewer: read-only access to dashboards and query results
 *
 * Org-level OWNER/ADMIN get implicit access to all projects (enforced in code),
 * so they don't always need an explicit row here.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('project_member', (table) => {
    table.increments('id').primary();
    table.integer('project_id').notNullable();
    table.integer('user_id').notNullable();
    table
      .string('role')
      .notNullable()
      .defaultTo('viewer')
      .comment('owner | contributor | viewer');
    table
      .integer('granted_by')
      .nullable()
      .comment('User who granted access');

    table
      .foreign('project_id')
      .references('id')
      .inTable('project')
      .onDelete('CASCADE');
    table
      .foreign('user_id')
      .references('id')
      .inTable('user')
      .onDelete('CASCADE');
    table
      .foreign('granted_by')
      .references('id')
      .inTable('user')
      .onDelete('SET NULL');

    table.unique(['project_id', 'user_id']);
    table.index(['project_id']);
    table.index(['user_id']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('project_member');
};
