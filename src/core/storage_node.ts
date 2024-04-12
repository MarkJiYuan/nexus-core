import BasicNode from "./node";
import { Kafka } from "kafkajs";
import { Register } from "./register";
import fs from "fs";

export default class StorageNode extends BasicNode {
  constructor(register: Register) {
    super(register);
    this.init().catch((err) => console.error("Initialization error:", err));
  }

  private async init(): Promise<void> {
    await this.producer.connect();
    await this.sendRegistrationInfo("StorageNode");
    this.startHeartbeat("StorageNode");

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
          this.handleStorage();
        }
      },
    });
  }

  // 特定的存储逻辑
  async handleStorage(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({message }) => {
        const messageContent = message.value.toString();
        // 文件路径，你可以根据需要修改它
        const filePath = "./storageNodeMessages.txt";

        // 将消息追加到文件中。如果文件不存在，将会创建该文件
        fs.appendFile(filePath, messageContent + "\n", (err) => {
          if (err) {
            console.error("Error writing message to file:", err);
          } else {
            console.log(`Message stored: ${messageContent}`);
          }
        });
      },
    });
  }
}
