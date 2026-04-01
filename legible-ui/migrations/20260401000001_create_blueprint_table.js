/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .createTable('blueprint', (table) => {
      table.increments('id').primary();
      table.integer('project_id').notNullable();
      table.string('name').notNullable();
      table.string('version').notNullable().defaultTo('0.1.0');
      table.text('description');
      // Full blueprint YAML stored as text
      table.text('blueprint_yaml').notNullable();
      // Denormalized fields for quick display
      table.string('sandbox_image');
      table.string('default_agent_type');
      table.text('inference_profiles'); // JSON string
      table.text('policy_yaml'); // network policy content
      table.boolean('is_builtin').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();
      table.unique(['project_id', 'name']);
    })
    .then(() => {
      return knex.schema.table('agent', (table) => {
        table.integer('blueprint_id').references('id').inTable('blueprint');
        table.string('inference_profile');
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .table('agent', (table) => {
      table.dropColumn('blueprint_id');
      table.dropColumn('inference_profile');
    })
    .then(() => {
      return knex.schema.dropTableIfExists('blueprint');
    });
};
