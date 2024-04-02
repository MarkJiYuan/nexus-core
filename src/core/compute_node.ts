import BasicNode from './node';
import { Kafka } from 'kafkajs';

export default class ComputeNode extends BasicNode {
  constructor(nodeId: number, kafka: Kafka) {
    super(nodeId, kafka);
  this.init().catch((err) => console.error("Initialization error:", err));
  }

  private async init(): Promise<void> {
    await this.producer.connect();
    await this.sendRegistrationInfo("ComputeNode");
    this.startHeartbeat("ComputeNode");
  }

  // 特定的计算逻辑
  async handleCompute(message: string): Promise<void> {
    console.log(`Computing message in ComputeNode ${this.nodeId}: ${message}`);
    // 实现计算逻辑，如执行某些算法等
  }
}
