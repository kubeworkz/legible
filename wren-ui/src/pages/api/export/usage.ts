/**
 * Server-side CSV export for usage dashboard data.
 *
 * GET /api/export/usage?startDate=&endDate=&format=csv
 *
 * Returns a CSV file with summary, by-type, by-key, and daily breakdowns.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { components } from '@/common';

const { apiHistoryRepository, authService, organizationService } = components;

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
    // Auth check
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

    const userOrgs = await organizationService.listUserOrganizations(
      session.id,
    );
    if (userOrgs.length === 0) {
      return res.status(403).json({ error: 'No organization' });
    }
    const organizationId = userOrgs[0].id;

    // Parse query params
    const { startDate, endDate } = req.query;
    const filter: any = { organizationId };
    if (startDate && typeof startDate === 'string') {
      filter.startDate = new Date(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      filter.endDate = new Date(endDate);
    }

    // Fetch all aggregations in parallel
    const [summary, byApiType, byApiKey, dailyUsage] = await Promise.all([
      apiHistoryRepository.getUsageSummary(filter),
      apiHistoryRepository.getUsageByApiType(filter),
      apiHistoryRepository.getUsageByApiKey(filter),
      apiHistoryRepository.getDailyUsage(filter),
    ]);

    // Build multi-section CSV
    const sections: string[] = [];

    // Summary section
    sections.push('=== Usage Summary ===');
    sections.push('Metric,Value');
    sections.push(`Total Requests,${summary.totalRequests}`);
    sections.push(`Successful Requests,${summary.successfulRequests}`);
    sections.push(`Failed Requests,${summary.failedRequests}`);
    sections.push(`Avg Duration (ms),${summary.avgDurationMs}`);
    sections.push(`Tokens Input,${summary.tokensInput}`);
    sections.push(`Tokens Output,${summary.tokensOutput}`);
    sections.push(`Tokens Total,${summary.tokensTotal}`);
    sections.push('');

    // By API Type section
    sections.push('=== Usage by API Type ===');
    sections.push(
      'API Type,Total Requests,Successful,Failed,Avg Duration (ms),Tokens Total',
    );
    for (const row of byApiType) {
      sections.push(
        [
          row.apiType,
          row.totalRequests,
          row.successfulRequests,
          row.failedRequests,
          row.avgDurationMs,
          row.tokensTotal,
        ]
          .map(csvEscape)
          .join(','),
      );
    }
    sections.push('');

    // By API Key section
    sections.push('=== Usage by API Key ===');
    sections.push(
      'Key ID,Key Type,Total Requests,Successful,Failed,Avg Duration (ms),Tokens Total,Last Used',
    );
    for (const row of byApiKey) {
      sections.push(
        [
          row.apiKeyId,
          row.apiKeyType,
          row.totalRequests,
          row.successfulRequests,
          row.failedRequests,
          row.avgDurationMs,
          row.tokensTotal,
          row.lastUsedAt || '',
        ]
          .map(csvEscape)
          .join(','),
      );
    }
    sections.push('');

    // Daily Usage section
    sections.push('=== Daily Usage ===');
    sections.push('Date,Total Requests,Successful,Failed,Tokens Total');
    for (const row of dailyUsage) {
      sections.push(
        [
          row.date,
          row.totalRequests,
          row.successfulRequests,
          row.failedRequests,
          row.tokensTotal,
        ]
          .map(csvEscape)
          .join(','),
      );
    }

    const csv = sections.join('\n');

    const filename = `usage-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.status(200).send(csv);
  } catch (error) {
    console.error('Usage export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
}
