let seed_time: number;

export const initAwaitSeedTime = (min: number, max: number): number => {
  seed_time = Math.round(min + (max - min) * Math.random());
  return seed_time;
};

export const randomFromTo = (from: number, to: number, digit = 0): number => {
  let result = from + (to - from) * Math.random();
  result = parseFloat(result.toFixed(digit));
  return result;
};

export const getAwaitTime = (delay = 0): number => {
  return seed_time + delay;
};

export const randomRange = (weight: number): number => {
  return 1 + weight - 2 * weight * Math.random();
};

export const randomItem = <T>(arr: T[]): T | undefined => {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
};

export const linearRandomItem = <T>(arr: T[]): T | null => {
  if (arr.length === 0) {
    return null; // 如果数组为空，则返回 null
  }

  // 计算总面积
  const totalArea = ((arr.length + 1) * arr.length) / 2;

  // 生成随机数 y
  const y = Math.random() * totalArea;

  // 通过随机数 y 计算它在总面积中的相对位置
  let currentArea = 0;
  let index = 0;

  // 循环遍历数组，计算当前累积面积，直到超过随机数 y 的相对位置
  for (let i = 1; i <= arr.length; i++) {
    currentArea += i;
    if (currentArea >= y) {
      // 如果当前累积面积大于等于相对位置，说明随机数 y 落在当前索引 i 上
      index = i - 1;
      break;
    }
  }

  return arr[arr.length - index - 1];
};
