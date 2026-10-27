import { optimized, quadratic, type Input } from './algorithms';

self.onmessage = (event: MessageEvent<Input>) => {
  try {
    const slow = quadratic(event.data, false);
    const fast = optimized(event.data, false);
    if (slow.cost !== fast.cost) throw Error('两种算法结果不一致');
    self.postMessage({ slow, fast });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
