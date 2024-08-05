import BaseNode from "./base";
import { Kafka } from "kafkajs";
import { Register } from "../register";
import { Actions, SendingMode } from "../../types/types";
import { NodeType } from "../../types/types";
import { AuthorizationKey } from "../../types/global";

export default class DataNode extends BaseNode {
  constructor(
    register: Register,
    // nodeSetting: {
    //   sendingMode: String;
    //   pollingInterval?: number;
    //   pollingConfig?: any;
    // },
  ) {
    super(register);
    this.init().catch((err) => console.error("Initialization error:", err));
    // if (nodeSetting.sendingMode === SendingMode.Polling) {
    //   //轮询式
    //   this.startPolling(nodeSetting.pollingInterval, nodeSetting.pollingConfig);
    // } else if (nodeSetting.sendingMode === SendingMode.EventDriven) {
    //   //事件驱动式
    //   this.eventDriven();
    // }
  }

  private async init(): Promise<void> {

    await this.producer.connect();

    // await this.idConsumer.subscribe({
    //   topic: this.listenTopic,
    //   fromBeginning: true,
    // });

    // await this.idConsumer.run({
    //   eachMessage: async ({ message }) => {
    //     const { action, topic: targetTopic } = JSON.parse(
    //       message.value.toString(),
    //     );
    //     console.log(`***Received message: ${action} ${targetTopic}`);
    //     if (action === Actions.BecomeProducer) {
    //       await this.setProducer(targetTopic);
    //     } else if (action === Actions.BecomeConsumer) {
    //       await this.setConsumer(targetTopic);
    //     }

    //     await this.producer.connect();
    //   },
    // });
  }

  private async fetchData(tableName: string, url: string): Promise<any> {
    // try {
    //   const response = await fetch(url, {
    //     headers: {
    //       Authorization: AuthorizationKey,
    //     },
    //   });

    //   if (!response.ok) {
    //     throw new Error("Network response was not ok " + response.statusText);
    //   }
    //   const text = await response.text();

    //   const json = JSON.parse(text);
    //   const dataString = json.data;

    //   return { tableName: tableName, data: dataString };
    // } catch (error) {
    //   console.error(
    //     "There has been a problem with your fetch operation:",
    //     error,
    //   );
    //   return { data: [] };
    // }
    tableName="fdas";
    url="fdsaf";
    console.log(tableName,url);
    return [2,2,2,2]
  }

  public async eventDriven(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        await this.sendMessage(message.value.toString());
      },
    });
  }

  public startPolling(
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
    const tableName = `kline_${symbol}_${period}`;
    const url = `http://ht.yufenghy.cn:9009/hq/api/kline/page?symbol=${symbol}&period=${period}&pidx=${pidx}&psize=${psize}&withlast=${withlast}`;
    setInterval(async () => {
      const sensorData = await this.fetchData(tableName, url);
      await this.sendMessage(JSON.stringify(sensorData));
    }, interval);
  }

}
