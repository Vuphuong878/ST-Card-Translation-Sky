import { defineConfig } from 'vitest/config';

// Test lõi Dịch Card (app gốc). CHỈ quét test trong src/ — KHÔNG đụng tới tao-card/preset-tool/
// mod-card (mỗi tool con có runner riêng). environment 'node' đủ dùng: các hàm test là hàm thuần,
// chuỗi imports không chạm localStorage/window/DOMParser lúc import (đã kiểm).
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
