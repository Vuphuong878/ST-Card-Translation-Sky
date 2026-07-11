import { describe, it, expect } from 'vitest';
import { detectResidualCjk, countCjk } from '../langDetect';

// Fixture rút từ bug thực tế (bugNeedFix/1): lorebook[25].content bị AI TRẢ LẠI NGUYÊN VĂN
// tiếng Trung (echo) nhưng field vẫn bị đánh dấu "DONE 104%". Guard phải bắt được ca này.
const ZH_SRC =
  '世界观档案:\n  辉耀星:\n    天体物理形态:\n      - 位于遥远星系的独立恒星系统\n' +
  '      - 星球地表由高纯度结晶矿物与液态能量湖泊构成，无常规岩石与碳基植被\n' +
  '      - 星球核心为巨大的稳定能量体，持续向地表与大气层辐射光与热\n' +
  '    社会结构:\n      - 由宇宙警卫队与四大统帅共同治理\n      - 母星光之国为文明中心';

const VI_GOOD =
  'Hồ sơ thế giới quan:\n  Huy Diệu Tinh:\n    Hình thái vật lý thiên thể:\n' +
  '      - Hệ sao độc lập nằm ở một thiên hà xa xôi\n' +
  '      - Bề mặt hành tinh cấu thành từ khoáng vật kết tinh độ tinh khiết cao và hồ năng lượng lỏng\n' +
  '      - Lõi hành tinh là thể năng lượng ổn định khổng lồ, liên tục bức xạ ánh sáng và nhiệt\n' +
  '    Cấu trúc xã hội:\n      - Do Đội Cảnh vệ Vũ trụ và Tứ đại Thống soái cùng quản trị';

describe('detectResidualCjk — chống "DONE giả" (echo nguồn tiếng Trung)', () => {
  it('BẮT: AI trả lại nguyên văn tiếng Trung → suspect=true', () => {
    const r = detectResidualCjk(ZH_SRC, ZH_SRC); // echo hoàn toàn
    expect(r.suspect).toBe(true);
    expect(r.survival).toBeGreaterThan(0.9);
  });

  it('KHÔNG bắt nhầm: bản dịch tiếng Việt tốt (0% Hán) → suspect=false', () => {
    const r = detectResidualCjk(ZH_SRC, VI_GOOD);
    expect(r.suspect).toBe(false);
    expect(r.transCjk).toBe(0);
  });

  it('KHÔNG bắt nhầm: giữ vài danh từ riêng Hán (≈vài %) → suspect=false', () => {
    // Bản dịch tốt nhưng cố ý chú thích tên gốc trong ngoặc
    const withNames = VI_GOOD + '\n(Tên gốc: 辉耀星 / 光之国)';
    const r = detectResidualCjk(ZH_SRC, withNames);
    expect(r.suspect).toBe(false);
  });

  it('BẮT: dịch dở nửa chừng (một nửa còn tiếng Trung) → suspect=true', () => {
    const half = VI_GOOD.slice(0, VI_GOOD.length / 2) + '\n' + ZH_SRC;
    const r = detectResidualCjk(ZH_SRC, half);
    expect(r.suspect).toBe(true);
  });

  it('bỏ qua field nguồn ít Hán (< minOrigCjk) để tránh nhiễu', () => {
    const r = detectResidualCjk('主', '主'); // 1 chữ Hán, dưới ngưỡng 20
    expect(r.suspect).toBe(false);
  });

  // Bug #3: TavernHelper = script JS lớn (100KB+) có nhiều chữ Hán. Guard schema CŨ "còn 1 chữ Hán
  // → dịch lại CẢ field" → re-dịch cả 148KB tới 3 lần = treo. Nay dùng detectResidualCjk (tỷ lệ):
  // dịch tốt (giữ vài chữ Hán trong const/data) → KHÔNG nghi; echo nguyên script → nghi.
  it('BUG #3: script JS dịch tốt, giữ vài chữ Hán trong data → KHÔNG nghi (không re-dịch phí)', () => {
    // Giả lập: nguồn có 100 chữ Hán; bản dịch chỉ còn ~5 (tên biến/data giữ lại) → survival 5%.
    const src = '"use strict";\nconst LABEL = "' + '状态'.repeat(50) + '";'; // 100 chữ Hán
    const trans = '"use strict";\nconst LABEL = "Trạng thái";\n// giữ khóa: ' + '状态'.repeat(2) + '（数据）'; // ~5 Hán
    const r = detectResidualCjk(src, trans);
    expect(r.suspect).toBe(false);
  });

  it('BUG #3: script JS bị echo nguyên (chưa dịch) → nghi', () => {
    const src = '"use strict";\nconst LABEL = "' + '状态'.repeat(50) + '";';
    const r = detectResidualCjk(src, src); // trả lại nguyên văn
    expect(r.suspect).toBe(true);
  });

  it('CJK trong URL/đường dẫn không tính (import path hợp lệ)', () => {
    const src = "import { x } from 'https://cdn.example.com/骰子系统/stable.js';\n" + ZH_SRC;
    const trans = "import { x } from 'https://cdn.example.com/骰子系统/stable.js';\n" + VI_GOOD;
    const r = detectResidualCjk(src, trans);
    expect(r.suspect).toBe(false); // Hán trong URL bị strip ở cả 2 vế
  });

  it('countCjk đếm đúng và bỏ URL', () => {
    expect(countCjk('abc')).toBe(0);
    expect(countCjk('中文字')).toBe(3);
    expect(countCjk("https://x.com/骰子系统/a.js")).toBe(0);
  });
});
