import { BigNumber } from "bignumber.js";

export function toFixed(num: number, decimal: number) {
  const bn = new BigNumber(num);
  return bn.toFixed(decimal);
}