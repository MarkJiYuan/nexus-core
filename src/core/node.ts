import { Kafka, Producer, Consumer } from "kafkajs";
import { registrationTopic, heartbeatTopic } from "../types/types";
import { Register } from "./register";
import Ajv from "ajv";
const ajv = new Ajv();

export class BasicNode {
  protected nodeId: string;
  protected producer: Producer;
  protected consumer: Consumer;
  protected idConsumer: Consumer;
  protected kafka: Kafka;
  protected messageCount: number;
  protected startTime: number;
  public listenTopic: string = "";
  public sendTopic: string = ""; //管道的生产者
  public receiveTopic: string[] = []; //管道的消费者

  constructor(protected register: Register) {
    (async () => {
      this.nodeId = register.nodeId;
      this.consumer = this.register.kafka.consumer({
        groupId: `group-${this.nodeId}`,
      });

      this.listenTopic = `node ${this.nodeId}`;
      this.producer = register.producer;
      this.kafka = register.kafka;
      this.messageCount = 0;
      this.startTime = Date.now();

      this.idConsumer = this.kafka.consumer({
        groupId: `group-node-${this.nodeId}`,
      });
      await this.idConsumer.connect();
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
    }, 30000);
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

  async setProducer(sendTopic: string): Promise<void> {
    this.sendTopic = sendTopic;
  }

  async setConsumer(receiveTopic: string): Promise<void> {
    await this.consumer.stop();
    this.receiveTopic.push(receiveTopic);
    console.log(this.receiveTopic);
    await this.consumer.subscribe({
      topics: this.receiveTopic,
      fromBeginning: true,
    });
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.sendTopic) {
      return;
    }

    //检验数据合理性
    try {
    const messageObj = JSON.parse(message);
    if (!this.validateData(messageObj)) {
      console.error('Data validation failed, message not sent.');
      return;
    }
    await this.producer.send({
      topic: this.sendTopic,
      messages: [{ value: message }],
    });
  } catch (error) {
    console.error('Error in sending message:', error);
  }

    await this.producer.send({
      topic: this.sendTopic,
      messages: [{ value: message }],
    });

    //监测流速
    this.messageCount++;
    this.monitorRate();
  }

  //监测每秒发送消息数
  monitorRate() {
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - this.startTime) / 1000;

    if (elapsedSeconds >= 60) {
      console.log(
        `Messages per minute: ${this.messageCount / (elapsedSeconds / 60)}`,
      );

      this.messageCount = 0;
      this.startTime = Date.now();
    }
  }

  //监测消息对象是否符合规范
  validateData(message) {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string", minLength: 1 },
        age: { type: "number", minimum: 0 },
        email: { type: "string", format: "email" },
      },
      required: ["name", "age", "email"],
      additionalProperties: false,
    };

    const validate = ajv.compile(schema);
    const valid = validate(message);
    if (!valid) {
      console.error(validate.errors);
      return false;
    }
    return true;
  }
}

export default BasicNode;
