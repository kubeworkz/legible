/**
 * Add OIDC support:
 * 1. Make password_hash nullable on user table (OIDC users have no password)
 * 2. Create oidc_provider table for configured identity providers
 * 3. Create user_identity table linking external identities to local users
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

// Disable Knex transaction wrapping — required for SQLite PRAGMA and DDL.
exports.config = { transaction: false };

exports.up = async function (knex) {
  const isSqlite = knex.client.config.client === 'better-sqlite3';

  if (isSqlite) {
    // SQLite doesn't support ALTER COLUMN, so we recreate the user table
    // with password_hash nullable. Use raw SQL throughout to avoid
    // Knex schema builder index-naming conflicts.
    await knex.raw('PRAGMA foreign_keys = OFF');
    await knex.raw('ALTER TABLE "user" RENAME TO "user_old"');
    await knex.raw('DROP INDEX IF EXISTS "user_email_unique"');
    await knex.raw('DROP INDEX IF EXISTS "user_email_verification_token_unique"');

    await knex.raw(`
      CREATE TABLE "user" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255),
        "display_name" varchar(255) NOT NULL,
        "avatar_url" varchar(255),
        "is_active" boolean NOT NULL DEFAULT '1',
        "email_verified" boolean NOT NULL DEFAULT '0',
        "email_verification_token" varchar(255),
        "email_verification_expires_at" datetime,
        "last_login_at" datetime,
        "created_at" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await knex.raw('CREATE UNIQUE INDEX "user_email_unique" ON "user" ("email")');
    await knex.raw('CREATE UNIQUE INDEX "user_email_verification_token_unique" ON "user" ("email_verification_token")');

    await knex.raw(`
      INSERT INTO "user" (
        id, email, password_hash, display_name, avatar_url,
        is_active, email_verified, email_verification_token,
        email_verification_expires_at, last_login_at,
        created_at, updated_at
      )
      SELECT
        id, email, password_hash, display_name, avatar_url,
        is_active, email_verified, email_verification_token,
        email_verification_expires_at, last_login_at,
        created_at, updated_at
      FROM "user_old"
    `);

    await knex.raw('DROP TABLE "user_old"');
    await knex.raw('PRAGMA foreign_keys = ON');
  } else {
    // Postgres / MySQL: simple ALTER COLUMN
    await knex.schema.alterTable('user', (table) => {
      table.string('password_hash').nullable().alter();
    });
  }

  // Create oidc_provider table
  await knex.schema.createTable('oidc_provider', (table) => {
    table.increments('id').primary();
    table
      .string('slug')
      .notNullable()
      .unique()
      .comment('Unique key, e.g. google, github, okta-acme');
    table
      .string('display_name')
      .notNullable()
      .comment('Human-readable provider name');
    table
      .string('issuer_url')
      .notNullable()
      .comment('OIDC issuer URL for discovery');
    table.string('client_id').notNullable();
    table
      .text('client_secret_encrypted')
      .notNullable()
      .comment('Encrypted client secret');
    table
      .string('scopes')
      .notNullable()
      .defaultTo('openid email profile')
      .comment('Space-separated OIDC scopes');
    table
      .string('email_domain_filter')
      .nullable()
      .comment('Restrict to this email domain, e.g. acme.com');
    table
      .boolean('auto_create_org')
      .notNullable()
      .defaultTo(true)
      .comment('Create org for new users on first OIDC login');
    table
      .boolean('enabled')
      .notNullable()
      .defaultTo(true);
    table.timestamps(true, true);
  });

  // Create user_identity table
  await knex.schema.createTable('user_identity', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .notNullable()
      .references('id')
      .inTable('user')
      .onDelete('CASCADE');
    table
      .string('provider_slug')
      .notNullable()
      .comment('References oidc_provider.slug');
    table
      .string('subject')
      .notNullable()
      .comment('OIDC sub claim — unique ID from the provider');
    table
      .string('email')
      .nullable()
      .comment('Email from the ID token');
    table
      .string('display_name')
      .nullable()
      .comment('Name from the ID token');
    table
      .string('avatar_url')
      .nullable()
      .comment('Picture from the ID token');
    table
      .text('raw_claims')
      .nullable()
      .comment('JSON-stringified ID token claims');
    table.timestamps(true, true);

    // Each provider+subject pair must be unique (one external identity = one link)
    table.unique(['provider_slug', 'subject']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('user_identity');
  await knex.schema.dropTableIfExists('oidc_provider');

  // Revert password_hash to notNullable
  const isSqlite = knex.client.config.client === 'better-sqlite3';
  if (isSqlite) {
    // For SQLite we'd need another table swap — skip for down migration
    // since all existing users have passwords
  } else {
    await knex.schema.alterTable('user', (table) => {
      table.string('password_hash').notNullable().alter();
    });
  }
};
