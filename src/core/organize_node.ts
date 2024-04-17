import BasicNode from "./node";
import { Kafka } from "kafkajs";
import { Register } from "./register";
import { organizeMode } from "src/types/types";

export default class OrganizationNode extends BasicNode {
  private sendTopics: Set<string> = new Set();
  private receiveTopics: Set<string> = new Set();

  constructor(register: Register) {
    super(register);
    this.init().catch((err) => console.error("Initialization error:", err));
  }

  private async init(): Promise<void> {
    await this.producer.connect();
    await this.sendRegistrationInfo("OrganizationNode");
    this.startHeartbeat("OrganizationNode");

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
          await this.addSendTopic(targetTopic);
        } else if (action === "becomeConsumer") {
          await this.addReceiveTopic(targetTopic);
          await this.handleOrganization();
        }
      },
    });
  }

  async addSendTopic(topic: string): Promise<void> {
    if (!this.sendTopics.has(topic)) {
      this.sendTopics.add(topic);
      console.log(`Added send topic: ${topic}`);
    }
  }

  async addReceiveTopic(topic: string): Promise<void> {
    if (!this.receiveTopics.has(topic)) {
      this.receiveTopics.add(topic);
      this.consumer.stop();
      await this.consumer.subscribe({ topic, fromBeginning: true });
    }
  }

  // 特定的组织逻辑
  async handleOrganization(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const messageContent = message.value.toString();
        this.sendMessage(messageContent);
        console.log(
          `***(from node)Message received from ${topic}[${partition}]: ${messageContent}`,
        );
      },
    });

    // 实现组织逻辑，如消息格式化、过滤等
  }
}
