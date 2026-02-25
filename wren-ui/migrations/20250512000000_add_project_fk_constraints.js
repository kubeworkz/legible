/**
 * Add foreign key constraints with CASCADE DELETE for tables that reference project.
 *
 * These 7 tables were created early on without FK constraints:
 *   model, relation, metric, view, deploy_log, thread, schema_change
 *
 * The newer tables (dashboard, sql_pair, instruction, api_history) already have
 * proper FK constraints with CASCADE DELETE.
 *
 * NOTE: SQLite does not support ALTER TABLE ADD FOREIGN KEY. For SQLite,
 * the application-level cascade in deleteProject/resetCurrentProject handles
 * cleanup. This migration only applies FK constraints on PostgreSQL.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const isPostgres = knex.client.config.client === 'pg';
  if (!isPostgres) {
    // SQLite doesn't support adding FK constraints via ALTER TABLE.
    // App-level cascade deletion handles cleanup for SQLite.
    return;
  }

  const tables = [
    'model',
    'relation',
    'metric',
    'view',
    'deploy_log',
    'thread',
    'schema_change',
  ];

  for (const tableName of tables) {
    await knex.schema.alterTable(tableName, (table) => {
      table
        .foreign('project_id')
        .references('id')
        .inTable('project')
        .onDelete('CASCADE');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const isPostgres = knex.client.config.client === 'pg';
  if (!isPostgres) {
    return;
  }

  const tables = [
    'model',
    'relation',
    'metric',
    'view',
    'deploy_log',
    'thread',
    'schema_change',
  ];

  for (const tableName of tables) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropForeign('project_id');
    });
  }
};
