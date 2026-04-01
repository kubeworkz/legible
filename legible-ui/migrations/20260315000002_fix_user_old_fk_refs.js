/**
 * Fix stale foreign key references to "user_old" in SQLite.
 *
 * The OIDC migration (20260314000001) renamed the "user" table to "user_old"
 * and back, but SQLite automatically rewrote FK references in other tables
 * to point at "user_old". After the old table was dropped those FKs became
 * dangling, causing "no such table: main.user_old" at runtime.
 *
 * This migration rebuilds every affected table so its FKs point at "user".
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.config = { transaction: false };

exports.up = async function (knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';
  if (!isSqlite) return; // Only SQLite is affected

  const broken = await knex.raw(
    `SELECT name, sql FROM sqlite_master WHERE type='table' AND sql LIKE '%user_old%'`
  );

  if (broken.length === 0) return; // Already clean

  await knex.raw('PRAGMA foreign_keys = OFF');

  for (const row of broken) {
    const tbl = row.name;
    const fixedSql = row.sql
      .replace(/"user_old"/g, '"user"')
      .replace(
        new RegExp('CREATE TABLE [`"]' + tbl + '[`"]'),
        'CREATE TABLE "' + tbl + '_fk_fix"'
      );

    await knex.raw(fixedSql);

    const cols = (await knex.raw(`PRAGMA table_info("${tbl}")`))
      .map((c) => '"' + c.name + '"')
      .join(', ');
    await knex.raw(
      `INSERT INTO "${tbl}_fk_fix" (${cols}) SELECT ${cols} FROM "${tbl}"`
    );
    await knex.raw(`DROP TABLE "${tbl}"`);
    await knex.raw(`ALTER TABLE "${tbl}_fk_fix" RENAME TO "${tbl}"`);
  }

  await knex.raw('PRAGMA foreign_keys = ON');
};

exports.down = async function () {
  // No rollback — the fix is idempotent and correct
};
