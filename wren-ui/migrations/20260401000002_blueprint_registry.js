/**
 * Migration: Blueprint registry and auto-provisioning support
 *
 * Adds:
 * - blueprint_registry table for template catalog with connector types, categories, tags
 * - supported_connectors column to blueprint table
 * - auto_provisioned flag to agent table
 * - auto_provision_config table for project-level auto-provision settings
 */

exports.up = async function (knex) {
  // Add supported_connectors to blueprint table
  await knex.schema.alterTable('blueprint', (table) => {
    table.text('supported_connectors').nullable(); // JSON array of connector types
    table.string('category').nullable(); // e.g., "database", "warehouse", "analytics"
    table.text('tags').nullable(); // JSON array of tags
    table.string('source').defaultTo('custom'); // 'builtin', 'registry', 'custom'
  });

  // Add auto_provisioned flag to agent table
  await knex.schema.alterTable('agent', (table) => {
    table.boolean('auto_provisioned').defaultTo(false);
  });

  // Blueprint registry: catalog of available templates
  await knex.schema.createTable('blueprint_registry', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('version').notNullable();
    table.text('description').nullable();
    table.text('supported_connectors').notNullable(); // JSON array
    table.string('category').notNullable(); // database, warehouse, analytics, general
    table.text('tags').nullable(); // JSON array
    table.string('sandbox_image').nullable();
    table.string('default_agent_type').defaultTo('claude');
    table.text('blueprint_yaml').notNullable();
    table.text('policy_yaml').nullable();
    table.text('inference_profiles').nullable(); // JSON
    table.boolean('is_official').defaultTo(false);
    table.integer('install_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Auto-provision config: per-project settings for automatic agent creation
  await knex.schema.createTable('auto_provision_config', (table) => {
    table.increments('id').primary();
    table.integer('project_id').notNullable();
    table.boolean('enabled').defaultTo(false);
    table.string('connector_type').notNullable();
    table.integer('blueprint_id').nullable().references('id').inTable('blueprint').onDelete('SET NULL');
    table.string('blueprint_registry_name').nullable(); // fallback to registry name
    table.string('inference_profile').nullable();
    table.string('agent_name_template').defaultTo('{{connector}}-agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['project_id', 'connector_type']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('auto_provision_config');
  await knex.schema.dropTableIfExists('blueprint_registry');

  await knex.schema.alterTable('agent', (table) => {
    table.dropColumn('auto_provisioned');
  });

  await knex.schema.alterTable('blueprint', (table) => {
    table.dropColumn('supported_connectors');
    table.dropColumn('category');
    table.dropColumn('tags');
    table.dropColumn('source');
  });
};
