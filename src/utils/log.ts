import winston from "winston";
import path from "path";
import "winston-daily-rotate-file";
import { timeout } from "./time";

const loggers: winston.Logger[] = [];
let beforeExitRegistered = false;

export interface LoggerOptions {
  logFileName?: string;
  logDir?: string;
  level?: "debug" | "info" | "warn" | "error";
  maxSize?: string;
  maxFiles?: string;
  consoleLevel?: string; // 新增参数，用于控制台输出级别
}

export function createLogger({
  logFileName = "app",
  logDir = null,
  level = "info",
  maxSize = "20m",
  maxFiles = "30d",
  consoleLevel = "error", // 默认控制台只输出error及更高等级的日志
}: LoggerOptions) {
  let logFilePath: string = "";
  if (!logDir) {
    logFilePath = path.join("logs", `${logFileName}.log`);
  } else {
    logFilePath = path.join(logDir, logFileName);
  }

  // 自定义格式化器，确保 JSON 字段顺序
  const logFormat = winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss.SSS",
    }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return JSON.stringify({ timestamp, level, message, stack });
    }),
  );

  // Create the logger
  const logger = winston.createLogger({
    level: level,
    format: logFormat,
    transports: [
      new winston.transports.DailyRotateFile({
        filename: logFilePath.replace(".log", "-%DATE%.log"), // Add date to the log file name
        datePattern: "YYYY-MM-DDTHH", // Rotate daily
        maxSize: maxSize, // Rotate when the file size exceeds this limit
        maxFiles: maxFiles, // Keep files for this number of days
        zippedArchive: false, // Compress the rotated files
      }),
      new winston.transports.Console({
        level: consoleLevel,
      }),
    ],
  });

  loggers.push(logger);

  // 确保只注册一次 beforeExit 事件处理程序
  if (!beforeExitRegistered) {
    beforeExitRegistered = true;

    process.on("beforeExit", () => {
      for (const logger of loggers) {
        logger.end();
      }
    });
  }

  return logger;
}
