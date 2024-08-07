import BaseNode from "./base";
import { Kafka } from "kafkajs";
import AlgorithmLibrary from "../algorithm/algorithmLibrary";
import { Register } from "../register";
import { NodeType, Actions } from "../../types/types";

export default class ComputeNode extends BaseNode {
  private algorithmLibrary = new AlgorithmLibrary();
  private algorithmName: string;

  constructor(register: Register) {
    super(register);
    // this.algorithmName = nodeSetting.algorithm;
    this.init().catch((err) => console.error("Initialization error:", err));
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
    //       await this.handleCompute();
    //     }
    //   },
    // });
  }

  async handleCompute(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const { data } = JSON.parse(message.value.toString());
        const result = this.algorithmLibrary.execute(this.algorithmName, data);
        
        if (result !== null) {
          if (this.sendTopic === undefined) return;
          console.log(result)
          this.sendMessage(result + "");
        }
      },
    });
  }
}
