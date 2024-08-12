import { timeout } from "../utils/time";
import { createLogger } from "../utils/log";


async function main() {
  const logger = createLogger({ level: "debug" });

  logger.debug("Hello");

  logger.info("hi");

  try {
    throw new Error('asds');
  } catch (error) {
    logger.error(error);
  }

}

if (require.main === module) {
  main();
}