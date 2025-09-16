import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const db = new Database(process.env.DATABASE_URL || './data/lendwizely.db');

// Seed data
const seedData = () => {
  try {
    // Insert sample clients
    const insertClient = db.prepare(`
      INSERT OR IGNORE INTO clients (id, phone, email, first_name, last_name, consent_sms, consent_email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleClients = [
      {
        id: uuidv4(),
        phone: '+1234567890',
        email: 'john.doe@example.com',
        first_name: 'John',
        last_name: 'Doe',
        consent_sms: true,
        consent_email: true
      },
      {
        id: uuidv4(),
        phone: '+1987654321',
        email: 'jane.smith@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        consent_sms: false,
        consent_email: true
      }
    ];

    sampleClients.forEach(client => {
      insertClient.run(
        client.id,
        client.phone,
        client.email,
        client.first_name,
        client.last_name,
        client.consent_sms,
        client.consent_email
      );
    });

    console.log('✅ Sample clients created');

    // Insert sample events
    const insertEvent = db.prepare(`
      INSERT OR IGNORE INTO events (id, type, client_id, data)
      VALUES (?, ?, ?, ?)
    `);

    const sampleEvents = [
      {
        id: uuidv4(),
        type: 'client.created',
        client_id: sampleClients[0].id,
        data: JSON.stringify({ source: 'api' })
      },
      {
        id: uuidv4(),
        type: 'offer.generated',
        client_id: sampleClients[0].id,
        data: JSON.stringify({ amount: 15000, term_days: 90 })
      }
    ];

    sampleEvents.forEach(event => {
      insertEvent.run(event.id, event.type, event.client_id, event.data);
    });

    console.log('✅ Sample events created');
    console.log('🚀 Database seeded successfully');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
};

// Ensure the script runs when executed directly (e.g., `node seed.ts`)
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  seedData();
}

export { seedData };