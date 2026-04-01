/**
 * The relation.name column had a global unique constraint, but relation names
 * only need to be unique within a project. This caused UNIQUE constraint errors
 * when two projects used the same sample dataset (e.g. ecommerce).
 *
 * This migration drops the global unique index and replaces it with a composite
 * unique index on (name, project_id).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const client = knex.client.config.client;
  const isSqlite =
    client === 'sqlite3' || client === 'better-sqlite3';

  if (isSqlite) {
    // SQLite doesn't support DROP INDEX inside ALTER TABLE, but we can drop
    // the standalone index directly and create the new composite one.
    await knex.raw('DROP INDEX IF EXISTS `relation_name_unique`');
    await knex.raw(
      'CREATE UNIQUE INDEX IF NOT EXISTS `relation_name_project_id_unique` ON `relation` (`name`, `project_id`)',
    );
  } else {
    await knex.schema.alterTable('relation', (table) => {
      table.dropUnique(['name']);
      table.unique(['name', 'project_id']);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const client = knex.client.config.client;
  const isSqlite =
    client === 'sqlite3' || client === 'better-sqlite3';

  if (isSqlite) {
    await knex.raw('DROP INDEX IF EXISTS `relation_name_project_id_unique`');
    await knex.raw(
      'CREATE UNIQUE INDEX `relation_name_unique` ON `relation` (`name`)',
    );
  } else {
    await knex.schema.alterTable('relation', (table) => {
      table.dropUnique(['name', 'project_id']);
      table.unique(['name']);
    });
  }
};
