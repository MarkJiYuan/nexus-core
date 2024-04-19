import BasicNode from "./node";
import { Kafka } from "kafkajs";
import { Register } from "./register";
import { SendingMode } from "../types/types";
import { NodeType } from "../types/types";

export default class DataNode extends BasicNode {
  constructor(
    register: Register,
    nodeSetting: { sendingMode: String; pollingInterval?: number },
  ) {
    super(register);

    this.init().catch((err) => console.error("Initialization error:", err));
    if (nodeSetting.sendingMode === SendingMode.Polling) {
      //轮询式
      this.startPolling(nodeSetting.pollingInterval);
    } else if (nodeSetting.sendingMode === SendingMode.EventDriven) {
      //事件驱动式
      this.eventDriven();
    }
  }

  private async init(): Promise<void> {
    await this.idConsumer.subscribe({
      topic: this.listenTopic,
      fromBeginning: true,
    });

    await this.idConsumer.run({
      eachMessage: async ({ message }) => {
        const { action, topic: targetTopic } = JSON.parse(
          message.value.toString(),
        );
        console.log(`***Received message: ${action} ${targetTopic}`);
        if (action === "becomeProducer") {
          await this.setProducer(targetTopic);
        } else if (action === "becomeConsumer") {
          await this.setConsumer(targetTopic);
        }

        await this.producer.connect();
        await this.sendRegistrationInfo(NodeType.DataNode);
        this.startHeartbeat(NodeType.DataNode);
        this.sendPeriodicMessages();
      },
    });
  }

  private fetchData(): any {
    // 模拟传感器数据
    return {
      algorithmName: "sum",
      data: [1, 2, 3, 4, 5],
    };
  }

  private async eventDriven(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        await this.sendMessage(message.value.toString());
      },
    });
  }

  startPolling(interval: number): void {
    setInterval(async () => {
      const sensorData = this.fetchData();
      await this.sendMessage(JSON.stringify(sensorData));
    }, interval);
  }

  sendPeriodicMessages(): void {
    setInterval(async () => {
      const message = {
        algorithmName: "sum",
        data: [1, 2, 3, 4, 5],
      };
      await this.sendMessage(JSON.stringify(message));
    }, 5000);
  }

  // 特定的数据处理逻辑
  async handleData(message: string): Promise<void> {
    console.log(`Processing message in DataNode ${this.nodeId}: ${message}`);
    // 实现数据处理逻辑，如收集、转发等
  }
}
