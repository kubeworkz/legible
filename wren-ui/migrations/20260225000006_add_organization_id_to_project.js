/**
 * Add `organization_id` to the `project` table, linking projects to orgs.
 *
 * Backfill strategy:
 *   1. Create a default "Default Organization" if any projects exist
 *   2. Set `organization_id` on all existing projects to that org
 *   3. Make the column NOT NULL after backfill
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const isPostgres = knex.client.config.client === 'pg';

  // Step 1: Add nullable column first (for backfill)
  await knex.schema.alterTable('project', (table) => {
    table
      .integer('organization_id')
      .nullable()
      .comment('Reference to organization.id');
  });

  // Step 2: Backfill — create default org if projects exist
  const projects = await knex('project').select('id');
  if (projects.length > 0) {
    const [defaultOrg] = await knex('organization')
      .insert({
        display_name: 'Default Organization',
        slug: 'default',
      })
      .returning('id');

    // knex.returning() returns objects on PG, numbers on SQLite
    const orgId = typeof defaultOrg === 'object' ? defaultOrg.id : defaultOrg;

    await knex('project').update({ organization_id: orgId });
  }

  // Step 3: Make NOT NULL + add FK
  if (isPostgres) {
    // PostgreSQL supports ALTER COLUMN SET NOT NULL
    await knex.schema.alterTable('project', (table) => {
      table.integer('organization_id').notNullable().alter();
      table
        .foreign('organization_id')
        .references('id')
        .inTable('organization')
        .onDelete('CASCADE');
    });
  } else {
    // SQLite doesn't support ALTER COLUMN — the column stays nullable.
    // App-level validation will enforce NOT NULL for new projects.
    // FK constraints are handled at the application layer for SQLite.
  }

  // Step 4: Add index for org-scoped queries
  await knex.schema.alterTable('project', (table) => {
    table.index(['organization_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const isPostgres = knex.client.config.client === 'pg';

  if (isPostgres) {
    await knex.schema.alterTable('project', (table) => {
      table.dropForeign('organization_id');
    });
  }

  await knex.schema.alterTable('project', (table) => {
    table.dropIndex(['organization_id']);
    table.dropColumn('organization_id');
  });

  // Remove the backfilled default org (only if it has no remaining projects)
  await knex('organization').where('slug', 'default').del();
};
