import {
  registrationTopic,
  heartbeatTopic,
  managerTopic,
} from "../types/types";
import { Kafka, Consumer, Producer } from "kafkajs";
import { NodeInfo, SystemState } from "../types/types";
import fs from "fs";
import path from "path";
import BasicNode from "./node";

export class NodeManager {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private nodesFilePath = path.resolve(__dirname, "nodes.json");

  private nodes: Map<string, any> = new Map();
  private lastHeartbeat: { [nodeId: string]: Date } = {}; //记录最后一次心跳的时间

  constructor(kafka: Kafka) {
    this.kafka = kafka;
    this.consumer = this.kafka.consumer({ groupId: "node-manager-group" });
    this.producer = this.kafka.producer();
    this.init().catch((err) => console.error("Initialization error:", err));

    this.loadNodesInfo();
    this.listenToHeartbeats();
    setInterval(() => {
      this.checkNodeStatus();
    }, 60000);
  }

  private async init(): Promise<void> {
    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: managerTopic,
      fromBeginning: true,
    });
    await this.consumer.subscribe({
      topic: registrationTopic,
      fromBeginning: true,
    });

    this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const info = JSON.parse(message.value.toString());
        if (topic === registrationTopic) {
          // 处理节点注册信息
          this.handleNodeRegistration(info);
        } else if (topic === managerTopic) {
          // 处理来自管理信息的消息
          this.handleManagerMessage(info);
        }
      },
    });
  }

  private handleManagerMessage(content: any): void {
    if (Array.isArray(content.operations)) {
      content.operations.forEach((operation: any) => {
        switch (operation.action) {
          case "connect":
            // 连接
            this.handleConnectAction(operation);
            break;
          case "configure":
            // 配置
            this.handleConfigureAction(operation);
            break;
          case "initiate":
            this.handleInitiationAction(operation);
            break;
          default:
            console.log(`***Unsupported operation: ${operation.action}`);
        }
      });
    } else {
      console.error("Invalid operations format");
    }
  }

  private async handleConnectAction(operation: any): Promise<void> {
    const topicName = `from-node-${operation.from}-to-node-${operation.to}`;

    // 告诉from节点成为该topic的生产者
    await this.producer.send({
      topic: `node-${operation.from}`,
      messages: [
        {
          value: JSON.stringify({ action: "becomeProducer", topic: topicName }),
        },
      ],
    });

    // 告诉to节点成为该topic的消费者
    await this.producer.send({
      topic: `node-${operation.to}`,
      messages: [
        {
          value: JSON.stringify({ action: "becomeConsumer", topic: topicName }),
        },
      ],
    });

    console.log(`***node-${operation.from} and node-${operation.to}`);
  }

  private async handleInitiationAction(info: any): Promise<void> {
    await this.producer.send({
      topic: `node-${info.nodeId}`,
      messages: [
        {
          value: JSON.stringify({ action: "initiate", type: info.type }),
        },
      ],
    });
    console.log(
      `***(from manager)sending initiate message to node ${info.nodeId} with type ${info.type}`,
    );
  }

  private handleConfigureAction(info: any): void {
    //
    console.log(
      `***Configuring node ${info.nodeId} with config: ${JSON.stringify(info.config)}`,
    );
  }

  private handleNodeRegistration(info: {
    nodeId: string;
    nodeType: string;
    type: string;
    timestamp: string;
  }): void {
    if (info.nodeType) {
      console.log(
        `***(from manager)Node(${info.nodeType}) ${info.nodeId} registered.`,
      );

      //存储为json
      const data = this.loadNodesData();
      const existingNodeIndex = data.nodes.findIndex(
        (node) => node.nodeId === info.nodeId,
      );

      if (existingNodeIndex !== -1) {
        // 如果已存在具有相同nodeId的节点，不执行任何操作
        console.log(
          `***(from manager) Node(${info.nodeType}) ${info.nodeId} is already registered.`,
        );
        return;
      }
      data.nodes.push({ nodeId: info.nodeId, nodeType: info.nodeType });
      this.saveNodesData(data);

      this.nodes.set(info.nodeId, info);
      return;
    } else {
      console.log(
        `***(from manager)Node apply for registration: ${info.nodeId}, type: ${info.type}`,
      );
    }
  }

  loadNodesInfo() {
    if (fs.existsSync(this.nodesFilePath)) {
      const data = fs.readFileSync(this.nodesFilePath, 'utf8');
      const nodes = JSON.parse(data).nodes;
      console.log(nodes)
      nodes.forEach(node => {
        this.nodes.set(node.nodeId, node);
      });
      console.log('Loaded nodes info from file.');
    }
  }

  async removeNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      await node.disconnect(); // 假设节点的disconnect方法会处理所有清理逻辑
      this.nodes.delete(nodeId);

      // 可选：如果节点间有特定的连接关系需要处理，这里应该添加逻辑来解除这些连接
    }
  }

  private loadNodesData(): SystemState {
    try {
      const data = fs.readFileSync(this.nodesFilePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.log(
        "***Could not load nodes data, initializing with default structure.",
      );
      return { nodes: [], pipelines: [] }; // 默认结构
    }
  }

  private saveNodesData(data: SystemState): void {
    fs.writeFileSync(this.nodesFilePath, JSON.stringify(data, null, 2), "utf8");
  }

  private async listenToHeartbeats() {
    const consumer = this.kafka.consumer({ groupId: "manager-group" });
    await consumer.connect();
    await consumer.subscribe({ topic: heartbeatTopic, fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ message }) => {
        const messageValue = message.value.toString();
        const content = JSON.parse(message.value.toString());
        this.handleHeartbeat(content);
      },
    });
  }

  private handleHeartbeat(info: any) {
    console.log(
      `***Heartbeat received from node(${info.nodeType}) ${info.nodeId} at ${info.timestamp}`,
    );
    this.lastHeartbeat[info.nodeId] = new Date(info.timestamp);
  }

  // 定期检查节点的心跳，看是否有节点失联
  checkNodeStatus() {
    const now = new Date();
    for (const nodeId in this.lastHeartbeat) {
      const lastHeartbeatTime = this.lastHeartbeat[nodeId];
      const diff = now.getTime() - lastHeartbeatTime.getTime();
      if (diff > 60000) {
        console.log(`***Node ${nodeId} is not responding.`);
      }
    }
  }
}

export default NodeManager;
