import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getConfig } from '@server/config';
import { components } from '@/common';
import { getLogger } from '@server/utils';
import { withApiKeyAuth, requireProjectAccess } from '@/apollo/server/utils/apiKeyAuth';

const logger = getLogger('API_RELATIONSHIP_RECOMMENDATIONS');
logger.level = 'debug';

const serverConfig = getConfig();
const { projectService, deployService } = components;

/**
 * POST /api/v1/relationship-recommendations
 *   Body: (none required)
 *   Returns: { id: string }
 *
 * GET /api/v1/relationship-recommendations?id=<uuid>
 *   Returns: { id, status, response, error }
 */
export default withApiKeyAuth(handler);

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (!(await requireProjectAccess(req, res))) return;

  const aiEndpoint = serverConfig.wrenAIEndpoint;

  if (req.method === 'POST') {
    try {
      // Get the current project and its MDL
      const project = await projectService.getCurrentProject();
      const lastDeploy = await deployService.getLastDeployment(project.id);

      if (!lastDeploy?.manifest) {
        return res
          .status(400)
          .json({ error: 'No deployment found. Please deploy first.' });
      }

      const mdlString = JSON.stringify(lastDeploy.manifest);

      // Call AI service
      const response = await axios.post(
        `${aiEndpoint}/v1/relationship-recommendations`,
        { mdl: mdlString },
      );

      return res.status(200).json({ id: response.data.id });
    } catch (error: any) {
      logger.error(
        `Failed to start relationship recommendation: ${error.message}`,
      );
      return res.status(500).json({
        error:
          error.response?.data?.detail ||
          error.message ||
          'Failed to generate relationship recommendations',
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res
          .status(400)
          .json({ error: 'id query parameter is required' });
      }

      const response = await axios.get(
        `${aiEndpoint}/v1/relationship-recommendations/${id}`,
      );

      return res.status(200).json(response.data);
    } catch (error: any) {
      logger.error(
        `Failed to get relationship recommendation result: ${error.message}`,
      );
      return res.status(500).json({
        error:
          error.response?.data?.detail ||
          error.message ||
          'Failed to get result',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
