import { v4 as uuidv4 } from 'uuid';
import { database } from '../lib/db/connection';
import { Event, CreateEventData } from '../models/event';
import { AppError } from '../middleware/error';

export class EventRepository {
  async recordEvent(data: CreateEventData): Promise<Event> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      const dataJson = JSON.stringify(data.data);

      await database.run(
        `INSERT INTO events (id, type, client_id, data, created_at) 
         VALUES (?, ?, ?, ?, ?)`,
        [id, data.type, data.client_id, dataJson, now]
      );

      const event = await database.get<Event>(
        'SELECT * FROM events WHERE id = ?',
        [id]
      );

      if (!event) {
        throw new AppError('Failed to create event', 500, 'EVENT_CREATION_FAILED');
      }

      return event;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Database error during event creation',
        500,
        'EVENT_CREATION_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async findEvents(options: {
    clientId?: string;
    type?: string;
    since?: string;
    limit?: number;
  } = {}): Promise<Event[]> {
    try {
      let sql = 'SELECT * FROM events WHERE 1=1';
      const params: any[] = [];

      if (options.clientId) {
        sql += ' AND client_id = ?';
        params.push(options.clientId);
      }

      if (options.type) {
        sql += ' AND type = ?';
        params.push(options.type);
      }

      if (options.since) {
        sql += ' AND created_at > ?';
        params.push(options.since);
      }

      sql += ' ORDER BY created_at DESC';

      if (options.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
      }

      return await database.all<Event>(sql, params);
    } catch (error) {
      throw new AppError(
        'Database error during events lookup',
        500,
        'EVENTS_LOOKUP_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async findEventsByClientId(clientId: string, limit = 50): Promise<Event[]> {
    return this.findEvents({ clientId, limit });
  }

  async findEventsByType(type: string, limit = 50): Promise<Event[]> {
    return this.findEvents({ type, limit });
  }

  async findRecentEvents(since?: string, limit = 100): Promise<Event[]> {
    return this.findEvents({ since, limit });
  }
}

export const eventRepository = new EventRepository();