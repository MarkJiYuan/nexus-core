import { Kafka, Producer, Consumer } from 'kafkajs';

const registrationTopic = "node-registration";
const heartbeatTopic = "node-heartbeat";
const managerTopic = "node-management";

export interface NodeConfig {
  type: string;
  nodeId: string;
}
export interface ConnectionConfig {
  from: string;
  to: string;
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
  receiveMessage(messageHandler: (message: string) => Promise<void> | void): Promise<void>;
  disconnect(): Promise<void>;
}

export {registrationTopic, heartbeatTopic, managerTopic}