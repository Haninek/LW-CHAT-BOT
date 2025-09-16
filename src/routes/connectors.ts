import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { connectorRepository } from '../repositories/connector-repository';
import { cryptoService } from '../lib/crypto';
import { AppError } from '../middleware/error';
import { ApiResponse } from '../types/global';

const router = Router();

// Connector configuration schemas
const ConnectorUpsertRequestSchema = z.object({
  name: z.string().min(1, 'Connector name is required'),
  config: z.record(z.unknown()).refine(
    (config) => Object.keys(config).length > 0,
    { message: 'Config cannot be empty' }
  ),
});

const ConnectorInfoSchema = z.object({
  name: z.string(),
  updated_at: z.string().optional(),
});

const ConnectorRevealResponseSchema = z.object({
  name: z.string(),
  config: z.record(z.unknown()),
  updated_at: z.string().optional(),
});

type ConnectorUpsertRequest = z.infer<typeof ConnectorUpsertRequestSchema>;
type ConnectorInfo = z.infer<typeof ConnectorInfoSchema>;
type ConnectorRevealResponse = z.infer<typeof ConnectorRevealResponseSchema>;

router.post('/connectors', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validationResult = ConnectorUpsertRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid connector configuration',
        400,
        'INVALID_CONNECTOR_CONFIG',
        validationResult.error.errors
      );
    }

    const { name, config } = validationResult.data;

    // Store encrypted configuration
    const connector = await connectorRepository.upsertConnector(name, config as Record<string, any>);

    // Log configuration received (with masked sensitive values)
    const maskedConfig = cryptoService.maskConfig(config as Record<string, any>);
    console.log(`Connector configuration saved for ${name}:`, maskedConfig);

    const response: ApiResponse<ConnectorInfo> = {
      success: true,
      data: {
        name: connector.name,
        updated_at: connector.updated_at,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/connectors', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const connectors = await connectorRepository.listConnectors();

    const connectorInfos: ConnectorInfo[] = connectors.map(connector => ({
      name: connector.name,
      updated_at: connector.updated_at,
    }));

    const response: ApiResponse<ConnectorInfo[]> = {
      success: true,
      data: connectorInfos,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/connectors/:name', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.params;
    const reveal = req.query.reveal === 'true';

    if (!name) {
      throw new AppError(
        'Connector name is required',
        400,
        'CONNECTOR_NAME_REQUIRED'
      );
    }

    const connector = await connectorRepository.getConnector(name);

    if (!connector) {
      throw new AppError(
        'Connector not found',
        404,
        'CONNECTOR_NOT_FOUND'
      );
    }

    let config: Record<string, any>;

    if (reveal) {
      // DEV ONLY: Reveal actual configuration
      config = await connectorRepository.getConnectorConfig(name) || {};
      console.warn(`⚠️  Connector secrets revealed for ${name} (DEV ONLY)`);
    } else {
      // Default: Return masked configuration
      config = await connectorRepository.getMaskedConnectorConfig(name) || {};
    }

    const response: ApiResponse<ConnectorRevealResponse> = {
      success: true,
      data: {
        name: connector.name,
        config,
        updated_at: connector.updated_at,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.delete('/connectors/:name', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = req.params;

    if (!name) {
      throw new AppError(
        'Connector name is required',
        400,
        'CONNECTOR_NAME_REQUIRED'
      );
    }

    const deleted = await connectorRepository.deleteConnector(name);

    if (!deleted) {
      throw new AppError(
        'Connector not found',
        404,
        'CONNECTOR_NOT_FOUND'
      );
    }

    const response: ApiResponse<{ ok: boolean }> = {
      success: true,
      data: { ok: true },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;