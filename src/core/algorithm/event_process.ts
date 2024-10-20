import { Kafka } from "kafkajs";
import { insertIncidentReport, insertOpcData } from "../../utils/pg/psql";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "../../utils/log";

export interface IncidentReport {
  description: string;
  incident_id: string;
  report_id: string;
  incident_ts?: number;
  report_ts?: number;
  tags?: string[];
  solution?: string;
  score?: number;
}

export interface OpcData {
  ts: number;
  body: string;
}

const logger = createLogger({ logFileName: "event_process" });
const KAFKA_HOST = "localhost:9092"; // 替换为你的Kafka地址
// 特殊值定义，表示没有限制的阈值
const noLimitValue = 1.1111;
const kafka = new Kafka({ brokers: [KAFKA_HOST] });
const consumer = kafka.consumer({ groupId: "event-consumer" });
const producer = kafka.producer();
const TIME_LIMIT = 180 * 60 * 1000;
const sentWarnings: { [key: string]: number } = {};

const event_filter: {
  [excelId: string]: {
    description: string;
    threshold: { H: number; L: number };
  };
} = JSON.parse(
  fs.readFileSync(path.join(__dirname, "event_filter.json"), "utf8"),
);

function generateIncidentReport(description: string) {
  const Report: IncidentReport = {
    description: description,
    incident_id: uuidv4(),
    report_id: uuidv4(),
    incident_ts: Date.now(),
    report_ts: Date.now(),
  };
  return Report;
}

async function checkOpcData(Tsdata: {
  ts: number;
  data: { [key: string]: number };
}) {
  const data = Tsdata["data"];
  for (const dataKey in data) {
    if (data[dataKey]) {
      // 检查 nodeIds 对象中是否存在此 key
      for (const nodeId of Object.keys(event_filter)) {
        if (dataKey.includes(nodeId)) {
          // 检测值是否在阈值范围之外
          const value = data[dataKey];
          const threshold = event_filter[nodeId]["threshold"];
          const description = event_filter[nodeId]["description"] + '异常';
          const incidentKey = `${description}:${nodeId}`;
          const currentTime = Date.now();

          // const incident_report: IncidentReport =
          //   generateIncidentReport(description);
          // await insertIncidentReport(incident_report);
          // logger.info(`发送警告: ${description}`);

          // producer.send({
          //   topic: "new_incident",
          //   messages: [{ value: JSON.stringify(incident_report) }],
          // });

          let isWarning = false;

          if (threshold.H === noLimitValue) {
            // 只有 L 有效，检查是否低于 L
            if (value < threshold.L) {
              isWarning = true;
              logger.warn(
                `警告: ${dataKey} 的值 ${value} 低于下限 ${threshold.L}`,
              );
            }
          } else if (threshold.L === noLimitValue) {
            // 只有 H 有效，检查是否高于 H
            if (value > threshold.H) {
              isWarning = true;
              logger.warn(
                `警告: ${dataKey} 的值 ${value} 高于上限 ${threshold.H}`,
              );
            }
            return;
          } else {
            // H 和 L 都有效，检查是否在范围内
            if (value < threshold.L) {
              isWarning = true;
              logger.warn(
                `警告: ${dataKey} 的值 ${value} 低于下限 ${threshold.L}`,
              );
            } else if (value > threshold.H) {
              isWarning = true;
              logger.warn(
                `警告: ${dataKey} 的值 ${value} 高于上限 ${threshold.H}`,
              );
            }
          }

          if (isWarning) {
            if (
              !sentWarnings[incidentKey] ||
              currentTime - sentWarnings[incidentKey] > TIME_LIMIT
            ) {
              // 生成并发送IncidentReport
              const incident_report: IncidentReport =
                generateIncidentReport(description);
              await insertIncidentReport(incident_report);
              logger.info(`发送警告: ${description}`);

              producer.send({
                topic: "new_incident",
                messages: [{ value: JSON.stringify(incident_report) }],
              });

              // 更新发送时间
              sentWarnings[incidentKey] = currentTime;
            }
          }
        }
      }
    }
  }
}

async function processOpcData() {
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: "opc_raw", fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        const data = JSON.parse(message.value.toString());
        await checkOpcData(data);
        await insertOpcData({
          ts: Date.now(),
          body: JSON.stringify({ hi: "hello" }),
        });
      },
    });
  } catch (err) {
    console.error("Failed in consumer operation:", err);
  }
}

if (require.main === module) {
  processOpcData();
}
