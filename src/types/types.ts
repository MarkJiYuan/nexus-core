import { Kafka, Producer, Consumer } from "kafkajs";

const registrationTopic = "node-registration";
const heartbeatTopic = "node-heartbeat";
const managerTopic = "node-management";

export enum NodeStatus {
  Starting = "starting",
  Stopping = "stopping",
  Working = "working",
  Idle = "idle",
  Error = "error",
}

export enum sendingMode {
  Polling = "polling",
  EventDriven = "eventDriven"
}

export enum organizeMode {
  Periodic = "periodic",
  EventDriven = "eventdriven"
}

export interface NodeConfig {
  type: string;
  nodeId: string;
}

export interface NodeInfo {
  nodeId: string;
  nodeType: string;
  status: NodeStatus;
  nodeSetting?: any; // Node
}

export interface PipelineDetail {}

export interface PipelineInfo {
  fromNodeId: string;
  toNodeId: string;
  details: PipelineDetail;
}

export interface SystemState {
  nodes: NodeInfo[];
  pipelines: PipelineInfo[];
}

export interface StorageNodeConfig {
  storageType: "file" | "database";
  fileConfig?: {
    path: string;
  };
  databaseConfig?: {
    type: string;
    connectionString: string;
    databaseName: string;
    tableName: string;
  };
}

export interface Node {
  nodeId: string;
  kafka: Kafka;
  producer: Producer;
  consumer: Consumer;
  sendTopic: string;
  receiveTopic: string;
  connect(): Promise<void>;
  sendMessage(message: string): Promise<void>;
  receiveMessage(
    messageHandler: (message: string) => Promise<void> | void,
  ): Promise<void>;
  disconnect(): Promise<void>;
}

export { registrationTopic, heartbeatTopic, managerTopic };
