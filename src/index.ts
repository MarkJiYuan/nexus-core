import { toFixed } from "./utils/format";

async function main() {
  console.log(1);

  const a = 7.2342 * 10 ** 28;
  console.log(a);
  console.log(toFixed(a, 20));
}

if (require.main === module) {
  main();
}
