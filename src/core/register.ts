import { Kafka, Producer, Consumer } from "kafkajs";
import { Topics } from "../types/types";
import { v4 as uuidv4 } from "uuid";
import OrganizationNode from "./organize_node";
import DataNode from "./data_node";
import ComputeNode from "./compute_node";
import StorageNode from "./storage_node";
import { NodeType } from "../types/types";

export class Register {
  public kafka: Kafka;
  public producer: Producer;
  public consumer: Consumer;
  public nodeId: string;
  public listenTopic: string;

  constructor(kafka: Kafka) {
    this.nodeId = uuidv4();
    this.kafka = kafka;
    this.listenTopic = `register ${this.nodeId}`;
    this.producer = kafka.producer();

    this.consumer = kafka.consumer({ groupId: `group-register-${this.nodeId}` });
    this.sendRegistrationInfo().catch((err) =>
      console.error("Registration error:", err),
    );
    this.listenForRoleAssignment().catch((err) =>
      console.error("Role assignment error:", err),
    );
  }

  public async sendRegistrationInfo(): Promise<void> {
    const registrationInfo = {
      nodeId: this.nodeId,
      type: "registration",
      timestamp: new Date().toISOString(),
    };
    await this.producer.connect();
    await this.producer.send({
      topic: Topics.registrationTopic,
      messages: [{ value: JSON.stringify(registrationInfo) }],
    });
    console.log(`***(from register)Node ${this.nodeId} registered.`);
  }

  // 监听角色分配消息
  async listenForRoleAssignment() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.listenTopic,
      fromBeginning: true,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const { action, type, nodeSetting } = JSON.parse(message.value.toString());
        // 如果action不是"initiate"，则直接返回
        if (action !== "initiate") {
          return;
        }

        switch (type) {
          case NodeType.OrganizationNode:
            new OrganizationNode(this, nodeSetting);
            break;
          case NodeType.DataNode:
            new DataNode(this, nodeSetting);
            break;
          case NodeType.ComputeNode:
            new ComputeNode(this, nodeSetting);
            break;
          case NodeType.StorageNode:
            new StorageNode(this, nodeSetting);
            break;
          default:
            console.log(`***Unknown node type: ${type}`);
        }
      },
    });
  }

  // 生成UUID
  generateUUIDv4() {
    return uuidv4();
  }
}
