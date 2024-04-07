import { Kafka, Producer, Partitioners, logLevel } from "kafkajs";
import NodeManager from "./manager";
import DataNode from "./data_node";
import OrganizationNode from "./organize_node";
import ComputeNode from "./compute_node";
import { managerTopic } from "../types/types";

const kafka = new Kafka({
  clientId: "test-client",
  brokers: ["localhost:9092"], // 根据实际配置修改
});

const producer = kafka.producer({});
const nodeManager = new NodeManager(kafka); // 假设NodeManager的构造函数接收Kafka实例

async function testNodeRegistration() {
  await producer.connect();

  const dataNode = new DataNode(1, kafka);
  const computeNode = new ComputeNode(2, kafka);

  const managementMessage = {
    operations: [
      {
        action: "connect",
        from: 1,
        to: 2,
      },
    ],
  };

  await producer.send({
    topic: managerTopic,
    messages: [{ value: JSON.stringify(managementMessage) }],
  });

  await producer.disconnect();
}

testNodeRegistration().catch((err) => console.error("测试失败:", err));
