import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig } from '@/apollo/server/config';
import { components } from '@/common';

const { authService } = components;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = getConfig();

  // Check if the caller is authenticated
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = token ? await authService.validateSession(token) : null;

  // For unauthenticated requests, return only public telemetry flag
  if (!user) {
    return res.status(200).json({
      isTelemetryEnabled: config.telemetryEnabled || false,
      telemetryHost: config.posthogHost || '',
    });
  }

  // Authenticated — include full config
  const encodedTelemetryKey = config.posthogApiKey
    ? Buffer.from(config.posthogApiKey).toString('base64')
    : '';

  res.status(200).json({
    isTelemetryEnabled: config.telemetryEnabled || false,
    telemetryKey: encodedTelemetryKey,
    telemetryHost: config.posthogHost || '',
    userUUID: config.userUUID || '',
  });
}
