import { time } from "console";
import { Kafka } from "kafkajs";
import { timeout } from "src/utils/time";

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        nodeId: "75a770e2-2e14-4aaa-815a-396a4bf12d53",
        type: "DataNode",
      },
      {
        action: "initiate",
        nodeId: "d121348d-9570-4b28-8882-c4e3d7081883",
        type: "OrganizationNode",
      },
      {
        action: "initiate",
        nodeId: "12e585ce-ab1f-4156-9aa1-a5af0ec14ad7",
        type: "ComputeNode",
      },
      {
        action: "initiate",
        nodeId: "841bd87b-a506-41c8-a8b3-084b05365d21",
        type: "StorageNode",
      },
      {
        action: "connect",
        from: "75a770e2-2e14-4aaa-815a-396a4bf12d53",
        to: "d121348d-9570-4b28-8882-c4e3d7081883",
        details: [],
       },
      {
        action: "connect",
        from: "d121348d-9570-4b28-8882-c4e3d7081883",
        to: "12e585ce-ab1f-4156-9aa1-a5af0ec14ad7",
        details: [],
      },
      {
        action: "connect",
        from: "12e585ce-ab1f-4156-9aa1-a5af0ec14ad7",
        to: "841bd87b-a506-41c8-a8b3-084b05365d21",
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
