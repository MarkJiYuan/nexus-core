import { Kafka, Producer, Consumer, KafkaConfig } from "kafkajs";
import { Topics, Actions, OrganizeMode, StorageSettings } from "../types/types";
import { v4 as uuidv4 } from "uuid";
import OrganizationNode from "./node/organize_node";
import DataNode from "./node/data_node";
import ComputeNode from "./node/compute_node";
import StorageNode from "./node/storage_node";
import { NodeType, SendingMode } from "../types/types";
import fs from "fs";
import path from "path";

export class Register {
  public kafka: Kafka;
  public producer: Producer;
  public consumer: Consumer;
  public nodeId: string;
  public listenTopic: string;
  public node: OrganizationNode | DataNode | ComputeNode | StorageNode;
  private organizeMode?: string;
  private algorithmName?: string;
  private storageSettings?: StorageSettings;
  private sendingMode?: string;
  private folderPath: string;

  constructor(kafka_config: KafkaConfig, id?: string) {
    this.kafka = new Kafka(kafka_config);
    if (id) {
      this.nodeId = id;
    } else {
      this.nodeId = uuidv4();
    }
    this.folderPath = path.resolve(__dirname, `../folder_${this.nodeId}`);
    this.listenTopic = `node_${this.nodeId}`;
    this.producer = this.kafka.producer();

    this.consumer = this.kafka.consumer({
      groupId: `group-register-${this.nodeId}`,
    });
    this.sendApplyinfo().catch((err) =>
      console.error("Registration error:", err),
    );
    this.listenForRoleAssignment().catch((err) =>
      console.error("Role assignment error:", err),
    );
    this.checkAssignedAndReassign().catch((err) =>
      console.error("Reassign error:", err),
    );
  }

  public async sendApplyinfo(): Promise<void> {
    await this.producer.connect();
    const registrationInfo = {
      nodeId: this.nodeId,
      type: "registration",
      timestamp: new Date().toISOString(),
    };
    await this.producer.send({
      topic: Topics.registrationTopic,
      messages: [{ value: JSON.stringify(registrationInfo) }],
    });
    console.log(
      `***(from register)Node ${this.nodeId} apply for registration.`,
    );
  }

  private async checkAssignedAndReassign(): Promise<void> {
    if (!fs.existsSync(this.folderPath)) {
      return;
    }
    const configFilePath = path.join(this.folderPath, "config.json");
    const configData = fs.readFileSync(configFilePath, "utf8");
    const config = JSON.parse(configData);

    // 5. 检查 nodeId 是否存在并返回相应的节点信息
    const node = config.nodes.find((node) => node.nodeId === this.nodeId);
    if (node) {
      const info = {
        action: "initiate",
        nodeId: node.nodeId,
        type: node.nodeType,
        nodeSetting: node.nodeSetting,
      };

      await this.producer.connect();
      await this.producer.send({
        topic: this.listenTopic,
        messages: [
          {
            value: JSON.stringify({ info }),
          },
        ],
      });

      for (let i = 0; i < config.pipelines.length; i++) {
        const pipeline = config.pipelines[i];
        if (pipeline.fromNodeId === this.nodeId) {
          const topicName = `from_${pipeline.fromNodeId}_to_${pipeline.toNodeId}`;
          await this.producer.send({
            topic: `node_${this.nodeId}`,
            messages: [
              {
                value: JSON.stringify({
                  info: {
                    action: Actions.BecomeProducer,
                    topic: topicName,
                  },
                }),
              },
            ],
          });
        } else if (pipeline.toNodeId === this.nodeId) {
          const topicName = `from_${pipeline.fromNodeId}_to_${pipeline.toNodeId}`;
          await this.producer.send({
            topic: `node_${this.nodeId}`,
            messages: [
              {
                value: JSON.stringify({
                  info: {
                    action: Actions.BecomeConsumer,
                    topic: topicName,
                  },
                }),
              },
            ],
          });
        }
      }
      return;
    } else {
      return null;
    }
  }

  protected startHeartbeat(nodeType: string): void {
    setInterval(async () => {
      const message = {
        nodeId: this.nodeId,
        nodeType: nodeType,
        type: Actions.Heartbeat,
        timestamp: new Date().toISOString(),
      };
      await this.producer.send({
        topic: Topics.heartbeatTopic,
        messages: [{ value: JSON.stringify(message) }],
      });
    }, 30000);
  }

