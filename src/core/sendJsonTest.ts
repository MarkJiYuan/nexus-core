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
      {
        action: "initiate",
        nodeId: "25ce71ae-43c1-4a07-ab4e-032bd2ea6ff8",
        type: "ComputeNode",
      },
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
