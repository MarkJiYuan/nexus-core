import BasicNode from "./node";
import { Kafka } from "kafkajs";
import { Register } from "./register";

export default class DataNode extends BasicNode {
  constructor(register: Register) {
    super(register);
    this.init().catch((err) => console.error("Initialization error:", err));
  }

  private async init(): Promise<void> {
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
        }

          await this.producer.connect();
          await this.sendRegistrationInfo("DataNode");
          this.startHeartbeat("DataNode");
          this.sendPeriodicMessages();

      },
    });
  }

  sendPeriodicMessages(): void {
    setInterval(async () => {
      const message = {
        algorithmName: "sum",
        data: [1, 2, 3, 4, 5],
      };
      await this.sendMessage(JSON.stringify(message));
    }, 5000); // 每五秒执行一次
  }

  // 特定的数据处理逻辑
  async handleData(message: string): Promise<void> {
    console.log(`Processing message in DataNode ${this.nodeId}: ${message}`);
    // 实现数据处理逻辑，如收集、转发等
  }
}
