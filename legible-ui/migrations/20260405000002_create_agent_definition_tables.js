/**
 * Migration: Create agent_definition table for the Agent Builder.
 * An AgentDefinition bundles a workflow + system prompt + tool set + memory config
 * into a deployable agent unit.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('agent_definition', (table) => {
    table.increments('id').primary();
    table
      .integer('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('project')
      .onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('description').nullable();

    // Core bindings
    table
      .integer('workflow_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('workflow')
      .onDelete('SET NULL');
    table.text('system_prompt').nullable();
    table.text('tool_ids').nullable(); // JSON array of tool_definition IDs
    table.text('memory_config').nullable(); // JSON: { type, maxMessages, ttlSeconds, ... }

    // LLM settings (can override project BYOK defaults)
    table.string('model').nullable();
    table.float('temperature').nullable();
    table.integer('max_tokens').nullable();

    // Deployment
    table
      .string('status')
      .notNullable()
      .defaultTo('draft'); // draft | published | deployed | archived
    table.integer('current_version').notNullable().defaultTo(1);
    table.text('deploy_config').nullable(); // JSON: { endpoint, webhookUrl, schedule, ... }
    table.string('deployed_at').nullable();

    // Metadata
    table.text('tags').nullable(); // JSON string array
    table.text('icon').nullable();
    table.integer('created_by').unsigned().nullable();
    table.string('created_at').notNullable().defaultTo(knex.fn.now());
    table.string('updated_at').notNullable().defaultTo(knex.fn.now());

    // Unique name per project
    table.unique(['project_id', 'name']);
  });

  // Version history for agent definitions
  await knex.schema.createTable('agent_definition_version', (table) => {
    table.increments('id').primary();
    table
      .integer('agent_definition_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('agent_definition')
      .onDelete('CASCADE');
    table.integer('version').notNullable();
    table
      .integer('workflow_id')
      .unsigned()
      .nullable();
    table.text('system_prompt').nullable();
    table.text('tool_ids').nullable();
    table.text('memory_config').nullable();
    table.string('model').nullable();
    table.float('temperature').nullable();
    table.integer('max_tokens').nullable();
    table.text('deploy_config').nullable();
    table.string('change_note').nullable();
    table.integer('created_by').unsigned().nullable();
    table.string('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['agent_definition_id', 'version']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('agent_definition_version');
  await knex.schema.dropTableIfExists('agent_definition');
};
