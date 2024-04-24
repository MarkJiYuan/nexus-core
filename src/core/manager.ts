import { Kafka, Consumer, Producer } from "kafkajs";
import {
  Topics,
  SystemState,
  NodeStatus,
  Actions,
  NodeType,
} from "../types/types";
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
    process.on("SIGINT", this.cleanupAndExit.bind(this));
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
          case Actions.Connect:
            // 节点间连接  即建立管道
            this.handleConnectAction(operation);
            break;
          case Actions.Configure:
            // 节点配置
            this.handleConfigureAction(operation);
            break;
          case Actions.Initiate:
            // 初始化
            this.handleInitiationAction(operation);
            break;
          case Actions.UpdateStatus:
            this.handleUpdateStatusAction(operation);
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
    const topicName = `from_${operation.from}_to_${operation.to}`;
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
      topic: `node_${operation.from}`,
      messages: [
        {
          value: JSON.stringify({ action: Actions.BecomeProducer, topic: topicName }),
        },
      ],
    });

    // 告诉to节点成为该topic的消费者
    await this.producer.send({
      topic: `node_${operation.to}`,
      messages: [
        {
          value: JSON.stringify({ action: Actions.BecomeConsumer, topic: topicName }),
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
      topic: `register_${info.nodeId}`,
      messages: [
        {
          value: JSON.stringify({ info }),
        },
      ],
    });
    this.updateNodeStatus(
      info.nodeId,
      NodeStatus.Starting,
      info.type,
      info.nodeSetting,
    );
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
  //处理节点状态更新
  private handleUpdateStatusAction(info: any): void {
    //
    this.updateNodeStatus(info.nodeId, info.status);
  }

  //处理来register的信息或者节点注册信息
  private handleNodeRegistration(info: {
    nodeId: string;
    nodeType: string;
    type: string;
    timestamp: string;
  }): void {
    //如果有nodeType，说明是具体节点注册信息
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
      //如果没有nodeType，说明是来自register的信息
      //存储为json
      const data = this.loadNodesData();
      const existingNodeIndex = data.nodes.findIndex(
        (node) => node.nodeId === info.nodeId,
      );
      //检验是否已经存在
      if (existingNodeIndex !== -1) {
        console.log(
          `***(from manager) Node(${info.nodeType}) ${info.nodeId} is already registered.`,
        );
        return;
      }
      data.nodes.push({
        nodeId: info.nodeId,
        nodeType: NodeType.Register,
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
    }
  }

  private updateNodeStatus(
    nodeId: string,
    status: NodeStatus,
    nodetype?: NodeType,
    nodeSetting?: any,
  ): void {
    const data = this.loadNodesData();
    const node = data.nodes.find((n) => n.nodeId === nodeId);
    if (node) {
      if (nodeSetting) {
        node.nodeSetting = nodeSetting;
      }
      if (nodetype) {
        node.nodeType = nodetype;
      }
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
    await consumer.subscribe({
      topic: Topics.heartbeatTopic,
      fromBeginning: true,
    });

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

  private async cleanupAndExit(): Promise<void> {
    const emptyState: SystemState = { nodes: [], pipelines: [] };
    this.saveNodesData(emptyState);
    process.exit(0);
  }
}

export default NodeManager;
