import BasicNode from './node';
import { Kafka } from 'kafkajs';

export default class DataNode extends BasicNode {
  constructor(nodeId: number, kafka: Kafka) {
    super(nodeId, kafka);
  this.init().catch((err) => console.error("Initialization error:", err));
  }

  private async init(): Promise<void> {
    await this.producer.connect();
    await this.sendRegistrationInfo("DataNode");
    this.startHeartbeat("DataNode");
  }

  // 特定的数据处理逻辑
  async handleData(message: string): Promise<void> {
    console.log(`Processing message in DataNode ${this.nodeId}: ${message}`);
    // 实现数据处理逻辑，如收集、转发等
  }
}