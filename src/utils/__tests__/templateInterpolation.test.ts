import { describe, it, expect } from 'vitest';
import {
  extractBalancedInterpolations,
  isPureCodeInterpolation,
  findMissingCodeInterpolations,
  countCJK,
} from '../aiVerify';

// Bug #2 (họ hàng): check "còn tiếng Trung" đếm cả dấu ngoặc 【】《》 (fullwidth punctuation) là
// "chữ Hán" → báo oan cho 【】 giữ nguyên. countCJK phải CHỈ đếm CHỮ thật (ideograph/kana/hangul).
describe('countCJK — chỉ đếm CHỮ, bỏ dấu câu CJK (sửa báo oan)', () => {
  it('đếm đúng ideograph Hán', () => {
    expect(countCJK('光之战姬')).toBe(4);
  });
  it('KHÔNG đếm dấu ngoặc/dấu câu fullwidth 【】《》。、', () => {
    expect(countCJK('【】《》。、！？')).toBe(0);           // toàn dấu → 0
    expect(countCJK('【开局自定义中】')).toBe(6);           // 开局自定义中 = 6 Hán, 【】 bỏ
    expect(countCJK('【Đang tùy chỉnh khai cuộc】')).toBe(0); // đã dịch, chỉ còn 【】 → 0 (hết báo oan)
  });
  it('đếm kana (Nhật) + hangul (Hàn)', () => {
    expect(countCJK('ひらがな')).toBe(4);   // hiragana
    expect(countCJK('カタカナ')).toBe(4);   // katakana
    expect(countCJK('한국어')).toBe(3);     // hangul
  });
  it('văn bản Latin thuần → 0', () => {
    expect(countCJK('Xin chào thế giới!')).toBe(0);
  });
});

// Bug #2 (bugNeedFix/2): panel Verify báo lỗi "Template Literal" LOẠN — ghép `${A}` gốc với `${B}`
// bản dịch bất kỳ (không liên quan), và báo lỗi cho thứ ĐÚNG (chuỗi literal dịch, biến MVU đổi tên).

describe('extractBalancedInterpolations — parse ${...} lồng nhau', () => {
  it('trích đúng ${} lồng nhau (bản cũ regex [^}]+ trích cụt)', () => {
    const src = "${bodyStateStr ? `<div class=\"data-row\"><span>身体反馈:</span>${bodyStateStr}</div>` : ''}";
    const got = extractBalancedInterpolations(src);
    expect(got).toHaveLength(1);
    expect(got[0]).toBe(src); // lấy trọn cả block, không cắt ở } nội bộ
  });

  it('trích nhiều block độc lập', () => {
    const got = extractBalancedInterpolations("a ${x} b ${y.z} c");
    expect(got).toEqual(['${x}', '${y.z}']);
  });
});

describe('isPureCodeInterpolation — chỉ biến JS thuần', () => {
  it('biến/thuộc tính/index/gọi rỗng = thuần', () => {
    ['bodyStateStr', 'obj.prop', 'enemies', 'arr[0]', 'obj.fn()', '_.get'].forEach(s =>
      expect(isPureCodeInterpolation(s)).toBe(true));
  });
  it('ternary / literal / toán tử / Hán = KHÔNG thuần (bỏ qua, không soi)', () => {
    [
      "bodyStateStr ? '<div>' : ''",          // ternary + HTML literal
      "enemies[k].类型 || '怪物'",              // biến MVU đổi tên + string literal
      "_.get(edata, '基础信息.人物名字', key)", // gọi hàm có tham số chuỗi
      "skStr||'<li>无</li>'",                   // toán tử + literal
      "type === '随机' ? '未知目标' : '怪物'",   // ternary chuỗi
    ].forEach(s => expect(isPureCodeInterpolation(s)).toBe(false));
  });
});

describe('findMissingCodeInterpolations — KHÔNG báo oan (bug #2)', () => {
  it('chuỗi literal dịch (怪物→Quái Vật) → KHÔNG báo lỗi', () => {
    const orig = "${enemies[k].类型 || '怪物'}";
    const trans = "${enemies[k]['Loại'] || 'Quái Vật'}"; // biến đổi tên + literal dịch = ĐÚNG
    expect(findMissingCodeInterpolations(orig, trans)).toEqual([]);
  });

  it('biến MVU đổi tên trong ternary HTML → KHÔNG báo lỗi', () => {
    const orig = "${bodyStateStr ? `<span>身体反馈:</span>${bodyStateStr}` : ''}";
    const trans = "${bodyStateStr ? `<span>Phản hồi cơ thể:</span>${bodyStateStr}` : ''}";
    expect(findMissingCodeInterpolations(orig, trans)).toEqual([]);
  });

  it('gọi hàm _.get với tham số chuỗi Hán dịch → KHÔNG báo lỗi', () => {
    const orig = "${_.get(edata, '基础信息.人物名字', key)}";
    const trans = "${_.get(edata, 'Thông tin cơ bản.Tên nhân vật', key)}";
    expect(findMissingCodeInterpolations(orig, trans)).toEqual([]);
  });

  it('BẮT thật: biến JS thuần bị xoá hẳn → cảnh báo', () => {
    const orig = 'Xin chào ${playerName}!';
    const trans = 'Xin chào (đã xoá nhầm)!';
    expect(findMissingCodeInterpolations(orig, trans)).toEqual(['${playerName}']);
  });

  it('biến JS thuần còn nguyên → KHÔNG báo', () => {
    const orig = 'Xin chào ${playerName}!';
    const trans = 'Chào ${playerName} nhé!';
    expect(findMissingCodeInterpolations(orig, trans)).toEqual([]);
  });
});
