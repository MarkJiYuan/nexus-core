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
        nodeId: "7bb068cd-84ad-4ee1-afb2-23df96245e4d",
        type: "DataNode",
      },
      {
        action: "initiate",
        nodeId: "c7ca7f72-c6fc-4b35-a636-d231650113a3",
        type: "OrganizationNode",
      },
      // {
      //   action: "initiate",
      //   nodeId: "33ec7fd3-0408-4b05-8770-16552f820073",
      //   type: "ComputeNode",
      // },
      // {
      //   action: "initiate",
      //   nodeId: "33ec7fd3-0408-4b05-8770-16552f820073",
      //   type: "StorageNode",
      // },
      // {
      //   action: "connect",
      //   from: "33ec7fd3-0408-4b05-8770-16552f820073",
      //   to: "13046ed0-8335-407f-9bef-ca73b57e705c",
      //   details: [],
      // },
      // {
      //   action: "connect",
      //   from: "33ec7fd3-0408-4b05-8770-16552f820073",
      //   to: "13046ed0-8335-407f-9bef-ca73b57e705c",
      //   details: [],
      // },
      {
        action: "connect",
        from: "7bb068cd-84ad-4ee1-afb2-23df96245e4d",
        to: "c7ca7f72-c6fc-4b35-a636-d231650113a3",
        details: [],
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
