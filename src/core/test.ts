import { Kafka, Producer, Partitioners, logLevel } from "kafkajs";
import NodeManager from "./manager";
import DataNode from "./data_node";
import OrganizationNode from "./organize_node";
import ComputeNode from "./compute_node";
import { managerTopic } from "../types/types";
import { Register } from "./register";

const kafka = new Kafka({
  clientId: "test-client",
  brokers: ["localhost:9092"], // 根据实际配置修改
});

export default kafka;

// const producer = kafka.producer({});
const nodeManager = new NodeManager(kafka);
const register = new Register(kafka);

// async function testNodeRegistration() {
//   await producer.connect();

//   const dataNode = new DataNode(kafka);
//   const computeNode = new ComputeNode(kafka);

//   const managementMessage = {
//     operations: [
//       {
//         action: "connect",
//         from: 1,
//         to: 2,
//       },
//     ],
//   };

//   await producer.send({
//     topic: managerTopic,
//     messages: [{ value: JSON.stringify(managementMessage) }],
//   });

//   await producer.disconnect();
// }

// testNodeRegistration().catch((err) => console.error("测试失败:", err));