  public async sendRegistrationInfo(nodeType: string): Promise<void> {
    const registrationInfo = {
      nodeId: this.nodeId,
      nodeType: nodeType,
      timestamp: new Date().toISOString(),
    };
    await this.producer.send({
      topic: Topics.registrationTopic,
      messages: [{ value: JSON.stringify(registrationInfo) }],
    });
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
        const messageData = JSON.parse(message.value.toString());
        // console.log(`***Received message: ${message.value.toString()}`);
        //如果存在nodeSetting，则说明是角色分配消息
        if (messageData.info && "nodeSetting" in messageData.info) {
          const { action, type, nodeSetting } = JSON.parse(
            message.value.toString(),
          ).info;
          console.log(`***Received message: ${action} ${type}`);
          switch (type) {
            case NodeType.OrganizationNode:
              this.node = new OrganizationNode(this);
              this.sendRegistrationInfo(NodeType.OrganizationNode);
              this.startHeartbeat(NodeType.OrganizationNode);
              this.organizeMode = nodeSetting.organizeMode;
              if (this.organizeMode === OrganizeMode.Periodic) {
                this.node.startPeriodicBroadcast(nodeSetting.interval);
              }
              break;
            case NodeType.DataNode:
              this.node = new DataNode(this);
              this.sendRegistrationInfo(NodeType.DataNode);
              this.startHeartbeat(NodeType.DataNode);
              this.sendingMode = nodeSetting.sendingMode;
              if (this.sendingMode === SendingMode.Polling) {
                //轮询式
                this.node.startPolling(
                  nodeSetting.pollingInterval,
                  nodeSetting.pollingConfig,
                );
              } else if (this.sendingMode === SendingMode.EventDriven) {
                //事件驱动式
                this.node.eventDriven();
              }
              break;
            case NodeType.ComputeNode:
              this.node = new ComputeNode(this);
              this.sendRegistrationInfo(NodeType.ComputeNode);
              this.startHeartbeat(NodeType.ComputeNode);
              this.algorithmName = nodeSetting.algorithm;
              break;
            case NodeType.StorageNode:
              this.node = new StorageNode(this);
              this.sendRegistrationInfo(NodeType.StorageNode);
              this.startHeartbeat(NodeType.StorageNode);
              this.node.setStorageSettings(nodeSetting);
              break;
            default:
              console.log(`***Unknown node type: ${type}`);
          }
        }
        // 如果存在topic，则说明是管道连接消息，设置生产者或消费者
        else if (messageData.info && "topic" in messageData.info) {
          const { action, topic: targetTopic } = JSON.parse(
            message.value.toString(),
          ).info;
          console.log(`***Received message: ${action} ${targetTopic}`);
          if (this.node instanceof DataNode) {
            if (action === Actions.BecomeProducer) {
              await this.node.setProducer(targetTopic);
            } else if (action === Actions.BecomeConsumer) {
              await this.node.setConsumer(targetTopic);
            }
          } else if (this.node instanceof StorageNode) {
            if (action === Actions.BecomeProducer) {
              await this.node.setProducer(targetTopic);
            } else if (action === Actions.BecomeConsumer) {
              await this.node.setConsumer(targetTopic);
              this.node.handleStorage();
            }
          } else if (this.node instanceof ComputeNode) {
            if (action === Actions.BecomeProducer) {
              await this.node.setProducer(targetTopic);
            } else if (action === Actions.BecomeConsumer) {
              await this.node.setConsumer(targetTopic);
              await this.node.handleCompute();
            }
          } else if (this.node instanceof OrganizationNode) {
            if (action === Actions.BecomeProducer) {
              await this.node.addSendTopic(targetTopic);
            } else if (action === Actions.BecomeConsumer) {
              await this.node.addReceiveTopic(targetTopic);
            }
          }
        } else if (messageData.info && "pipelines" in messageData.info) {
          if (!fs.existsSync(this.folderPath)) {
            fs.mkdirSync(this.folderPath, { recursive: true });
          }
          // console.log(`!!!!!essage: ${messageData.tosendMessage}`);
          const configFilePath = path.join(this.folderPath, "config.json");
          fs.writeFileSync(
            configFilePath,
            JSON.stringify(messageData, null, 2),
            "utf8",
          );
        }
      },
    });
  }

  // 生成UUID
  generateUUIDv4() {
    return uuidv4();
  }
}
