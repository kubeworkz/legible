/**
 * Server-side CSV export for API history.
 *
 * GET /api/export/history?startDate=&endDate=&apiType=&format=csv
 *
 * Returns a CSV file download. Only accessible to authenticated admin users.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { components } from '@/common';
import { MemberRole } from '@server/repositories/memberRepository';

const {
  apiHistoryRepository,
  authService,
  memberService,
  organizationService,
} = components;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Auth check — require logged-in user
    const token =
      req.cookies?.auth_token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = await authService.validateSession(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Resolve org
    const userOrgs = await organizationService.listUserOrganizations(
      session.id,
    );
    if (userOrgs.length === 0) {
      return res.status(403).json({ error: 'No organization' });
    }
    const organizationId = userOrgs[0].id;

    // Require org OWNER or ADMIN role to export history data
    try {
      await memberService.requireRole(organizationId, session.id, [
        MemberRole.OWNER,
        MemberRole.ADMIN,
      ]);
    } catch {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Parse query params
    const { startDate, endDate, apiType } = req.query;
    const filter: Record<string, any> = {};
    const dateFilter: Record<string, Date> = {};

    if (apiType && typeof apiType === 'string') {
      filter.apiType = apiType;
    }
    if (startDate && typeof startDate === 'string') {
      dateFilter.startDate = new Date(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      dateFilter.endDate = new Date(endDate);
    }

    // Fetch records (max 50K)
    const records = await apiHistoryRepository.findAllForExport(
      Object.keys(filter).length > 0 ? filter : undefined,
      Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      50000,
    );

    // Build CSV
    const columns = [
      'ID',
      'Timestamp',
      'API Type',
      'Status Code',
      'Duration (ms)',
      'Thread ID',
      'API Key ID',
      'API Key Type',
      'Organization ID',
      'Tokens Input',
      'Tokens Output',
      'Tokens Total',
      'Question / SQL',
    ];

    const header = columns.map(csvEscape).join(',');

    const rows = records.map((r) => {
      // Extract question/SQL from request payload
      let questionOrSql = '';
      if (r.requestPayload) {
        questionOrSql =
          r.requestPayload.question ||
          r.requestPayload.sql ||
          r.requestPayload.query ||
          '';
      }

      return [
        r.id,
        r.createdAt
          ? new Date(r.createdAt).toISOString()
          : '',
        r.apiType,
        r.statusCode,
        r.durationMs,
        r.threadId || '',
        r.apiKeyId || '',
        r.apiKeyType || '',
        r.organizationId || organizationId,
        r.tokensInput || 0,
        r.tokensOutput || 0,
        r.tokensTotal || 0,
        questionOrSql,
      ]
        .map(csvEscape)
        .join(',');
    });

    const csv = [header, ...rows].join('\n');

    // Set response headers for file download
    const filename = `api-history-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
}
