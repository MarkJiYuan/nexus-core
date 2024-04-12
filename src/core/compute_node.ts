import BasicNode from "./node";
import { Kafka } from "kafkajs";
import AlgorithmLibrary from "./algorithmLibrary";
import { Register } from "./register";

export default class ComputeNode extends BasicNode {
  private algorithmLibrary = new AlgorithmLibrary();

  constructor(register: Register) {
    super(register);
    this.init().catch((err) => console.error("Initialization error:", err));
  }

  private async init(): Promise<void> {
    await this.producer.connect();
    await this.sendRegistrationInfo("ComputeNode");

    this.startHeartbeat("ComputeNode");
    await this.idConsumer.subscribe({
      topic: this.listenTopic,
      fromBeginning: true,
    });

    await this.idConsumer.run({
      eachMessage: async ({ message }) => {
        const { action, topic: targetTopic } = JSON.parse(
          message.value.toString(),
        );
        console.log(`***Received message: ${action} ${targetTopic}`);
        if (action === "becomeProducer") {
          await this.setProducer(targetTopic);
        } else if (action === "becomeConsumer") {
          await this.setConsumer(targetTopic);
          await this.handleCompute();
        }
      },
    });
  }

  // 特定的计算逻辑
  async handleCompute(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const { algorithmName, data } = JSON.parse(message.value.toString());
        const result = this.algorithmLibrary.execute(algorithmName, data);
        
        if (result !== null) {
          if (this.sendTopic === undefined) return;
          console.log(result)
          this.sendMessage(result + "");
        }
      },
    });
  }
}
