import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/error';
import { ApiResponse } from '../types/global';

const router = Router();

// Connector configuration schema
const ConnectorConfigSchema = z.object({
  name: z.enum(['plaid', 'cherry', 'docusign', 'dropboxsign', 'clear']),
  config: z.record(z.unknown()),
});

// In-memory storage for demo (use secure secrets manager in production)
const connectorConfigs = new Map<string, Record<string, unknown>>();

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validationResult = ConnectorConfigSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid connector configuration',
        400,
        'INVALID_CONNECTOR_CONFIG',
        validationResult.error.errors
      );
    }

    const { name, config } = validationResult.data;

    // Store configuration (in production, use secure secrets manager)
    connectorConfigs.set(name, config);

    // Log configuration received (without sensitive values)
    const sanitizedConfig = Object.keys(config).reduce((acc, key) => {
      const value = config[key];
      if (typeof value === 'string' && value.length > 0) {
        // Mask sensitive values
        if (key.toLowerCase().includes('secret') || 
            key.toLowerCase().includes('key') || 
            key.toLowerCase().includes('token')) {
          acc[key] = '[MASKED]';
        } else {
          acc[key] = value;
        }
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    console.log(`Connector configuration received for ${name}:`, sanitizedConfig);

    const response: ApiResponse<{ name: string; status: string }> = {
      success: true,
      data: {
        name,
        status: 'configured',
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:name', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.params;

    if (!['plaid', 'cherry', 'docusign', 'dropboxsign', 'clear'].includes(name)) {
      throw new AppError(
        'Invalid connector name',
        400,
        'INVALID_CONNECTOR_NAME'
      );
    }

    const config = connectorConfigs.get(name);

    if (!config) {
      throw new AppError(
        'Connector not configured',
        404,
        'CONNECTOR_NOT_FOUND'
      );
    }

    // Return sanitized configuration (mask sensitive values)
    const sanitizedConfig = Object.keys(config).reduce((acc, key) => {
      const value = config[key];
      if (typeof value === 'string' && value.length > 0) {
        if (key.toLowerCase().includes('secret') || 
            key.toLowerCase().includes('key') || 
            key.toLowerCase().includes('token')) {
          acc[key] = '[CONFIGURED]';
        } else {
          acc[key] = value;
        }
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    const response: ApiResponse<{ name: string; config: typeof sanitizedConfig }> = {
      success: true,
      data: {
        name,
        config: sanitizedConfig,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;