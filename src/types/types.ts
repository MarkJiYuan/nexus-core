import { Kafka, Producer, Consumer } from 'kafkajs';

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
