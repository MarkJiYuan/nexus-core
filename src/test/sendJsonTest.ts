import { time } from "console";
import { Kafka } from "kafkajs";
import { OrganizeMode } from "../types/types";
import { timeout } from "src/utils/time";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runProducer() {
  const kafka = new Kafka({
    clientId: "test-client",
    brokers: ["localhost:9092"], // 根据实际配置修改
  });

  const producer = kafka.producer();

  // 确保生产者连接完成
  await producer.connect();

  const tosendMessage = {
    operations: [
      {
        action: "initiate",
        nodeId: "1",
        type: "DataNode",
        nodeSetting: {
          sendingMode: "polling",
          pollingInterval: 5000,
        },
      },
      {
        action: "initiate",
        nodeId: "2",
        type: "OrganizationNode",
        nodeSetting: {
          organizeMode: "eventDriven",
        },
      },
      {
        action: "initiate",
        nodeId: "3",
        type: "ComputeNode",
        nodeSetting: {
          algorithm: "sum",
        },
      },
      {
        action: "initiate",
        nodeId: "4",
        type: "StorageNode",
        nodeSetting: {
          storageType: "file",
          fileConfig: {
            path: "./data.txt",
          },
        },
      },
      {
        action: "connect",
        from: "1",
        to: "2",
        details: [],
      },
      {
        action: "connect",
        from: "2",
        to: "3",
        details: [],
      },
      {
        action: "connect",
        from: "3",
        to: "4",
        details: [],
      },
    ],
  };

  // const tosendMessage1 = {
  //   operations: [
  //     {
  //       action: "connect",
  //       from: "2160b321-0189-47fd-857f-14f1e2318791",
  //       to: "127e58bf-fb99-44bf-bfb7-300a777dfc68",
  //       details: [],
  //     },
  //   ]
  // }

  // 发送消息
  await producer.send({
    topic: "node-management",
    messages: [{ value: JSON.stringify(tosendMessage) }],
  });
  // await delay(10000)
  // await producer.send({
  //   topic: "node-management",
  //   messages: [{ value: JSON.stringify(tosendMessage1) }],
  // });

  console.log("Message sent successfully");

  // 断开生产者连接
  await producer.disconnect();
}

// 运行生产者并捕获可能的错误
runProducer().catch(console.error);
