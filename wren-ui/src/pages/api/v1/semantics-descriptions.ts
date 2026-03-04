import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getConfig } from '@server/config';
import { components } from '@/common';
import { getLogger } from '@server/utils';

const logger = getLogger('API_SEMANTICS_DESCRIPTIONS');
logger.level = 'debug';

const serverConfig = getConfig();
const { projectService, deployService } = components;

/**
 * POST /api/v1/semantics-descriptions
 *   Body: { selectedModels: string[], userPrompt: string }
 *   Returns: { id: string }
 *
 * GET /api/v1/semantics-descriptions?id=<uuid>
 *   Returns: { id, status, response, error }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const aiEndpoint = serverConfig.wrenAIEndpoint;

  if (req.method === 'POST') {
    try {
      const { selectedModels, userPrompt } = req.body;

      if (!selectedModels?.length || !userPrompt) {
        return res
          .status(400)
          .json({ error: 'selectedModels and userPrompt are required' });
      }

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
        `${aiEndpoint}/v1/semantics-descriptions`,
        {
          selected_models: selectedModels,
          user_prompt: userPrompt,
          mdl: mdlString,
        },
      );

      return res.status(200).json({ id: response.data.id });
    } catch (error: any) {
      logger.error(
        `Failed to start semantics description generation: ${error.message}`,
      );
      return res.status(500).json({
        error:
          error.response?.data?.detail ||
          error.message ||
          'Failed to generate semantics',
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'id query parameter is required' });
      }

      const response = await axios.get(
        `${aiEndpoint}/v1/semantics-descriptions/${id}`,
      );

      return res.status(200).json(response.data);
    } catch (error: any) {
      logger.error(
        `Failed to get semantics description result: ${error.message}`,
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
