/**
 * Resource ownership validation utilities.
 *
 * Phase 3 of RBAC: ensures that when a resolver receives a resource ID,
 * the resource actually belongs to the current project (ctx.projectId).
 * Prevents cross-project resource manipulation attacks.
 *
 * Pattern: fetch the resource, verify its projectId matches ctx.projectId,
 * and return the fetched resource for reuse (avoiding double-fetch).
 */

import { IContext } from '@server/types';

class ResourceNotFoundError extends Error {
  constructor(resourceType: string, id: number | string) {
    super(`${resourceType} not found: ${id}`);
    this.name = 'ResourceNotFoundError';
  }
}

class ResourceOwnershipError extends Error {
  constructor(resourceType: string, id: number | string) {
    super(`Access denied: ${resourceType} ${id} does not belong to this project`);
    this.name = 'ResourceOwnershipError';
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function assertProjectId(ctx: IContext): number {
  if (!ctx.projectId) {
    throw new Error('Project context required');
  }
  return ctx.projectId;
}

function assertOwnership(
  resourceType: string,
  id: number | string,
  resourceProjectId: number,
  expectedProjectId: number,
): void {
  if (resourceProjectId !== expectedProjectId) {
    throw new ResourceOwnershipError(resourceType, id);
  }
}

// ── Direct projectId resources ───────────────────────────────────

/** Verify a dashboard belongs to ctx.projectId. Returns the dashboard. */
export async function ensureDashboardOwnership(
  ctx: IContext,
  dashboardId: number,
) {
  const projectId = assertProjectId(ctx);
  const dashboard = await ctx.dashboardRepository.findOneBy({
    id: dashboardId,
  });
  if (!dashboard) {
    throw new ResourceNotFoundError('Dashboard', dashboardId);
  }
  assertOwnership('Dashboard', dashboardId, dashboard.projectId, projectId);
  return dashboard;
}

/** Verify a thread belongs to ctx.projectId. Returns the thread. */
export async function ensureThreadOwnership(
  ctx: IContext,
  threadId: number,
) {
  const projectId = assertProjectId(ctx);
  const thread = await ctx.threadRepository.findOneBy({ id: threadId });
  if (!thread) {
    throw new ResourceNotFoundError('Thread', threadId);
  }
  assertOwnership('Thread', threadId, thread.projectId, projectId);
  return thread;
}

/** Verify a model belongs to ctx.projectId. Returns the model. */
export async function ensureModelOwnership(
  ctx: IContext,
  modelId: number,
) {
  const projectId = assertProjectId(ctx);
  const model = await ctx.modelRepository.findOneBy({ id: modelId });
  if (!model) {
    throw new ResourceNotFoundError('Model', modelId);
  }
  assertOwnership('Model', modelId, model.projectId, projectId);
  return model;
}

/** Verify a view belongs to ctx.projectId. Returns the view. */
export async function ensureViewOwnership(
  ctx: IContext,
  viewId: number,
) {
  const projectId = assertProjectId(ctx);
  const view = await ctx.viewRepository.findOneBy({ id: viewId });
  if (!view) {
    throw new ResourceNotFoundError('View', viewId);
  }
  assertOwnership('View', viewId, view.projectId, projectId);
  return view;
}

/** Verify a relation belongs to ctx.projectId. Returns the relation. */
export async function ensureRelationOwnership(
  ctx: IContext,
  relationId: number,
) {
  const projectId = assertProjectId(ctx);
  const relation = await ctx.relationRepository.findOneBy({
    id: relationId,
  });
  if (!relation) {
    throw new ResourceNotFoundError('Relation', relationId);
  }
  assertOwnership('Relation', relationId, relation.projectId, projectId);
  return relation;
}

/** Verify a folder belongs to ctx.projectId. Returns the folder. */
export async function ensureFolderOwnership(
  ctx: IContext,
  folderId: number,
) {
  const projectId = assertProjectId(ctx);
  const folder = await ctx.folderRepository.findOneBy({
    id: folderId,
  });
  if (!folder) {
    throw new ResourceNotFoundError('Folder', folderId);
  }
  assertOwnership('Folder', folderId, folder.projectId, projectId);
  return folder;
}

/** Verify a spreadsheet belongs to ctx.projectId. Returns the spreadsheet. */
export async function ensureSpreadsheetOwnership(
  ctx: IContext,
  spreadsheetId: number,
) {
  const projectId = assertProjectId(ctx);
  const spreadsheet = await ctx.spreadsheetRepository.findOneBy({
    id: spreadsheetId,
  });
  if (!spreadsheet) {
    throw new ResourceNotFoundError('Spreadsheet', spreadsheetId);
  }
  assertOwnership(
    'Spreadsheet',
    spreadsheetId,
    spreadsheet.projectId,
    projectId,
  );
  return spreadsheet;
}

// ── Child resources (traverse parent) ────────────────────────────

/** Verify a dashboard item belongs to ctx.projectId via its parent dashboard. */
export async function ensureDashboardItemOwnership(
  ctx: IContext,
  itemId: number,
) {
  const item = await ctx.dashboardItemRepository.findOneBy({
    id: itemId,
  });
  if (!item) {
    throw new ResourceNotFoundError('DashboardItem', itemId);
  }
  // Traverse to parent dashboard
  await ensureDashboardOwnership(ctx, item.dashboardId);
  return item;
}

/** Verify a thread response belongs to ctx.projectId via its parent thread. */
export async function ensureThreadResponseOwnership(
  ctx: IContext,
  responseId: number,
) {
  const response = await ctx.askingService.getResponse(responseId);
  if (!response) {
    throw new ResourceNotFoundError('ThreadResponse', responseId);
  }
  // Traverse to parent thread
  await ensureThreadOwnership(ctx, response.threadId);
  return response;
}

/** Verify a model column belongs to ctx.projectId via its parent model. */
export async function ensureModelColumnOwnership(
  ctx: IContext,
  columnId: number,
) {
  const column = await ctx.modelColumnRepository.findOneBy({
    id: columnId,
  });
  if (!column) {
    throw new ResourceNotFoundError('ModelColumn', columnId);
  }
  // Traverse to parent model
  await ensureModelOwnership(ctx, column.modelId);
  return column;
}

export {
  ResourceNotFoundError,
  ResourceOwnershipError,
};
