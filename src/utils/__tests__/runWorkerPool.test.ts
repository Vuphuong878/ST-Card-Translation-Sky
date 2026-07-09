import { describe, it, expect } from 'vitest';
import { runWorkerPool } from '../runWorkerPool';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('runWorkerPool — pool worker liên tục', () => {
  it('chạy MỖI việc đúng 1 lần, không sót không trùng', async () => {
    const seen: number[] = [];
    const { cancelled } = await runWorkerPool({
      total: 50, concurrency: 8,
      runOne: async (i) => { await sleep(1); seen.push(i); },
    });
    expect(cancelled).toBe(false);
    expect(seen.length).toBe(50);
    expect([...seen].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i));
    expect(new Set(seen).size).toBe(50); // không trùng
  });

  it('KHÔNG bao giờ vượt concurrency việc chạy đồng thời', async () => {
    let active = 0; let peak = 0;
    await runWorkerPool({
      total: 40, concurrency: 5,
      runOne: async () => {
        active++; peak = Math.max(peak, active);
        await sleep(3);
        active--;
      },
    });
    expect(peak).toBeLessThanOrEqual(5);
    expect(peak).toBeGreaterThan(1); // thật sự có chạy song song
  });

  it('STRAGGLER: 1 việc chậm KHÔNG chặn các việc khác (điểm cốt lõi)', async () => {
    // idx 0 ngủ RẤT lâu; các việc còn lại nhanh. Pool phải KÉO TIẾP, không đợi idx 0.
    const doneOrder: number[] = [];
    await runWorkerPool({
      total: 20, concurrency: 4,
      runOne: async (i) => {
        await sleep(i === 0 ? 300 : 1);
        doneOrder.push(i);
      },
    });

    // CHỨNG MINH không barrier: PHẦN LỚN việc nhanh hoàn tất TRƯỚC việc chậm (idx 0).
    // Nếu còn rào chắn theo đợt, idx 0 (đợt đầu) sẽ chặn → các việc sau không thể xong trước.
    expect(doneOrder.indexOf(0)).toBeGreaterThanOrEqual(15);
    expect(doneOrder.length).toBe(20);
    expect(new Set(doneOrder).size).toBe(20);
  });

  it('shouldStop bật giữa chừng → ngừng kéo việc mới, trả cancelled=true', async () => {
    let processed = 0;
    let stop = false;
    const { cancelled } = await runWorkerPool({
      total: 100, concurrency: 4,
      shouldStop: () => stop,
      runOne: async () => {
        await sleep(1);
        processed++;
        if (processed >= 12) stop = true; // sau ~12 việc thì yêu cầu dừng
      },
    });
    expect(cancelled).toBe(true);
    expect(processed).toBeLessThan(100);      // KHÔNG chạy hết
    expect(processed).toBeGreaterThanOrEqual(12);
  });

  it('waitIfPaused trả true (bị hủy khi đang chờ) → dừng, cancelled=true', async () => {
    let processed = 0;
    const { cancelled } = await runWorkerPool({
      total: 30, concurrency: 3,
      waitIfPaused: async () => processed >= 6, // sau 6 việc coi như bị hủy
      runOne: async () => { await sleep(1); processed++; },
    });
    expect(cancelled).toBe(true);
    expect(processed).toBeLessThan(30);
  });

  it('runOne ném "Cancelled" → dừng cả pool', async () => {
    let processed = 0;
    const { cancelled } = await runWorkerPool({
      total: 40, concurrency: 4,
      runOne: async (i) => {
        await sleep(1);
        processed++;
        if (i === 5) throw new Error('Cancelled');
      },
    });
    expect(cancelled).toBe(true);
    expect(processed).toBeLessThan(40);
  });

  it('lỗi thường của 1 việc KHÔNG giết pool (các việc khác vẫn xong)', async () => {
    const ok: number[] = [];
    const { cancelled } = await runWorkerPool({
      total: 20, concurrency: 4,
      runOne: async (i) => {
        await sleep(1);
        if (i % 5 === 0) throw new Error('lỗi lẻ ở việc ' + i); // lỗi thường, không phải Cancelled
        ok.push(i);
      },
    });
    expect(cancelled).toBe(false);
    expect(ok.length).toBe(16); // 20 - 4 việc lỗi (0,5,10,15)
  });

  it('total = 0 → không chạy gì, cancelled=false', async () => {
    let ran = false;
    const { cancelled } = await runWorkerPool({ total: 0, concurrency: 8, runOne: async () => { ran = true; } });
    expect(cancelled).toBe(false);
    expect(ran).toBe(false);
  });

  it('onSettled gọi đúng số lần các việc đã xong', async () => {
    let settled = 0;
    await runWorkerPool({
      total: 15, concurrency: 5,
      runOne: async () => { await sleep(1); },
      onSettled: () => { settled++; },
    });
    expect(settled).toBe(15);
  });
});
