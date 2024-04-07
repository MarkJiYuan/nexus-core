import BasicNode from "./node";
import { Kafka } from "kafkajs";
import AlgorithmLibrary from "./algorithmLibrary";

export default class ComputeNode extends BasicNode {
  private algorithmLibrary = new AlgorithmLibrary();

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
  async handleCompute(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const { algorithmName, data } = JSON.parse(message.value.toString());
        const result = this.algorithmLibrary.execute(algorithmName, data);
        if (result !== null) {
          this.sendMessage(result + "");
        }
      },
    });
  }
}
