/**
 * Migration: Create agent_chat_session and agent_chat_message tables.
 * These support the Agent Chat/Testing UI where users converse with
 * agent definitions in real time, seeing reasoning steps and tool calls.
 */
exports.up = async function (knex) {
  await knex.schema.createTable('agent_chat_session', (table) => {
    table.increments('id').primary();
    table
      .integer('project_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('project')
      .onDelete('CASCADE');
    table
      .integer('agent_definition_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('agent_definition')
      .onDelete('CASCADE');
    table.string('title').nullable();
    table.string('status').notNullable().defaultTo('active'); // active | archived
    table.integer('created_by').unsigned().nullable();
    table.string('created_at').notNullable().defaultTo(knex.fn.now());
    table.string('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('agent_chat_message', (table) => {
    table.increments('id').primary();
    table
      .integer('session_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('agent_chat_session')
      .onDelete('CASCADE');
    // role: user | assistant | system | tool
    table.string('role').notNullable();
    table.text('content').nullable();
    // For tool calls/results
    table.string('tool_call_id').nullable();
    table.string('tool_name').nullable();
    table.text('tool_input').nullable();  // JSON stringified
    table.text('tool_output').nullable(); // JSON stringified
    // Reasoning / chain-of-thought steps (JSON array)
    table.text('reasoning_steps').nullable();
    // LLM usage metadata
    table.text('metadata').nullable(); // JSON: { model, usage, finishReason, durationMs }
    table.string('status').notNullable().defaultTo('completed'); // pending | streaming | completed | error
    table.text('error').nullable();
    table.string('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('agent_chat_message');
  await knex.schema.dropTableIfExists('agent_chat_session');
};
