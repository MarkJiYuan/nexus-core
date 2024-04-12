import { Kafka } from "kafkajs";

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
      // {
      //   action: "initiate",
      //   nodeId: "917562ec-0008-4f8f-a89b-de82217decc4",
      //   type: "OrganizationNode",
      // },
      // {
      //   action: "connect",
      //   from: "4888d2be-9dad-4807-b705-fc9696a7eee1",
      //   to: "91c3ab76-90c5-4fea-ae07-9044177d71a1",
      //   details: [],
      // },
      {
        action: "connect",
        from: "80543908-cdc4-48cc-8402-9037046259e6",
        to: "731b952c-047a-4788-af89-0df217bb2757",
        details: [],
      }
    ],
  };

  // 发送消息
  await producer.send({
    topic: "node-management",
    messages: [{ value: JSON.stringify(tosendMessage) }],
  });

  console.log("Message sent successfully");

  // 断开生产者连接
  await producer.disconnect();
}

// 运行生产者并捕获可能的错误
runProducer().catch(console.error);
