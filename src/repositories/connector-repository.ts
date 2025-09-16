import { v4 as uuidv4 } from 'uuid';
import { database } from '../lib/db/connection';
import { cryptoService } from '../lib/crypto';
import { Connector, CreateConnectorData, UpdateConnectorData } from '../models/connector';
import { AppError } from '../middleware/error';

export class ConnectorRepository {
  async upsertConnector(name: string, config: Record<string, any>): Promise<Connector> {
    try {
      // Encrypt the configuration
      const encryptedConfig = cryptoService.encryptJson(config);

      // Check if connector already exists
      const existing = await database.get<Connector>(
        'SELECT * FROM connectors WHERE name = ?',
        [name.toLowerCase()]
      );

      if (existing) {
        // Update existing connector
        await database.run(
          'UPDATE connectors SET encrypted_config = ? WHERE name = ?',
          [encryptedConfig, name.toLowerCase()]
        );

        const updated = await database.get<Connector>(
          'SELECT * FROM connectors WHERE name = ?',
          [name.toLowerCase()]
        );

        if (!updated) {
          throw new AppError('Failed to update connector', 500, 'CONNECTOR_UPDATE_FAILED');
        }

        return updated;
      } else {
        // Create new connector
        const id = uuidv4();
        const now = new Date().toISOString();

        await database.run(
          `INSERT INTO connectors (id, name, encrypted_config, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?)`,
          [id, name.toLowerCase(), encryptedConfig, now, now]
        );

        const newConnector = await database.get<Connector>(
          'SELECT * FROM connectors WHERE id = ?',
          [id]
        );

        if (!newConnector) {
          throw new AppError('Failed to create connector', 500, 'CONNECTOR_CREATION_FAILED');
        }

        return newConnector;
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Database error during connector upsert',
        500,
        'CONNECTOR_UPSERT_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async getConnector(name: string): Promise<Connector | null> {
    try {
      const connector = await database.get<Connector>(
        'SELECT * FROM connectors WHERE name = ?',
        [name.toLowerCase()]
      );

      return connector || null;
    } catch (error) {
      throw new AppError(
        'Database error during connector lookup',
        500,
        'CONNECTOR_LOOKUP_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async getConnectorConfig(name: string): Promise<Record<string, any> | null> {
    try {
      const connector = await this.getConnector(name);
      if (!connector) {
        return null;
      }

      // Decrypt the configuration
      return cryptoService.decryptJson(connector.encrypted_config);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Failed to decrypt connector configuration',
        500,
        'CONNECTOR_DECRYPT_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async getMaskedConnectorConfig(name: string): Promise<Record<string, any> | null> {
    try {
      const config = await this.getConnectorConfig(name);
      if (!config) {
        return null;
      }

      // Return masked version
      return cryptoService.maskConfig(config);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Failed to get masked connector configuration',
        500,
        'CONNECTOR_MASK_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async listConnectors(): Promise<Connector[]> {
    try {
      return await database.all<Connector>(
        'SELECT * FROM connectors ORDER BY updated_at DESC'
      );
    } catch (error) {
      throw new AppError(
        'Database error during connectors listing',
        500,
        'CONNECTORS_LIST_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async deleteConnector(name: string): Promise<boolean> {
    try {
      const result = await database.run(
        'DELETE FROM connectors WHERE name = ?',
        [name.toLowerCase()]
      );

      return result.changes > 0;
    } catch (error) {
      throw new AppError(
        'Database error during connector deletion',
        500,
        'CONNECTOR_DELETE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async updateConnector(name: string, data: UpdateConnectorData): Promise<Connector | null> {
    try {
      const connector = await database.get<Connector>(
        'SELECT * FROM connectors WHERE name = ?',
        [name.toLowerCase()]
      );

      if (!connector) {
        return null;
      }

      const updates: string[] = [];
      const params: any[] = [];

      if (data.encrypted_config !== undefined) {
        updates.push('encrypted_config = ?');
        params.push(data.encrypted_config);
      }

      if (updates.length === 0) {
        return connector;
      }

      params.push(name.toLowerCase());

      await database.run(
        `UPDATE connectors SET ${updates.join(', ')} WHERE name = ?`,
        params
      );

      return await database.get<Connector>(
        'SELECT * FROM connectors WHERE name = ?',
        [name.toLowerCase()]
      );
    } catch (error) {
      throw new AppError(
        'Database error during connector update',
        500,
        'CONNECTOR_UPDATE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

export const connectorRepository = new ConnectorRepository();