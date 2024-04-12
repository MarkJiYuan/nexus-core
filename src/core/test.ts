import { Kafka, Producer, Partitioners, logLevel } from "kafkajs";
import NodeManager from "./manager";
import DataNode from "./data_node";
import OrganizationNode from "./organize_node";
import ComputeNode from "./compute_node";
import { managerTopic } from "../types/types";
import { Register } from "./register";
import { time } from "console";

const kafka = new Kafka({
  clientId: "test-client",
  brokers: ["localhost:9092"], // 根据实际配置修改
  // logLevel: logLevel.ERROR, // Set log level to ERRORS
  // logCreator: (logLevel) => {
  //   return ({ level, label, log }) => {
  //     if (level === logLevel) {
  //       console.error(`[${label}] ${log.message}`);
  //       if (log.stack) {
  //         console.error(log.stack);
  //       }
  //     }
  //   };
  // },
});

// const producer = kafka.producer({});
const nodeManager = new NodeManager(kafka);

const register1 = new Register(kafka);
const register2 = new Register(kafka);
const register3 = new Register(kafka);
const register4 = new Register(kafka);
