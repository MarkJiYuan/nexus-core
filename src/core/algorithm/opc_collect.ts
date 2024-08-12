import fs from "fs";
import { Kafka } from "kafkajs";
import { OPCUAClient } from "node-opcua";
import path from "path";
import { createLogger } from "../../utils/log";
import { timeout } from "../../utils/time";


const OPC_SERVER_HOST = "opc.tcp://192.168.50.102:4840"; // 替换为你的OPC服务器地址
const KAFKA_HOST = "localhost:9092"; // 替换为你的Kafka地址

const logger = createLogger({ logFileName: "opc_collect" });

const nodeIds: string[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "node_ids.json"), "utf8"),
);

async function readMultipleNodes() {
  const client = OPCUAClient.create({ endpointMustExist: false });
  const kafka = new Kafka({ brokers: [KAFKA_HOST] });
  const producer = kafka.producer();

  await producer.connect();

  try {
    await client.connect(OPC_SERVER_HOST);
    const session = await client.createSession();

    const nodesToRead = nodeIds.map((nodeId) => ({ nodeId }));

    let last_data = {};

    while (true) {
      const now = new Date();

      // 只在整秒运行
      if (now.getMilliseconds() > 500) {
        await timeout(5);
        continue;
      }

      const dataValues = await session.read(nodesToRead);

      const data = {};
      dataValues.forEach((dataValue, index) => {
        const nodeId = nodeIds[index];
        const value = dataValue.value.value;

        if (value !== undefined && typeof value !== "boolean" && !Number.isNaN(value)) {
          data[nodeId] = value;
        } else {
          data[nodeId] = 0;
        }
      });

      const changing_nodes = {};
      for (const nodeId in last_data) {
        if (last_data[nodeId] !== data[nodeId]) {
          changing_nodes[nodeId] = data[nodeId];
        }
      }
      last_data = Object.assign({}, data);

      const message = {
        ts: now.toISOString(),
        data: data,
      };

      // console.log('changing_nodes', Object.keys(changing_nodes).length);
      // logger.info(JSON.stringify(Object.keys(changing_nodes)))
      logger.info(
        `Collect ts: ${now.toISOString()} data count: ${Object.keys(data).length}`,
      );
      await producer.send({
        topic: 'opc_raw',
        messages: [{ value: JSON.stringify(message) }]
      });
      await timeout(5000);
    }
  } catch (err) {
    logger.error(`Error: ${err.message}`);
  } finally {
    await producer.disconnect();
    await client.disconnect();
  }
}

if (require.main === module) {
  readMultipleNodes().catch((err) =>
    logger.error(`Unhandled Error: ${err.message}`),
  );
}
