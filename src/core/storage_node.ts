import BasicNode from './node';
import { Kafka } from 'kafkajs';
import { Register } from './register';
import fs from 'fs';

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
    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const messageContent = message.value.toString();
          console.log(
            `***(from node)Message received from ${topic}[${partition}]: ${messageContent}`,
          );
        },
      });
    } catch (error) {
      console.error(error);
    }
    console.log(`Storing message in StorageNode ${this.nodeId}: ${message}`);
    // 文件路径，你可以根据需要修改它
    const filePath = './storageNodeMessages.txt';

    // 将消息追加到文件中。如果文件不存在，将会创建该文件
    try {
      fs.appendFile(filePath, message + "\n", (err) => {
        if (err) {
          console.error("Error writing message to file:", err);
        } else {
          console.log(`Message stored: ${message}`);
        }
      });
    } catch (err) {
      console.error("Error writing message to file:", err);
    }
  }
}
