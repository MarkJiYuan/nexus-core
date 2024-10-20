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

export async function updateIncidentReport(data: IncidentReport) {
  const query = `
   UPDATE incident_report
    SET score = $1, 
        report_ts = $2, 
        solution = $3
    WHERE report_id = $4; 
  `;

  const values = [data.score, data.report_ts, data.solution, data.report_id];

  try {
    await pool.query(query, values);
  } catch (err) {
    logger.error(err);
  }
}

export async function insertIncidentReport(data: IncidentReport) {
  const query = `
  INSERT INTO incident_report (
    description, incident_id, report_id, incident_ts, report_ts, tags, solution, score
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`;
  console.log("test inserting", data);
  const values = [
    data.description,
    data.incident_id,
    data.report_id,
    data.incident_ts,
    data.report_ts,
    data.tags,
    data.solution,
    data.score,
  ];

  try {
    await pool.query(query, values);
  } catch (err) {
    logger.error(err);
  }
}

export async function fetchAllIncidents(): Promise<IncidentReport[] | null> {
  const query = `
    SELECT * FROM incident_report
    ORDER BY report_ts DESC
    LIMIT 10;
  `;

  try {
    const result = await pool.query(query);
    return result.rows as IncidentReport[];
  } catch (err) {
    logger.error("Failed to fetch recent incidents:", err);
    return null;
  }
}

export async function fetchSolvedIncidents(): Promise<IncidentReport[] | null> {
  const query = `
    SELECT *
    FROM incident_report
    WHERE score IS NOT NULL
    ORDER BY report_ts DESC
    LIMIT 10;
  `;

  try {
    const result = await pool.query(query);
    return result.rows as IncidentReport[];
  } catch (err) {
    logger.error("Failed to fetch solved incidents:", err);
    return null;
  }
}

export async function fetchToSolveIncidents(): Promise<
  IncidentReport[] | null
> {
  const query = `
    SELECT *
    FROM incident_report
    WHERE score IS NULL
    ORDER BY report_ts DESC
    LIMIT 10;
  `;

  try {
    const result = await pool.query(query);
    return result.rows as IncidentReport[];
  } catch (err) {
    logger.error("Failed to fetch solved incidents:", err);
    return null;
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
  // fetchRecentIncidents();
}
