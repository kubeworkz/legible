/**
 * Add email verification columns to the `user` table.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable('user', (table) => {
      table
        .boolean('email_verified')
        .notNullable()
        .defaultTo(false)
        .comment('Whether the user has verified their email address');
      table
        .string('email_verification_token')
        .nullable()
        .unique()
        .comment('Token sent via email to verify ownership');
      table
        .timestamp('email_verification_expires_at')
        .nullable()
        .comment('When the verification token expires');
    })
    .then(() => {
      // Mark all existing users as verified so they are not locked out
      return knex('user').update({ email_verified: true });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('user', (table) => {
    table.dropColumn('email_verified');
    table.dropColumn('email_verification_token');
    table.dropColumn('email_verification_expires_at');
  });
};
