/**
 * Backfill: Grant all existing organisation members access to every project
 * in their organisation.
 *
 *   - Org OWNER  → project OWNER
 *   - Org ADMIN  → project OWNER   (mirrors runtime bypass logic)
 *   - Org MEMBER → project CONTRIBUTOR
 *   - Org VIEWER → project VIEWER
 *
 * Skips rows that already exist (e.g. created by the auto-assign logic added
 * in the same release).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Gather all organisation members and all projects that belong to an org
  const members = await knex('member').select('*');
  const projects = await knex('project')
    .whereNotNull('organization_id')
    .select('id', 'organization_id');

  if (members.length === 0 || projects.length === 0) return;

  // Build a map: orgId → [project rows]
  const orgProjects = {};
  for (const p of projects) {
    const orgId = p.organization_id;
    if (!orgProjects[orgId]) orgProjects[orgId] = [];
    orgProjects[orgId].push(p);
  }

  const roleMap = {
    owner: 'owner',
    admin: 'owner',
    member: 'contributor',
    viewer: 'viewer',
  };

  const rows = [];
  for (const m of members) {
    const projs = orgProjects[m.organization_id];
    if (!projs) continue;
    const projectRole = roleMap[m.role] || 'viewer';
    for (const p of projs) {
      rows.push({
        project_id: p.id,
        user_id: m.user_id,
        role: projectRole,
        granted_by: null,
      });
    }
  }

  if (rows.length === 0) return;

  // Insert, skipping duplicates (unique constraint on project_id + user_id)
  // SQLite and PostgreSQL both support INSERT OR IGNORE / ON CONFLICT DO NOTHING
  const dbClient = knex.client.config.client;
  if (dbClient === 'better-sqlite3' || dbClient === 'sqlite3') {
    // SQLite: use INSERT OR IGNORE
    for (const row of rows) {
      await knex.raw(
        `INSERT OR IGNORE INTO project_member (project_id, user_id, role, granted_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [row.project_id, row.user_id, row.role, row.granted_by],
      );
    }
  } else {
    // PostgreSQL: use ON CONFLICT DO NOTHING
    for (const row of rows) {
      await knex.raw(
        `INSERT INTO project_member (project_id, user_id, role, granted_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, NOW(), NOW())
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [row.project_id, row.user_id, row.role, row.granted_by],
      );
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Remove all backfilled rows (those with granted_by = NULL).
  // Rows created later by the app will have a granted_by value.
  await knex('project_member').whereNull('granted_by').del();
};
