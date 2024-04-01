// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config({
  path: process.env.ENV_PATH,
});

const ENV_KEY_MAP = {};

export const getEnvConfig = (key: string): string => {
  return ENV_KEY_MAP[key] ? ENV_KEY_MAP[key] : process.env[key];
};
