import fs from "fs";
import path from "path";
import { Kafka } from "kafkajs";
import BasicNode from "./node";
import { NodeConfig, ConnectionConfig } from "src/types/types";
import ComputeNode from "./compute_node";
import StorageNode from "./storage_node";
import DataNode from "./data_node";
import OrganizationNode from "./organize_node";

export class NodeManager {
  private nodes: Map<number, BasicNode> = new Map();
  private lastHeartbeat: { [nodeId: number]: Date } = {}; //记录最后一次心跳的时间

  constructor(
    private kafka: Kafka,
    private configPath: string,
  ) {
    this.listenToHeartbeats();
    setInterval(() => {
      this.checkNodeStatus();
    }, 60000);
  }

  private async listenToHeartbeats() {
    const consumer = this.kafka.consumer({ groupId: "manager-group" });
    await consumer.connect();
    await consumer.subscribe({ topic: "node-management", fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ message }) => {
        const content = JSON.parse(message.value.toString());
        if (content.type === "heartbeat") {
          this.handleHeartbeat(content);
        }
      },
    });
  }

  private handleHeartbeat(info: any) {
    console.log(
      `Heartbeat received from node ${info.nodeId} at ${info.timestamp}`,
    );
    this.lastHeartbeat[info.nodeId] = new Date(info.timestamp);
  }

  async createNode(nodeConfig: NodeConfig): Promise<BasicNode | null> {
    let node: BasicNode | null = null;
    switch (nodeConfig.type) {
      case "OrganizationNode":
        node = new OrganizationNode(nodeConfig.nodeId, this.kafka);
        break;
      case "ComputeNode":
        node = new ComputeNode(nodeConfig.nodeId, this.kafka);
        break;
      case "StorageNode":
        node = new StorageNode(nodeConfig.nodeId, this.kafka);
        break;
      case "DataNode":
        node = new DataNode(nodeConfig.nodeId, this.kafka);
        break;
      default:
        console.error(`Unknown node type: ${nodeConfig.type}`);
        return null;
    }
    // 预设每个节点都需要执行的初始化操作，例如连接到Kafka
    await node.connect();
    // 根据节点类型进行更多特定的初始化操作...

    return node;
  }

  async addNode(nodeConfig: NodeConfig, connectTo?: number[]): Promise<void> {
    const node = await this.createNode(nodeConfig);
    this.nodes.set(nodeConfig.nodeId, node);

    if (connectTo && connectTo.length > 0) {
      for (const target of connectTo) {
        const targetNode = this.nodes.get(target);
        if (targetNode) {
          const topicName = `from-node-${nodeConfig.nodeId}-to-node-${target}`;
          await node.setProducer(topicName);
          await targetNode.setConsumer(topicName);
        }
      }
    }
  }

  async removeNode(nodeId: number): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      await node.disconnect(); // 假设节点的disconnect方法会处理所有清理逻辑
      this.nodes.delete(nodeId);

      // 可选：如果节点间有特定的连接关系需要处理，这里应该添加逻辑来解除这些连接
    }
  }

  // 依据配置文件创建节点并建立连接
  async loadConfigAndCreateNodes(): Promise<void> {
    const configFile = fs.readFileSync(
      path.resolve(__dirname, this.configPath),
      "utf8",
    );
    const config = JSON.parse(configFile);

    for (const nodeConfig of config.nodes as NodeConfig[]) {
      const node = await this.createNode(nodeConfig);
      this.nodes.set(nodeConfig.nodeId, node);
    }

    // 建立连接
    for (const connConfig of config.connections as ConnectionConfig[]) {
      const fromNode = this.nodes.get(connConfig.from);
      const toNode = this.nodes.get(connConfig.to);

      if (fromNode && toNode) {
        const topicName = `from-node-${connConfig.from}-to-node-${connConfig.to}`;
        await fromNode.setProducer(topicName);
        await toNode.setConsumer(topicName);
      }
    }
  }

  

  // 定期检查节点的心跳，看是否有节点失联
  checkNodeStatus() {
    const now = new Date();
    for (const nodeId in this.lastHeartbeat) {
      const lastHeartbeatTime = this.lastHeartbeat[nodeId];
      const diff = now.getTime() - lastHeartbeatTime.getTime();
      if (diff > 60000) {
        console.log(`Node ${nodeId} is not responding.`);
      }
    }
  }
}

export default NodeManager;
