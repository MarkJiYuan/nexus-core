import axios from "axios";
import { getToken } from "./getTtsToken.js";

// API URL and credentials
const url = "https://sami.bytedance.com/api/v1/invoke";
const appkey = "VxylhBwyDv";
let token =
  "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MjMxMzgxMTIsImlhdCI6MTcyMzA1MTcxMiwiaXNzIjoiU0FNSSBNZXRhIiwidmVyc2lvbiI6InZvbGMtYXV0aC12MSIsImFjY291bnRfaWQiOjIxMDE5MDcwNDcsImFjY291bnRfbmFtZSI6IjIxMDE5MDcwNDciLCJhcHBfaWQiOjczNjAsImFwcF9uYW1lIjoidHRzIiwiYXBwa2V5IjoiVnh5bGhCd3lEdiIsInNlcnZpY2UiOiJzYW1pIiwic291cmNlIjoiQWNjb3VudCIsInJlZ2lvbiI6ImNuLW5vcnRoLTEifQ.R6g5oC-TEJRZ6Itff6fl1ejJK1iEIcd-VO9iOauQDkKFQmB_S0lm_E95G_a1cJHGdV1z5sXX4XhJbXSVh-48vQ";

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

  // Sending HTTP request
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
