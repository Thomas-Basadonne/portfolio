// Review-only replay of #18's 25-second film. No teardown-kit runtime in the product.
import { smoother } from "../../src/experience/tb001/pose";
export const CYCLE = [[0, 0], [2.6, 0.2], [5.8, 0.45], [9.6, 0.75], [12.6, 1], [22, 1], [24.6, 0]] as const;
export const EXPLODE = [[13.8, 0], [17.2, 1], [19.8, 1], [22, 0]] as const;
const CAM = [[0, [32, 12, 5.6]], [5.8, [18, 9, 6]], [9.6, [-10, 14, 6.6]], [12.6, [-18, 12, 6.9]], [13.8, [-18, 13, 7.3]], [16.4, [-58, 22, 11.2]], [19.8, [-58, 22, 11.2]], [22.4, [10, 10, 7]], [25, [32, 12, 5.6]]] as const;

export function keyed(keys: ReadonlyArray<readonly [number, number]>, time: number) {
  if (time <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
    if (time <= t1) return v0 + (v1 - v0) * smoother((time - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
}
export function filmAt(time: number) {
  const az = keyed(CAM.map(([t, v]) => [t, v[0]]), time) * Math.PI / 180;
  const el = keyed(CAM.map(([t, v]) => [t, v[1]]), time) * Math.PI / 180;
  const distance = keyed(CAM.map(([t, v]) => [t, v[2]]), time);
  return {
    cycle: keyed(CYCLE, time), explode: keyed(EXPLODE, time),
    camera: [distance * Math.cos(el) * Math.sin(az), distance * Math.sin(el), distance * Math.cos(el) * Math.cos(az)] as [number, number, number],
  };
}
