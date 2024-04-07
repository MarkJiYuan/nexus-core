import { Kafka, Producer, Consumer } from 'kafkajs';

const registrationTopic = "node-registration";
const heartbeatTopic = "node-heartbeat";
const managerTopic = "node-management";

export interface NodeConfig {
  type: string;
  nodeId: number;
}
export interface ConnectionConfig {
  from: number;
  to: number;
}

export interface Node {
  nodeId: number;
  kafka: Kafka;
  producer: Producer;
  consumer: Consumer;
  sendTopic: string;
  receiveTopic: string;
  connect(): Promise<void>;
  sendMessage(message: string): Promise<void>;
  receiveMessage(messageHandler: (message: string) => Promise<void> | void): Promise<void>;
  disconnect(): Promise<void>;
}

export {registrationTopic, heartbeatTopic, managerTopic}