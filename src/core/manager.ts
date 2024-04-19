import { Kafka, Consumer, Producer } from "kafkajs";
import { Topics, SystemState, NodeStatus } from "../types/types";
import fs from "fs";
import path from "path";
import BasicNode from "./node";
import { timeStamp } from "console";

export class NodeManager {
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private nodesFilePath = path.resolve(__dirname, "../test/nodes.json");

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
      topic: Topics.managerTopic,
      fromBeginning: true,
    });
    await this.consumer.subscribe({
      topic: Topics.registrationTopic,
      fromBeginning: true,
    });

    // 监听来自注册或管理信息的消息
    this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        const info = JSON.parse(message.value.toString());
        if (topic === Topics.registrationTopic) {
          // 处理节点注册信息
          this.handleNodeRegistration(info);
        } else if (topic === Topics.managerTopic) {
          // 处理来自管理信息的消息
          this.handleManagerMessage(info);
        }
      },
    });
  }

  // 处理来自管理信息的消息
  private handleManagerMessage(content: any): void {
    if (Array.isArray(content.operations)) {
      content.operations.forEach((operation: any) => {
        switch (operation.action) {
          case "connect":
            // 节点间连接  即建立管道
            this.handleConnectAction(operation);
            break;
          case "configure":
            // 节点配置
            this.handleConfigureAction(operation);
            break;
          case "initiate":
            // 初始化
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

  //处理节点间连接
  private async handleConnectAction(operation: any): Promise<void> {
    const topicName = `from ${operation.from} to ${operation.to}`;
    const data = this.loadNodesData();
    data.pipelines.push({
      fromNodeId: operation.from,
      toNodeId: operation.to,
      details: {
        topic: topicName,
      },
    });

    this.saveNodesData(data);

    // 告诉from节点成为该topic的生产者
    await this.producer.send({
      topic: `node ${operation.from}`,
      messages: [
        {
          value: JSON.stringify({ action: "becomeProducer", topic: topicName }),
        },
      ],
    });

    // 告诉to节点成为该topic的消费者
    await this.producer.send({
      topic: `node ${operation.to}`,
      messages: [
        {
          value: JSON.stringify({ action: "becomeConsumer", topic: topicName }),
        },
      ],
    });

    console.log(
      `***Establishing pipes between ${operation.from} and node ${operation.to}`,
    );
  }

  //处理初始化
  private async handleInitiationAction(info: any): Promise<void> {
    await this.producer.send({
      topic: `register ${info.nodeId}`,
      messages: [
        {
          value: JSON.stringify({ info }),
        },
      ],
    });
    this.updateNodeStatus(info.nodeId, NodeStatus.Starting);
    console.log(
      `***(from manager)sending initiate message to Register ${info.nodeId} with type ${info.type}`,
    );
  }

  //处理节点配置
  private handleConfigureAction(info: any): void {
    //
    console.log(
      `***Configuring node ${info.nodeId} with config: ${JSON.stringify(info.config)}`,
    );
  }

  //处理来register的信息或者节点注册信息
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
      const node = data.nodes.find((n) => n.nodeId === info.nodeId);
      node.status = NodeStatus.Idle;
      this.saveNodesData(data);

      this.nodes.set(info.nodeId, info);
    } else {
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
      data.nodes.push({
        nodeId: info.nodeId,
        nodeType: "unknown",
        status: NodeStatus.Starting,
      });
      this.saveNodesData(data);
      console.log(
        `***(from manager)Register apply for registration: ${info.nodeId}, type: ${info.type}`,
      );
    }
  }

  async removeNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      await node.disconnect(); // 假设节点的disconnect方法会处理所有清理逻辑
      this.nodes.delete(nodeId);
    }
  }

  loadNodesInfo() {
    if (fs.existsSync(this.nodesFilePath)) {
      const data = fs.readFileSync(this.nodesFilePath, "utf8");
      const nodes = JSON.parse(data).nodes;
      console.log(nodes);
      nodes.forEach((node) => {
        this.nodes.set(node.nodeId, node);
      });
      console.log("Loaded nodes info from file.");
    }
  }

  private updateNodeStatus(nodeId: string, status: NodeStatus): void {
    const data = this.loadNodesData();
    const node = data.nodes.find((n) => n.nodeId === nodeId);
    if (node) {
      node.status = status;
      this.saveNodesData(data);
      console.log(`Status of node ${nodeId} updated to ${status}.`);
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
    await consumer.subscribe({ topic: Topics.heartbeatTopic, fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ message }) => {
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
        // 如果超过60秒没有收到心跳，认为节点失联
        this.updateNodeStatus(nodeId, NodeStatus.Error);
        console.log(`***Node ${nodeId} is not responding.`);
      }
    }
  }
}

export default NodeManager;
