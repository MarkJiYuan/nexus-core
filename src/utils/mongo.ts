import { MongoClient } from "mongodb";
import { getEnvConfig } from "../config";

async function main() {
  const url = getEnvConfig("MONGODB_URI");
  const client = new MongoClient(url);
  // Use connect method to connect to the server
  await client.connect();
  console.log("Connected successfully to server");
  const db_name = getEnvConfig("DB_NAME");
  const db = client.db(db_name);
  const collection = db.collection("blocks");

  const indexes = await collection.listIndexes().toArray();
  console.log(indexes);
  return;

  await collection.createIndex({ "a.b": 1 });
  const insertResult = await collection.insertMany([
    {
      a: {
        b: "3",
      },
    },
    {
      a: {
        b: "4",
      },
    },
    {
      a: {
        b: "5",
      },
    },
  ]);
  console.log(insertResult);

  // const records = await collection.find({}).toArray();
  // console.log(records);
  console.log("done");
  return "done.";
}

if (require.main === module) {
  main();
}
