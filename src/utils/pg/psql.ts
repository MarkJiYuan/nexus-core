import { Client } from 'pg';

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '123456',
  port: 5432,
};

class PostgreSQLManager {
  client: Client;

  constructor() {
    this.client = new Client(dbConfig);
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async query(queryText: string, params?: any[]): Promise<any> {
    await this.connect();
    try {
      const res = await this.client.query(queryText, params);
      return res.rows;
    } catch (err) {
      console.error('Error executing query', err);
      throw err;
    } finally {
      await this.disconnect();
    }
  }

  async insert(tableName: string, data: string): Promise<void> {
    const allData = data.split(';').map(group => group.split(',').map(Number));
    const columns = ['timestamp', 'close', 'open', 'high', 'low', 'amount', 'volume'].join(', ');
    const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7'].join(', ');

    for (const groupData of allData) {
      const queryText = `
        INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})
        ON CONFLICT (timestamp) DO NOTHING
      `;
      console.log('With values:', groupData);
      await this.query(queryText, groupData);
    }
  }

  async createKlineTable(tableName: string): Promise<void> {
    const queryText = `
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        timestamp TEXT PRIMARY KEY,
        close NUMERIC NOT NULL,
        open NUMERIC NOT NULL,
        high NUMERIC NOT NULL,
        low NUMERIC NOT NULL,
        amount NUMERIC NOT NULL,
        volume NUMERIC NOT NULL
      )
    `;
    await this.query(queryText);
  }

  async ensureTableAndInsert(tableName: string, data: string): Promise<void> {
    try {
      await this.createKlineTable(tableName);
      await this.insert(tableName, data);
    } catch (error) {
      console.error(`Error in ensureTableAndInsert for table ${tableName}:`, error);
    }
  }
}

export default PostgreSQLManager;
