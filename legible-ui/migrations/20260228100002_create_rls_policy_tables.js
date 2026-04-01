/**
 * Create the `rls_policy`, `rls_policy_model`, and `rls_policy_session_property`
 * tables for Row-Level Security.
 *
 * - rls_policy:                    The policy itself (name + SQL condition).
 * - rls_policy_model:              Many-to-many join between policies and models.
 * - rls_policy_session_property:   Many-to-many join between policies and session properties.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable('rls_policy', (table) => {
    table.increments('id').primary();
    table
      .integer('project_id')
      .notNullable()
      .comment('The project this policy belongs to');
    table
      .string('name', 255)
      .notNullable()
      .comment('Human-readable policy name');
    table
      .text('condition')
      .notNullable()
      .comment(
        'SQL predicate using @property references, e.g. org_id = @user_org_id',
      );

    table
      .foreign('project_id')
      .references('id')
      .inTable('project')
      .onDelete('CASCADE');

    table.timestamps(true, true);
  });

  await knex.schema.createTable('rls_policy_model', (table) => {
    table.increments('id').primary();
    table
      .integer('rls_policy_id')
      .notNullable()
      .comment('FK to rls_policy');
    table
      .integer('model_id')
      .notNullable()
      .comment('FK to model');

    table
      .foreign('rls_policy_id')
      .references('id')
      .inTable('rls_policy')
      .onDelete('CASCADE');
    table
      .foreign('model_id')
      .references('id')
      .inTable('model')
      .onDelete('CASCADE');

    table.unique(['rls_policy_id', 'model_id']);
  });

  await knex.schema.createTable('rls_policy_session_property', (table) => {
    table.increments('id').primary();
    table
      .integer('rls_policy_id')
      .notNullable()
      .comment('FK to rls_policy');
    table
      .integer('session_property_id')
      .notNullable()
      .comment('FK to session_property');

    table
      .foreign('rls_policy_id')
      .references('id')
      .inTable('rls_policy')
      .onDelete('CASCADE');
    table
      .foreign('session_property_id')
      .references('id')
      .inTable('session_property')
      .onDelete('CASCADE');

    table.unique(['rls_policy_id', 'session_property_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTable('rls_policy_session_property');
  await knex.schema.dropTable('rls_policy_model');
  await knex.schema.dropTable('rls_policy');
};
