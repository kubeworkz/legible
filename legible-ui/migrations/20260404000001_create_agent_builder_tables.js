/**
 * Migration: Agent Builder — Phase 1 foundation tables
 *
 * Adds:
 * - prompt_template: versioned prompt templates with variable interpolation
 * - prompt_template_version: immutable snapshots of prompt content
 * - tool_definition: registered tools (MCP-discovered + custom API)
 * - workflow: agent workflow graphs (DAG definition)
 * - workflow_version: immutable snapshots of workflow definitions
 */

exports.up = async function (knex) {
  // Prompt templates with versioning
  await knex.schema.createTable('prompt_template', (table) => {
    table.increments('id').primary();
    table.integer('project_id').notNullable();
    table.string('name').notNullable();
    table.text('description').nullable();
    table.text('system_prompt').nullable();
    table.text('user_prompt').nullable();
    table.text('variables').nullable(); // JSON array of { name, type, default, description }
    table.string('model').nullable(); // preferred model override
    table.float('temperature').nullable();
    table.integer('max_tokens').nullable();
    table.text('tags').nullable(); // JSON array of strings
    table.integer('current_version').defaultTo(1);
    table.integer('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['project_id', 'name']);
  });

  // Immutable prompt snapshots
  await knex.schema.createTable('prompt_template_version', (table) => {
    table.increments('id').primary();
    table.integer('prompt_template_id').notNullable()
      .references('id').inTable('prompt_template').onDelete('CASCADE');
    table.integer('version').notNullable();
    table.text('system_prompt').nullable();
    table.text('user_prompt').nullable();
    table.text('variables').nullable(); // JSON
    table.string('model').nullable();
    table.float('temperature').nullable();
    table.integer('max_tokens').nullable();
    table.text('change_note').nullable();
    table.integer('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['prompt_template_id', 'version']);
  });

  // Tool definitions: MCP-discovered + custom REST API tools
  await knex.schema.createTable('tool_definition', (table) => {
    table.increments('id').primary();
    table.integer('project_id').notNullable();
    table.string('name').notNullable();
    table.text('description').nullable();
    table.string('source').notNullable(); // 'mcp', 'custom_api', 'builtin'
    table.string('mcp_server_name').nullable(); // which MCP server provides it
    table.string('method').nullable(); // HTTP method for custom_api
    table.string('endpoint').nullable(); // URL for custom_api
    table.text('input_schema').nullable(); // JSON Schema for parameters
    table.text('output_schema').nullable(); // JSON Schema for return value
    table.text('headers').nullable(); // JSON for custom_api headers
    table.text('auth_config').nullable(); // JSON: { type, token_env, ... }
    table.boolean('enabled').defaultTo(true);
    table.text('tags').nullable(); // JSON array
    table.timestamp('last_synced_at').nullable(); // for MCP-discovered tools
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['project_id', 'name']);
  });

  // Workflow definitions (DAG graph)
  await knex.schema.createTable('workflow', (table) => {
    table.increments('id').primary();
    table.integer('project_id').notNullable();
    table.string('name').notNullable();
    table.text('description').nullable();
    table.text('graph').notNullable(); // JSON: { nodes: [...], edges: [...] }
    table.text('variables').nullable(); // JSON: workflow-level input variables
    table.string('status').defaultTo('draft'); // draft, published, archived
    table.integer('current_version').defaultTo(1);
    table.integer('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['project_id', 'name']);
  });

  // Immutable workflow snapshots
  await knex.schema.createTable('workflow_version', (table) => {
    table.increments('id').primary();
    table.integer('workflow_id').notNullable()
      .references('id').inTable('workflow').onDelete('CASCADE');
    table.integer('version').notNullable();
    table.text('graph').notNullable(); // JSON snapshot
    table.text('variables').nullable(); // JSON snapshot
    table.text('change_note').nullable();
    table.integer('created_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['workflow_id', 'version']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('workflow_version');
  await knex.schema.dropTableIfExists('workflow');
  await knex.schema.dropTableIfExists('tool_definition');
  await knex.schema.dropTableIfExists('prompt_template_version');
  await knex.schema.dropTableIfExists('prompt_template');
};
