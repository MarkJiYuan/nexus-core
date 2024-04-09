import BasicNode from './node';
import { Kafka } from 'kafkajs';
import { Register } from './register';

export default class StorageNode extends BasicNode {
  constructor(register: Register) {
    super(register);
    this.init().catch((err) => console.error("Initialization error:", err));
  }

  private async init(): Promise<void> {
    await this.producer.connect();
    await this.sendRegistrationInfo("StorageNode");
    this.startHeartbeat("StorageNode");
  }

  // 特定的存储逻辑
  async handleStorage(message: string): Promise<void> {
    console.log(`Storing message in StorageNode ${this.nodeId}: ${message}`);
    // 实现存储逻辑，如保存到文件、数据库等
  }
}
