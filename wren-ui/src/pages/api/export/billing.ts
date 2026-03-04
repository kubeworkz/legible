/**
 * Server-side CSV export for billing data.
 *
 * GET /api/export/billing?months=12
 *
 * Returns a CSV with monthly billing summaries.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { components } from '@/common';

const { billingService, authService, organizationService } = components;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

    // Get billing overview
    const overview = await billingService.getBillingOverview(organizationId);
    const allMonths = [overview.currentMonth, ...overview.history];

    const sections: string[] = [];

    // Config section
    sections.push('=== Billing Configuration ===');
    sections.push('Setting,Value');
    sections.push(
      `Cost per 1K input tokens,${overview.config.costPer1kInputTokens}`,
    );
    sections.push(
      `Cost per 1K output tokens,${overview.config.costPer1kOutputTokens}`,
    );
    sections.push(`Currency,${overview.config.currency}`);
    sections.push(
      `Monthly spend alert,${overview.config.monthlySpendAlert ?? 'Not set'}`,
    );
    sections.push('');

    // Monthly summary section
    sections.push('=== Monthly Billing Summary ===');
    sections.push(
      'Month,Total Requests,Successful,Failed,Tokens Input,Tokens Output,Tokens Total,Estimated Cost',
    );
    for (const m of allMonths) {
      sections.push(
        [
          `${MONTH_NAMES[m.month]} ${m.year}`,
          m.totalRequests,
          m.successfulRequests,
          m.failedRequests,
          m.tokensInput,
          m.tokensOutput,
          m.tokensTotal,
          `${overview.config.currency} ${m.estimatedCost.toFixed(4)}`,
        ]
          .map(csvEscape)
          .join(','),
      );
    }
    sections.push('');

    // Per-key breakdown for current month
    if (overview.currentMonth.perKeyBreakdown.length > 0) {
      sections.push('=== Current Month — Cost by API Key ===');
      sections.push(
        'Key ID,Key Type,Total Requests,Tokens Total,Estimated Cost',
      );
      for (const k of overview.currentMonth.perKeyBreakdown) {
        sections.push(
          [
            k.apiKeyId,
            k.apiKeyType,
            k.totalRequests,
            k.tokensTotal,
            `${overview.config.currency} ${k.estimatedCost.toFixed(4)}`,
          ]
            .map(csvEscape)
            .join(','),
        );
      }
      sections.push('');
    }

    // Per-API-type breakdown for current month
    if (overview.currentMonth.perApiTypeBreakdown.length > 0) {
      sections.push('=== Current Month — Cost by API Type ===');
      sections.push('API Type,Total Requests,Tokens Total,Estimated Cost');
      for (const t of overview.currentMonth.perApiTypeBreakdown) {
        sections.push(
          [
            t.apiType,
            t.totalRequests,
            t.tokensTotal,
            `${overview.config.currency} ${t.estimatedCost.toFixed(4)}`,
          ]
            .map(csvEscape)
            .join(','),
        );
      }
    }

    const csv = sections.join('\n');

    const filename = `billing-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.status(200).send(csv);
  } catch (error) {
    console.error('Billing export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
}
