import { Kafka, Producer, Consumer } from "kafkajs";
import { registrationTopic,heartbeatTopic } from "../types/types";
import { Register } from "./register";


export class BasicNode {
  protected nodeId: string;
  protected producer: Producer;
  protected consumer: Consumer;
  protected idConsumer: Consumer;
  protected kafka: Kafka;
  public listenTopic: string = "";
  public sendTopic: string = "";
  public receiveTopic: string = "";


  constructor(
    protected register: Register,
  ) {
    (async () => {
      this.nodeId = register.nodeId;
      this.listenTopic = `node-${this.nodeId}`;
      this.producer = register.producer;
      this.kafka = register.kafka;
          this.consumer = this.register.kafka.consumer({ groupId: `group-${this.nodeId}` });
      this.idConsumer = this.kafka.consumer({ groupId: `group-node-${this.nodeId}` });
      await this.idConsumer.connect();
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
        },
      });
    })();
  }

  protected startHeartbeat(nodeType: string): void {
    setInterval(async () => {
      const message = {
        nodeId: this.nodeId,
        nodeType: nodeType,
        type: "heartbeat",
        timestamp: new Date().toISOString(),
      };
      await this.producer.send({
        topic: heartbeatTopic,
        messages: [{ value: JSON.stringify(message) }],
      });
    }, 30000); // 30s一次
  }

  protected async sendRegistrationInfo(nodeType: string): Promise<void> {
    const registrationInfo = {
      nodeId: this.nodeId,
      nodeType: nodeType,
      timestamp: new Date().toISOString(),
    };
    await this.producer.send({
      topic: registrationTopic,
      messages: [{ value: JSON.stringify(registrationInfo) }],
    });
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    await this.consumer.connect();
  }

  async setProducer(sendTopic: string): Promise<void> {
    this.sendTopic = sendTopic;
  }

  async setConsumer(receiveTopic: string): Promise<void> {

    console.log(`***(from node)Subscribed to ${receiveTopic}`);
    
    this.receiveTopic = receiveTopic;
    await this.consumer.subscribe({
      topic: this.receiveTopic,
      fromBeginning: true,
    });

  }

  async sendMessage(message: string): Promise<void> {
    if (!this.sendTopic) {
      return;
    }
    await this.producer.send({
      topic: this.sendTopic,
      messages: [{ value: message }],
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    await this.consumer.disconnect();
  }

}

export default BasicNode;
