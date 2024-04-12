import { Kafka, Producer, Partitioners, logLevel } from "kafkajs";
import NodeManager from "./manager";
import DataNode from "./data_node";
import OrganizationNode from "./organize_node";
import ComputeNode from "./compute_node";
import { managerTopic } from "../types/types";
import { Register } from "./register";
import { time } from "console";

const kafka = new Kafka({
  clientId: "test-client",
  brokers: ["localhost:9092"], // 根据实际配置修改
  logCreator: () => {
    // 返回一个什么也不做的日志函数
    return () => {
      // 不执行任何操作
    };
  }
});

// const producer = kafka.producer({});
const nodeManager = new NodeManager(kafka);

const register1 = new Register(kafka);
const register2 = new Register(kafka);