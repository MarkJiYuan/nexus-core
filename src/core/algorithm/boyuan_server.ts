import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { writeFileSync } from "fs";
import { getToken } from "./getTtsToken";
import { getWord } from "./stt.js";
import { Kafka } from "kafkajs";
import {
  fetchAllIncidents,
  fetchSolvedIncidents,
  updateIncidentReport,
  insertIncidentReport,
  fetchToSolveIncidents,
} from "../../utils/pg/psql";

const KAFKA_HOST = "localhost:9092"; // 替换为你的Kafka地址
const kafka = new Kafka({ brokers: [KAFKA_HOST] });
const consumer = kafka.consumer({ groupId: "opc-consumer" });

// 定义允许的来源
const allowedOrigins = [
  "https://192.168.50.200:20254",
  "https://localhost:20254",
];

// 创建一个Express应用
const app = express();

// 使用cors中间件
app.use(
  cors({
    origin: (origin, callback) => {
      // 允许本地开发时的无来源请求
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

// 创建HTTP服务器
const server = http.createServer(app);
// 创建Socket.IO服务器
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.use(express.json()); // 用于解析JSON格式的请求体

// 添加GET路由来处理报告请求
app.get("/api/all-reports", async (req, res) => {
  console.log("req:", req.complete);
  try {
    const reports = await fetchAllIncidents();
    res.json(reports); // 将报告作为JSON返回
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    res.status(500).send("Unable to fetch reports");
  }
});
app.get("/api/solved-reports", async (req, res) => {
  console.log("req:", req.complete);
  try {
    const reports = await fetchSolvedIncidents();
    res.json(reports); // 将报告作为JSON返回
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    res.status(500).send("Unable to fetch reports");
  }
});
app.get("/api/tosolve-reports", async (req, res) => {
  console.log("req:", req.complete);
  try {
    const reports = await fetchToSolveIncidents();
    res.json(reports); // 将报告作为JSON返回
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    res.status(500).send("Unable to fetch reports");
  }
});

app.listen(3001, () => {
  console.log("Server is running on http://localhost:3001");
});

async function runConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: "new_incident", fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value.toString());
      io.emit("new_incident", data);
    },
  });
}

runConsumer();

// 当有客户端连接时
io.on("connection", async (socket) => {
  let tokenData = await getToken();
  let token = tokenData.token;
  let expiration = tokenData.expires_at * 1000;

  console.log("A user connected");
  io.emit("message", "Welcome 250");

  // 监听客户端发送的消息
  socket.on("message", (msg) => {
    console.log("Message received: " + msg);

    // 向所有客户端广播消息
    io.emit("message", msg);
  });

  socket.on("saveToDb", async (data: IncidentReport) => {
    console.log("save to db:", data);
    await insertIncidentReport(data);
  });

  socket.on("afterVerifyScore", async (data: IncidentReport) => {
    console.log("afterVerifyScore and save to db:", data);
    await updateIncidentReport(data);
  });

  // 监听客户端发送的音频数据
  socket.on("audio", (audioBuffer) => {
    console.log("Audio received");
    const fileName = `input.pcm`;
    writeFileSync(fileName, Buffer.from(audioBuffer));
    console.log(`Audio saved as ${fileName}`);
    getWord(io, fileName);
  });

  //监听tts信息
  socket.on("tts", async (msg) => {
    const currentTime = new Date().getTime();
    if (!token || currentTime >= expiration) {
      token = await getToken(); // Refresh the token
    }
    // console.log("TTS received: " + msg);
    generateTTS(msg, token);
  });

  // 当客户端断开连接时
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// 监听端口3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

import axios from "axios";
import { IncidentReport } from "./event_process";

// API URL and credentials
const url = "https://sami.bytedance.com/api/v1/invoke";
const appkey = "VxylhBwyDv";

// TTS configuration constants
const speaker = "zh_female_qingxin";
const format = "wav";
const sampleRate = 24000;

export default async function generateTTS(text: string, token: string) {
  const audioConfig = {
    format: format,
    sample_rate: sampleRate,
  };

  const payload = {
    speaker: speaker,
    text: text,
    audio_config: audioConfig,
  };

  const body = {
    appkey: appkey,
    token: token,
    namespace: "TTS",
    payload: JSON.stringify(payload),
  };

  // HTTP headers
  const config = {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  };

  async function sendRequest(url, body, config) {
    try {
      let response = await axios.post(url, body, config);
      // Process successful response
      if (response.status === 200) {
        const resultObj = response.data;
        const statusCode = resultObj.status_code;
        if (statusCode === 20000000) {
          const audioBase64 = resultObj.data;
          io.emit("tts", audioBase64);
        }
      } else {
        console.log("HTTP Error:", response.status);
        console.log("Response Body:", response.data);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log("Unauthorized: Please check your token or credentials.");
        token = await getToken();
      } else {
        console.error("Request failed:", error);
      }
    }
  }

  await sendRequest(url, body, config);
}

export { io };
