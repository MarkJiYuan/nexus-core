import { Kafka, Producer, Consumer } from "kafkajs";

export class BasicNode {
  protected producer: Producer;
  protected consumer: Consumer;
  private managementTopic = "node-management";
  public sendTopic: string = "";
  public receiveTopic: string = "";

  constructor(
    public nodeId: number,
    protected kafka: Kafka,
  ) {
    console.log(`Node ${nodeId} created.`)
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: `group-${nodeId}` });
  }

  protected startHeartbeat(nodeType: string): void {
    setInterval(async () => {
      const message = {
        nodeId: nodeType + this.nodeId,
        type: "heartbeat",
        timestamp: new Date().toISOString(),
      };
      await this.producer.send({
        topic: this.managementTopic,
        messages: [{ value: JSON.stringify(message) }],
      });
    }, 30000); // 30s一次
  }

  protected async sendRegistrationInfo(nodeType: string): Promise<void> {
    const registrationInfo = {
      nodeId: nodeType + this.nodeId,
      type: "registration",
      timestamp: new Date().toISOString(),
    };
    await this.producer.send({
      topic: this.managementTopic,
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
    this.receiveTopic = receiveTopic;
    await this.consumer.subscribe({
      topic: this.receiveTopic,
      fromBeginning: true,
    });
    await this.consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageContent = message.value.toString();
      console.log(`Message received from ${topic}[${partition}]: ${messageContent}`);
    },
  });
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.sendTopic) {
      throw new Error("Send topic not set.");
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
