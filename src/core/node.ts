import { Kafka, Producer, Consumer } from "kafkajs";
// import { registrationTopic,heartbeatTopic } from "src/types/types";

export class BasicNode {
  protected producer: Producer;
  protected consumer: Consumer;
  protected idConsumer: Consumer;
  public sendTopic: string = "";
  public receiveTopic: string = "";

  constructor(
    public nodeId: number,
    protected kafka: Kafka,
  ) {
    (async () => {
      this.producer = this.kafka.producer();
      this.idConsumer = this.kafka.consumer({ groupId: `group-${nodeId}` });
      await this.idConsumer.connect();
      await this.idConsumer.subscribe({
        topic: `node-${this.nodeId}`,
        fromBeginning: true,
      });

      await this.idConsumer.run({
        eachMessage: async ({ message }) => {
          const { action, topic: targetTopic } = JSON.parse(
            message.value.toString(),
          );
          console.log(`Received message: ${action} ${targetTopic}`);
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
        nodeId: nodeType + this.nodeId,
        type: "heartbeat",
        timestamp: new Date().toISOString(),
      };
      await this.producer.send({
        topic: "node-heartbeat",
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
      topic: "node-registration",
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
    this.consumer = this.kafka.consumer({ groupId: `group-${this.nodeId}` });
    console.log(`Subscribed to ${receiveTopic}`);
    
    this.receiveTopic = receiveTopic;
    await this.consumer.subscribe({
      topic: this.receiveTopic,
      fromBeginning: false,
    });

    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const messageContent = message.value.toString();
          console.log(
            `Message received from ${topic}[${partition}]: ${messageContent}`,
          );
        },
      });
    } catch (error) {
      console.error(error);
    }
    // await this.consumer.run({
    //   eachMessage: async ({ topic, partition, message }) => {
    //     const messageContent = message.value.toString();
    //     console.log(
    //       `Message received from ${topic}[${partition}]: ${messageContent}`,
    //     );
    //   },
    // });
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
