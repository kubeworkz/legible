/**
 * Create the `session_property` table for RLS session property definitions.
 *
 * A session property is a named, typed variable (e.g. user_org_id, role)
 * whose value is provided at query time and used to evaluate RLS policy
 * conditions.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('session_property', (table) => {
    table.increments('id').primary();
    table
      .integer('project_id')
      .notNullable()
      .comment('The project this property belongs to');
    table
      .string('name', 255)
      .notNullable()
      .comment('Property name, e.g. user_org_id. Unique within a project.');
    table
      .string('type', 50)
      .notNullable()
      .defaultTo('string')
      .comment('Data type: string, number, boolean');
    table
      .boolean('required')
      .notNullable()
      .defaultTo(true)
      .comment(
        'If true, users missing this property see errors when querying applied models',
      );
    table
      .string('default_expr')
      .nullable()
      .comment(
        'Default expression used when the property is optional and the user has no value assigned',
      );

    table
      .foreign('project_id')
      .references('id')
      .inTable('project')
      .onDelete('CASCADE');

    table.unique(['project_id', 'name']);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('session_property');
};
