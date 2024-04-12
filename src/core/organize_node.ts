import BasicNode from "./node";
import { Kafka } from "kafkajs";
import { Register } from "./register";

export default class OrganizationNode extends BasicNode {
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
          await this.setProducer(targetTopic);
        } else if (action === "becomeConsumer") {
          await this.setConsumer(targetTopic);
          await this.handleOrganization();
        }
      },
    });
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
