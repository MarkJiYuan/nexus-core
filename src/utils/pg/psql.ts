import { Client } from 'pg';

const dbConfig = {
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: "123456",
  port: 5432,
};

export async function connect(): Promise<Client> {
  const client = new Client(dbConfig);
  await client.connect();
  return client;
}

export async function disconnect(client: Client): Promise<void> {
  await client.end();
}

export async function query(queryText: string, params?: any[]): Promise<any> {
  const client = await connect();
  try {
    const res = await client.query(queryText, params);
    return res.rows;
  } catch (err) {
    console.error('Error executing query', err);
    throw err;
  } finally {
    await disconnect(client);
  }
}

export async function insert(tableName: string, data: any): Promise<void> {
  const rawData = data;

  const dataToSend = {
    timestamp: new Date(parseInt(rawData[0], 10) * 1000).toISOString(), // 转换时间戳为 ISO 格式
    close: parseFloat(rawData[1]),
    open: parseFloat(rawData[2]),
    high: parseFloat(rawData[3]),
    low: parseFloat(rawData[4]),
    amount: parseFloat(rawData[5]),
    volume: parseFloat(rawData[6])
  };
  const columns = Object.keys(dataToSend).join(', ');
  const values = Object.values(dataToSend);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const queryText = `
    INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})
    ON CONFLICT (timestamp) DO NOTHING
  `;
    console.log('Executing query:', queryText);
  console.log('With values:', values);

  await query(queryText, values);
}

// export async function update(
//   tableName: string,
//   data: any,
//   condition: string,
//   conditionParams: any[]
// ): Promise<void> {
//   const columns = Object.keys(data);
//   const values = Object.values(data);
//   const setString = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

//   const queryText = `UPDATE ${tableName} SET ${setString} WHERE ${condition}`;

//   await query(queryText, [...values, ...conditionParams]);
// }

// export async function remove(
//   tableName: string,
//   condition: string,
//   conditionParams: any[]
// ): Promise<void> {
//   const queryText = `DELETE FROM ${tableName} WHERE ${condition}`;
//   await query(queryText, conditionParams);
// }

export async function createTable(tableName: string): Promise<void> {
  const queryText = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      symbol VARCHAR(10),
      period VARCHAR(10),
      pidx INTEGER,
      psize INTEGER,
      withlast BOOLEAN,
      data JSONB,
      fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await query(queryText);
}

export async function createKlineTable(tableName: string): Promise<void> {
  const queryText = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      timestamp TIMESTAMP PRIMARY KEY,
      close NUMERIC NOT NULL,
      open NUMERIC NOT NULL,
      high NUMERIC NOT NULL,
      low NUMERIC NOT NULL,
      amount NUMERIC NOT NULL,
      volume NUMERIC NOT NULL
    )
  `;
  await query(queryText);
}

export async function ensureTableAndInsert(tableName: string, data: any): Promise<void> {
  try {
    await createKlineTable(tableName);
    await insert(tableName, data);
  } catch (error) {
    console.error(`Error in ensureTableAndInsert for table ${tableName}:`, error);
  }
}