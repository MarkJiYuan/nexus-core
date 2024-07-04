import BasicNode from "./node";
import { Kafka } from "kafkajs";
import { Register } from "./register";
import { Actions, SendingMode } from "../types/types";
import { NodeType } from "../types/types";

export default class DataNode extends BasicNode {
  constructor(
    register: Register,
    nodeSetting: {
      sendingMode: String;
      pollingInterval?: number;
      pollingConfig?: any;
    },
  ) {
    super(register);
    this.init().catch((err) => console.error("Initialization error:", err));
    if (nodeSetting.sendingMode === SendingMode.Polling) {
      //轮询式
      this.startPolling(nodeSetting.pollingInterval, nodeSetting.pollingConfig);
    } else if (nodeSetting.sendingMode === SendingMode.EventDriven) {
      //事件驱动式
      this.eventDriven();
    }
  }

  private async init(): Promise<void> {
    await this.sendRegistrationInfo(NodeType.DataNode);
    this.startHeartbeat(NodeType.DataNode);
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
        if (action === Actions.BecomeProducer) {
          await this.setProducer(targetTopic);
        } else if (action === Actions.BecomeConsumer) {
          await this.setConsumer(targetTopic);
        }

        await this.producer.connect();
      },
    });
  }

  private async fetchData(sheetName: string, url: string): Promise<any> {

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: "YUSDETXGC3325",
        },
      });

      if (!response.ok) {
        throw new Error("Network response was not ok " + response.statusText);
      }
      const text = await response.text();
      const data = [JSON.parse(text).data];

       return {sheetName:sheetName,data: data};
    } catch (error) {
      console.error(
        "There has been a problem with your fetch operation:",
        error,
      );
      return { data: [] }; // 返回一个默认值，防止出现未定义的情况
    }
  }

  private async eventDriven(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        await this.sendMessage(message.value.toString());
      },
    });
  }

  startPolling(
    interval: number,
    pollingConfig: {
      symbol: string;
      period: string;
      pidx: number;
      psize: number;
      withlast: number;
    },
  ): void {
    const { symbol, period, pidx, psize, withlast } = pollingConfig;
    const sheetName = `kline_${symbol}_${pidx}${period}`
    const url = `http://ht.yufenghy.cn:9009/hq/api/kline/page?symbol=${symbol}&period=${period}&pidx=${pidx}&psize=${psize}&withlast=${withlast}`;
    setInterval(async () => {
      const sensorData = await this.fetchData(sheetName, url);
      await this.sendMessage(JSON.stringify(sensorData));
    }, interval);
  }

  // sendPeriodicMessages(): void {
  //   setInterval(async () => {
  //     const message = {
  //       algorithmName: "sum",
  //       data: [1, 2, 3, 4, 5],
  //     };
  //     console.log(
  //       `Sending message from DataNode ${this.nodeId}: ${JSON.stringify(message)}`,
  //     );
  //     await this.sendMessage(JSON.stringify(message));
  //   }, 5000);
  // }
}
