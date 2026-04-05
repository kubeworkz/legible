/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Workflow execution run — one row per workflow invocation
  await knex.schema.createTable('workflow_execution', (table) => {
    table.increments('id').primary();
    table
      .integer('workflow_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('workflow')
      .onDelete('CASCADE');
    table.integer('project_id').unsigned().notNullable();
    table.integer('workflow_version').unsigned().notNullable();
    table
      .string('status')
      .notNullable()
      .defaultTo('pending'); // pending | running | completed | failed | cancelled
    table.text('input').nullable();   // JSON — workflow input variables
    table.text('output').nullable();  // JSON — final workflow output
    table.text('error').nullable();   // error message if failed
    table.integer('duration_ms').nullable();  // total execution time
    table.integer('created_by').unsigned().nullable();
    table.string('created_at').notNullable();
    table.string('started_at').nullable();
    table.string('completed_at').nullable();
  });

  // Individual step execution — one row per node execution within a run
  await knex.schema.createTable('workflow_execution_step', (table) => {
    table.increments('id').primary();
    table
      .integer('execution_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('workflow_execution')
      .onDelete('CASCADE');
    table.string('node_id').notNullable();  // matches the node id in the graph
    table.string('node_type').notNullable();
    table
      .string('status')
      .notNullable()
      .defaultTo('pending'); // pending | running | completed | failed | skipped
    table.text('input').nullable();   // JSON — node input
    table.text('output').nullable();  // JSON — node output
    table.text('error').nullable();   // error message
    table.integer('duration_ms').nullable();
    table.integer('retry_count').unsigned().defaultTo(0);
    table.string('started_at').nullable();
    table.string('completed_at').nullable();
  });

  // Index for fast lookups
  await knex.schema.raw(
    'CREATE INDEX idx_workflow_execution_workflow_id ON workflow_execution(workflow_id)',
  );
  await knex.schema.raw(
    'CREATE INDEX idx_workflow_execution_status ON workflow_execution(status)',
  );
  await knex.schema.raw(
    'CREATE INDEX idx_workflow_execution_step_execution_id ON workflow_execution_step(execution_id)',
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('workflow_execution_step');
  await knex.schema.dropTableIfExists('workflow_execution');
};
