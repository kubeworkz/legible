/**
 * Add SSO enforcement column to oidc_provider table.
 * When sso_enforced is true, users whose email matches the provider's
 * email domain filter MUST sign in via this provider (password login blocked).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.config = { transaction: false };

exports.up = async function (knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';

  if (isSqlite) {
    // SQLite: use raw ALTER TABLE ADD COLUMN (supported since 3.2.0)
    await knex.raw(
      `ALTER TABLE "oidc_provider" ADD COLUMN "sso_enforced" boolean NOT NULL DEFAULT 0`,
    );
  } else {
    await knex.schema.alterTable('oidc_provider', (table) => {
      table
        .boolean('sso_enforced')
        .notNullable()
        .defaultTo(false)
        .comment(
          'When true, users with matching email domain must use this provider',
        );
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';

  if (isSqlite) {
    // SQLite doesn't support DROP COLUMN before 3.35.0. Use table recreation.
    await knex.raw('PRAGMA foreign_keys = OFF');

    await knex.raw(`
      CREATE TABLE "oidc_provider_backup" AS SELECT
        id, slug, display_name, issuer_url, client_id,
        client_secret_encrypted, scopes, email_domain_filter,
        auto_create_org, enabled, created_at, updated_at
      FROM "oidc_provider"
    `);
    await knex.raw('DROP TABLE "oidc_provider"');
    await knex.raw(
      'ALTER TABLE "oidc_provider_backup" RENAME TO "oidc_provider"',
    );

    await knex.raw('PRAGMA foreign_keys = ON');
  } else {
    await knex.schema.alterTable('oidc_provider', (table) => {
      table.dropColumn('sso_enforced');
    });
  }
};
