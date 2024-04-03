// testNodeManager.ts
import { Kafka, Producer,Partitioners, logLevel } from 'kafkajs';
import NodeManager from './manager'; // 假设您的中心管理节点实现在这个文件中

const kafka = new Kafka({
  clientId: 'test-client',
  brokers: ['localhost:9092'], // 根据实际配置修改
});

const producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
const nodeManager = new NodeManager(kafka, '../types/test.json'); // 假设NodeManager的构造函数接收Kafka实例

async function testNodeRegistration() {
  await producer.connect();

  // 模拟发送注册信息的消息
  const registrationMessage = {
    nodeId: 1,
    type: 'OrganizationNode',
    timestamp: new Date().toISOString(),
  };

  await producer.send({
    topic: 'node-management', // 确保这是NodeManager监听的topic
    messages: [{ value: JSON.stringify(registrationMessage) }],
  });

  console.log('注册信息发送完毕。');

  // 在实际的测试中，您可能需要在NodeManager中暴露一些方法或状态，以便在这里进行断言检查
  // 例如:
  // console.assert(nodeManager.hasRegistered(1), '节点1应已注册');

  await producer.disconnect();
}

testNodeRegistration().catch(err => console.error('测试失败:', err));
