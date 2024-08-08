const CryptoJS = require("crypto-js");
const WebSocket = require("ws");
const fs = require("fs");
const log = require("log4node");
const Server = require("socket.io");

function getWord(io,fileName) {


  // 获取当前时间戳
  let ts = parseInt(new Date().getTime() / 1000);

  let wssUrl =
    config.hostUrl +
    "?appid=" +
    config.appid +
    "&ts=" +
    ts +
    "&signa=" +
    getSigna(ts);
  let ws = new WebSocket(wssUrl);

  // 连接建立完毕，读取数据进行识别
  ws.on("open", (event) => {
    log.info(event);
    log.info("websocket connect!");
  });

  // 得到识别结果后进行处理，仅供参考，具体业务具体对待
  let rtasrResult = [];
  ws.on("message", (data, err) => {
    if (err) {
      log.info(`err:${err}`);
      return;
    }
    let res = JSON.parse(data);
    switch (res.action) {
      case "error":
        log.info(`error code:${res.code} desc:${res.desc}`);
        break;
      // 连接建立
      case "started":
        log.info("started!");
        log.info("sid is:" + res.sid);
        // 开始读取文件进行传输
        var readerStream = fs.createReadStream(config.file, {
          highWaterMark: config.highWaterMark,
        });
        readerStream.on("data", function (chunk) {
          ws.send(chunk);
        });
        readerStream.on("end", function () {
          // 最终帧发送结束
          ws.send('{"end": true}');
        });
        break;
      case "result": {
        let data = JSON.parse(res.data);
        rtasrResult[data.seg_id] = data;
        // 把转写结果解析为句子
        if (data.cn.st.type == 0) {
          rtasrResult.forEach((i) => {
            let str = "实时转写";
            str +=
              i.cn.st.type == 0 ? "【最终】识别结果：" : "【中间】识别结果：";
            i.cn.st.rt.forEach((j) => {
              j.ws.forEach((k) => {
                k.cw.forEach((l) => {
                  str += l.w;
                });
              });
            });
            io.emit("stt", str);
            log.info(str);
          });
        }
        break;
      }
    }
  });

  // 资源释放
  ws.on("close", () => {
    log.info("connect close!");
  });

  // 建连错误
  ws.on("error", (err) => {
    log.error("websocket connect err: " + err);
  });
}

const config = {
  hostUrl: "wss://rtasr.xfyun.cn/v1/ws",
  appid: "be0d9960",
  apiKey: "08b81221ce3092ba30e25f2dd0b90e5e",
  file: "./test_1.pcm",
  highWaterMark: 1280,
};

// 获取当前时间戳
// let ts = parseInt(new Date().getTime() / 1000);

// let wssUrl =
//   config.hostUrl +
//   "?appid=" +
//   config.appid +
//   "&ts=" +
//   ts +
//   "&signa=" +
//   getSigna(ts);
// let ws = new WebSocket(wssUrl);

// // 连接建立完毕，读取数据进行识别
// ws.on("open", (event) => {
//   log.info(event);
//   log.info("websocket connect!");
// });

// // 得到识别结果后进行处理，仅供参考，具体业务具体对待
// let rtasrResult = [];
// ws.on("message", (data, err) => {
//   if (err) {
//     log.info(`err:${err}`);
//     return;
//   }
//   let res = JSON.parse(data);
//   switch (res.action) {
//     case "error":
//       log.info(`error code:${res.code} desc:${res.desc}`);
//       break;
//     // 连接建立
//     case "started":
//       log.info("started!");
//       log.info("sid is:" + res.sid);
//       // 开始读取文件进行传输
//       var readerStream = fs.createReadStream(config.file, {
//         highWaterMark: config.highWaterMark,
//       });
//       readerStream.on("data", function (chunk) {
//         ws.send(chunk);
//       });
//       readerStream.on("end", function () {
//         // 最终帧发送结束
//         ws.send('{"end": true}');
//       });
//       break;
//     case "result": {
//       let data = JSON.parse(res.data);
//       rtasrResult[data.seg_id] = data;
//       // 把转写结果解析为句子
//       if (data.cn.st.type == 0) {
//         rtasrResult.forEach((i) => {
//           let str = "实时转写";
//           str +=
//             i.cn.st.type == 0 ? "【最终】识别结果：" : "【中间】识别结果：";
//           i.cn.st.rt.forEach((j) => {
//             j.ws.forEach((k) => {
//               k.cw.forEach((l) => {
//                 str += l.w;
//               });
//             });
//           });
//           log.info(str);
//         });
//       }
//       break;
//     }
//   }
// });

// // 资源释放
// ws.on("close", () => {
//   log.info("connect close!");
// });

// // 建连错误
// ws.on("error", (err) => {
//   log.error("websocket connect err: " + err);
// });

// 鉴权签名
function getSigna(ts) {
  let md5 = CryptoJS.MD5(config.appid + ts).toString();
  let sha1 = CryptoJS.HmacSHA1(md5, config.apiKey);
  let base64 = CryptoJS.enc.Base64.stringify(sha1);
  return encodeURIComponent(base64);
}

module.exports = { config, getSigna,  getWord };
