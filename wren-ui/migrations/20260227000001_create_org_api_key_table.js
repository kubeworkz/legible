/**
 * Create the `org_api_key` table for organization-level API keys.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('org_api_key', (table) => {
    table.increments('id').primary();
    table
      .integer('organization_id')
      .notNullable()
      .comment('The organization this key belongs to');
    table
      .string('name', 255)
      .notNullable()
      .comment('User-defined label for the key');
    table
      .string('key_prefix', 12)
      .notNullable()
      .comment('First chars of the key for display (e.g. osk-****15xQ)');
    table
      .string('key_hash', 255)
      .notNullable()
      .comment('SHA-256 hash of the full key');
    table
      .json('permissions')
      .nullable()
      .comment('JSON array of permission scopes, null = full access');
    table.timestamp('last_used_at').nullable();
    table.timestamp('expires_at').nullable().comment('Null means never expires');
    table
      .integer('created_by')
      .notNullable()
      .comment('User who created the key');
    table.timestamp('revoked_at').nullable().comment('Soft-delete timestamp');

    table
      .foreign('organization_id')
      .references('id')
      .inTable('organization')
      .onDelete('CASCADE');
    table
      .foreign('created_by')
      .references('id')
      .inTable('user')
      .onDelete('CASCADE');

    table.index(['organization_id']);
    table.index(['key_prefix']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('org_api_key');
};
