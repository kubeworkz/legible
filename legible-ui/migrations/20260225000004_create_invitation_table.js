/**
 * Create the `invitation` table for pending org membership invites.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('invitation', (table) => {
    table.increments('id').primary();
    table.integer('organization_id').notNullable();
    table
      .string('email')
      .notNullable()
      .comment('Email address of the invitee');
    table
      .string('role')
      .notNullable()
      .defaultTo('member')
      .comment('Role upon acceptance: owner | admin | member | viewer');
    table
      .string('token')
      .notNullable()
      .unique()
      .comment('Unique token for the invite link');
    table
      .integer('invited_by')
      .notNullable()
      .comment('User who created the invitation');
    table
      .timestamp('expires_at')
      .notNullable()
      .comment('When the invitation link expires');
    table.timestamp('accepted_at').nullable().comment('When it was accepted');

    table
      .foreign('organization_id')
      .references('id')
      .inTable('organization')
      .onDelete('CASCADE');
    table
      .foreign('invited_by')
      .references('id')
      .inTable('user')
      .onDelete('CASCADE');

    table.index(['organization_id']);
    table.index(['token']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('invitation');
};
