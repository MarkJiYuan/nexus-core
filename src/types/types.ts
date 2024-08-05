import { Kafka, Producer, Consumer } from "kafkajs";

export enum Topics {
  registrationTopic = "node-registration",
  heartbeatTopic = "node-heartbeat",
  managerTopic = "node-management",
  configTopic = "node-config",
}

export enum Actions {
  Initiate = "initiate",
  Connect = "connect",
  Configure = "configure",
  UpdateStatus = "updateStatus",
  Heartbeat = "heartbeat",
  BecomeProducer = "becomeProducer",
  BecomeConsumer = "becomeConsumer",
}

export enum NodeType {
  ComputeNode = "ComputeNode",
  DataNode = "DataNode",
  OrganizationNode = "OrganizationNode",
  StorageNode = "StorageNode",
  Register = "Register",
}

export enum NodeStatus {
  Starting = "starting",
  Stopping = "stopping",
  Working = "working",
  Idle = "idle",
  Error = "error",
}

export enum SendingMode {
  Polling = "polling",
  EventDriven = "eventDriven",
}

export enum OrganizeMode {
  Periodic = "periodic",
  EventDriven = "eventDriven",
}

export enum StorageMode {
  File = "file",
  Database = "database",
}

export interface StorageSettings {
  storageType: "file" | "database";
  fileConfig?: {
    path: string;
  };
  dbConfig?: {
   tableName: string; 
  };
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

export interface PipelineDetail {
  topic: string;
}

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
