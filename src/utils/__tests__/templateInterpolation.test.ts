import { describe, it, expect } from 'vitest';
import {
  extractBalancedInterpolations,
  isPureCodeInterpolation,
  findMissingCodeInterpolations,
} from '../aiVerify';

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
