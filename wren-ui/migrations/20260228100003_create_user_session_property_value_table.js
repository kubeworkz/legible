/**
 * Create the `user_session_property_value` table.
 *
 * Associates concrete session property values with users.
 * These values are used at query time to evaluate RLS policy conditions.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_session_property_value', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .notNullable()
      .comment('FK to user');
    table
      .integer('session_property_id')
      .notNullable()
      .comment('FK to session_property');
    table
      .text('value')
      .notNullable()
      .comment('The assigned property value for this user');

    table
      .foreign('user_id')
      .references('id')
      .inTable('user')
      .onDelete('CASCADE');
    table
      .foreign('session_property_id')
      .references('id')
      .inTable('session_property')
      .onDelete('CASCADE');

    table.unique(['user_id', 'session_property_id']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('user_session_property_value');
};
