import { Kafka, Producer, Partitioners, logLevel } from "kafkajs";
import NodeManager from "../core/manager";

const kafka_config = {
  clientId: "test-client",
  brokers: ["localhost:9092"], // 根据实际配置修改
  logLevel: logLevel.ERROR, // Set log level to ERRORS
  logCreator: (logLevel) => {
    return ({ level, label, log }) => {
      if (level === logLevel) {
        console.error(`[${label}] ${log.message}`);
        if (log.stack) {
          console.error(log.stack);
        }
      }
    };
  },
};

if (require.main === module) {
  const nodeManager = new NodeManager(kafka_config);
}