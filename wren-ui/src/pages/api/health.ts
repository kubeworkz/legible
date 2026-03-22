import type { NextApiRequest, NextApiResponse } from 'next';
import { components } from '@/common';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: 'ok' | 'error'; latencyMs?: number; error?: string };
  };
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<HealthStatus>,
) {
  const start = Date.now();
  let dbStatus: HealthStatus['checks']['database'] = { status: 'ok' };

  try {
    const dbStart = Date.now();
    await components.knex.raw('SELECT 1');
    dbStatus = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err: any) {
    dbStatus = { status: 'error', error: err.message };
  }

  const overall = dbStatus.status === 'ok' ? 'healthy' : 'unhealthy';

  const body: HealthStatus = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: { database: dbStatus },
  };

  res.status(overall === 'healthy' ? 200 : 503).json(body);
}
