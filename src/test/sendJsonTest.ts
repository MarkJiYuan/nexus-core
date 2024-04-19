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
        nodeId: "e405f4c3-fbf8-4970-96b8-09cfaffe0b2c",
        type: "DataNode",
        nodeSetting: {
          sendingMode: "polling",
          pollingInterval: 1000,
        },
      },
      {
        action: "initiate",
        nodeId: "3e0c7cde-ce03-4498-b993-cfe1d9a1b932",
        type: "OrganizationNode",
        nodeSetting: {
          organizeMode: "periodic",
          interval: 1000
        }
      },
      {
        action: "initiate",
        nodeId: "b303f695-3774-4221-93cc-5bca0e4eec9f",
        type: "ComputeNode",
        nodeSetting : {
          algorithm: "sum"
        }
      },
      {
        action: "initiate",
        nodeId: "75f4c9f8-462c-4f2f-90ea-72607e43c216",
        type: "StorageNode",
      },
      {
        action: "connect",
        from: "e405f4c3-fbf8-4970-96b8-09cfaffe0b2c",
        to: "3e0c7cde-ce03-4498-b993-cfe1d9a1b932",
        details: [],
      },
      {
        action: "connect",
        from: "3e0c7cde-ce03-4498-b993-cfe1d9a1b932",
        to: "b303f695-3774-4221-93cc-5bca0e4eec9f",
        details: [],
      },
      {
        action: "connect",
        from: "b303f695-3774-4221-93cc-5bca0e4eec9f",
        to: "75f4c9f8-462c-4f2f-90ea-72607e43c216",
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
