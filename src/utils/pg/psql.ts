import { Pool } from "pg";
import { createLogger } from "../log";
import { IncidentReport, OpcData } from "../../core/algorithm/event_process";

const logger = createLogger({ logFileName: "db" });

// PostgreSQL connection setup
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "123456",
  port: 5432,
});

export async function insertOpcData(data: OpcData) {
  const query = "INSERT INTO opc_data (ts, body) VALUES ($1, $2)";
  const values = [data.ts, data.body];

  try {
    await pool.query(query, values);
  } catch (err) {
    logger.error(err);
  }
}

export async function insertIncidentReport(data: IncidentReport) {
  const query = 'INSERT INTO incident_report VALUES ($1, $2, $3, $4, $5, $6, $7, $8)';
  const values = [
    data.description,
    data.incident_id,
    data.report_id,
    data.incident_ts,
    data.report_ts,
    data.tags,
    data.solution,
    data.score
  ];

  try {
    await pool.query(query, values);
  } catch (err) {
    logger.error(err)
  }
}

if (require.main === module) {
  // Test the insertData function
  // insertOpcData({
  //   ts: Date.now(),
  //   body: JSON.stringify({ hi: "hello" }),
  // });
  // insertIncidentReport({
  //   description: "nidaye",
  //   incident_id: "dasafsaf",
  //   report_id: "dasjeif2o3if2",
  //   incident_ts: Date.now(),
  //   report_ts: Date.now(),
  //   tags: ["daf", "asda", "ds"]
  // })
}
