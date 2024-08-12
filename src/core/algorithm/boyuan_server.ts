import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { writeFileSync } from "fs";
import { getToken } from "./getTtsToken.js";
import { getWord } from "./stt.js";

// 定义允许的来源
const allowedOrigins = ["https://192.168.50.200:20254", "https://localhost:20254"];

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

// 当有客户端连接时
io.on("connection", (socket) => {
  console.log("A user connected");
  io.emit("message", "Welcome 250");

  // 监听客户端发送的消息
  socket.on("message", (msg) => {
    console.log("Message received: " + msg);

    // 向所有客户端广播消息
    io.emit("message", msg);
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
  socket.on("tts", (msg) => {
    console.log("TTS received: " + msg);
    generateTTS(msg);
  });

  socket.on("incidentReport", (msg) => {
    console.log("Incident report received: " + msg);
  })

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

// API URL and credentials
const url = "https://sami.bytedance.com/api/v1/invoke";
const appkey = "VxylhBwyDv";
let token =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MjMxMTM1OTAsImlhdCI6MTcyMzExMzU4OSwiaXNzIjoiU0FNSSBNZXRhIiwidmVyc2lvbiI6InZvbGMtYXV0aC12MSIsImFjY291bnRfaWQiOjIxMDE5MDcwNDcsImFjY291bnRfbmFtZSI6IjIxMDE5MDcwNDciLCJhcHBfaWQiOjczNjAsImFwcF9uYW1lIjoidHRzIiwiYXBwa2V5IjoiVnh5bGhCd3lEdiIsInNlcnZpY2UiOiJzYW1pIiwic291cmNlIjoiQWNjb3VudCIsInJlZ2lvbiI6ImNuLW5vcnRoLTEifQ.WMxSoTXnWcxOxrTQ8xm2-JdpJj2Dbkapqi93vc9MTq5Vh-IdC15KdFGsYxgQ638z6NDDzFZVQ4QHr3tx8EDJXg";

// TTS configuration constants
const speaker = "zh_female_qingxin";
const format = "wav";
const sampleRate = 24000;

export default function generateTTS(text: string) {
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

  axios
    .post(url, body, config)
    .then(async (response) => {
      if (response.data.status_code === 4020002) {
        console.log("Token expired, getting a new one...");
        token = await getToken();
        body.token = token; // Update the body with the new token
        response = await axios.post(url, body, config); // Retry the request with the new token
      }
      if (response.status === 200) {
        const resultObj = response.data;
        const statusCode = resultObj.status_code;
        if (statusCode === 20000000) {
          const audioBase64 = resultObj.data;
          console.log("TTS request successful");
          io.emit("tts", audioBase64);
        }
      } else {
        console.log("HTTP Error:", response.status);
        console.log("Response Body:", response.data);
      }
    })
    .catch((error) => {
      console.error("Request failed:", error);
    });
}

function playAudio(base64String) {
  const audioContext = new AudioContext();
  const audioSrc = `data:audio/wav;base64,${base64String}`;
  fetch(audioSrc)
    .then((response) => response.arrayBuffer())
    .then((buffer) => audioContext.decodeAudioData(buffer))
    .then((decodedAudio) => {
      const source = audioContext.createBufferSource();
      source.buffer = decodedAudio;
      source.connect(audioContext.destination);
      source.start(0);
    })
    .catch((error) => {
      console.error("Error playing audio:", error);
    });
}

// getToken();

// Example usage
// generateTTS('语音合成服务提供一定量的试用额度A1354，试用额度的用量、可使用范围、有效期等详情以控制台领取页面显示为准。试用额度在额度用尽、试用到期或服务开通为正式版后失效。');
