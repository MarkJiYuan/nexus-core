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
        nodeId: "671e8688-a717-44b0-8f7e-9634eb7bd16f",
        type: "DataNode",
      }
    ],
  };

  // 发送消息
  await producer.send({
    topic: "from-node-671e8688-a717-44b0-8f7e-9634eb7bd16f-to-node-f16548aa-04fb-44c5-bbdb-76687cc9ff90",
    messages: [{ value: JSON.stringify(tosendMessage) }],
  });

  console.log("Message sent successfully");

  // 断开生产者连接
  await producer.disconnect();
}

// 运行生产者并捕获可能的错误
runProducer().catch(console.error);
