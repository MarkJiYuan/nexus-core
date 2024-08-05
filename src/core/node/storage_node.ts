import BaseNode from "./base";
import { Kafka } from "kafkajs";
import { Register } from "../register";
import fs from "fs";
import { NodeType, Actions } from "../../types/types";
import { StorageMode, StorageSettings } from "../../types/types";
import PostgreSQLManager from "../../utils/pg/psql";

const dbManager = new PostgreSQLManager();

export default class StorageNode extends BaseNode {
  private storageSettings: StorageSettings;

  constructor(register: Register) {
    super(register);
    // this.storageSettings = nodeSetting;
    this.init().catch((err) => console.error("Initialization error:", err));
  }



  private async init(): Promise<void> {
    await this.producer.connect();
    // await this.sendRegistrationInfo(NodeType.StorageNode);
    // this.startHeartbeat(NodeType.StorageNode);

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
    //       this.handleStorage();
    //     }
    //   },
    // });
  }

  public setStorageSettings(storageSettings: StorageSettings): void {
    this.storageSettings = storageSettings;
  }

  async handleStorage(): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        this.messageCount++;
        const messageContent = message.value.toString();
        const parsedMessage = JSON.parse(messageContent);
        switch (this.storageSettings.storageType) {
          case StorageMode.File:
            const filePath =
              this.storageSettings.fileConfig?.path || "./defaultStorage.txt";
            fs.appendFile(filePath, messageContent + "\n", (err) => {
              if (err) {
                console.error("Error writing message to file:", err);
              } else {
                console.log(`Message stored to file: ${messageContent}`);
              }
            });
            break;
          case StorageMode.Database:
            const tableName = parsedMessage.tableName;
            const data = parsedMessage.data;
            await dbManager.ensureTableAndInsert(tableName, data);
            console.log(`Message stored to database table: ${tableName}`);
            break;
        }
      },
    });
  }
}
