import { Kafka, Producer, Partitioners, logLevel } from "kafkajs";
import NodeManager from "../core/manager";
import { Register } from "../core/register";

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

const nodeManager = new NodeManager(kafka_config);

const register1 = new Register(kafka_config,"1");
const register2 = new Register(kafka_config,"2");
const register3 = new Register(kafka_config,"3");
const register4 = new Register(kafka_config,"4");

