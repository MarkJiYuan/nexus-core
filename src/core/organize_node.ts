import BasicNode from "./node";
import { Kafka } from "kafkajs";
import { Register } from "./register";
import { OrganizeMode } from "../types/types";
import { NodeType, Actions } from "../types/types";

export default class OrganizationNode extends BasicNode {
  private sendTopics: Set<string> = new Set();
  private receiveTopics: Set<string> = new Set();
  private latestData: { [topic: string]: string } = {};
  private organizeMode: string;

  constructor(
    register: Register,
    nodeSetting: { organizeMode: string; interval: number },
  ) {
    super(register);
    this.organizeMode = nodeSetting.organizeMode;
    this.init().catch((err) => console.error("Initialization error:", err));
    if (this.organizeMode === OrganizeMode.Periodic) {
      this.startPeriodicBroadcast(nodeSetting.interval);
    }
  }

  private async init(): Promise<void> {
    await this.producer.connect();
    await this.sendRegistrationInfo(NodeType.OrganizationNode);
    this.startHeartbeat(NodeType.OrganizationNode);

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
        if (action === Actions.BecomeProducer) {
          await this.addSendTopic(targetTopic);
        } else if (action === Actions.BecomeConsumer) {
          await this.addReceiveTopic(targetTopic);
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
      await this.updateConsumerSubscriptions();
    }
  }

  async updateConsumerSubscriptions(): Promise<void> {
    // 停止当前消费者并重新订阅所有主题
    await this.consumer.stop();
    await this.consumer.subscribe({
      topics: Array.from(this.receiveTopics),
      fromBeginning: true,
    });
    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        console.log(
          `Received message from ${topic}: ${message.value.toString()}`,
        );
        this.handleIncomingMessage(topic, message.value.toString());
      },
    });
  }

  private handleIncomingMessage(topic: string, message: string): void {
    this.latestData[topic] = message;
    this.messageCount++;
    if (this.organizeMode === OrganizeMode.EventDriven) {
      for (const sendtopic of this.sendTopics) {
        this.sendMessageForOrganize(sendtopic, this.latestData[topic]);
      }
    }
  }

  async sendMessageForOrganize(topic: string, message: string): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ value: message }],
    });
    this.messageCount++;
    console.log(`Message sent to ${topic}: ${message}`);
  }

  private startPeriodicBroadcast(interval: number): void {
    setInterval(() => {
      for (const topic of Object.keys(this.latestData)) {
        this.sendMessageForOrganize(topic, this.latestData[topic]);
        console.log(
          `Periodically sent message to ${topic}: ${this.latestData[topic]}`,
        );
      }
    }, interval);
  }
}
