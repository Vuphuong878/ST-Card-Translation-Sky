import { describe, it, expect } from 'vitest';
import { restoreVariablePrefixes, applyMvuToText } from '../mvuSync';

describe('restoreVariablePrefixes — bảo toàn prefix _ / $', () => {
  it('gắn lại "_" khi AI bỏ mất (readonly marker)', () => {
    const dict = { '_类型': 'Loại' };
    restoreVariablePrefixes(dict);
    expect(dict['_类型']).toBe('_Loại');
  });

  it('gắn lại "$" khi AI bỏ mất (hidden marker)', () => {
    const dict = { '$开局类型': 'Loại Mở Đầu' };
    restoreVariablePrefixes(dict);
    expect(dict['$开局类型']).toBe('$Loại Mở Đầu');
  });

  it('không đụng khi bản dịch đã có prefix', () => {
    const dict = { '_类型': '_Loại', '$旗': '$Cờ' };
    restoreVariablePrefixes(dict);
    expect(dict['_类型']).toBe('_Loại');
    expect(dict['$旗']).toBe('$Cờ');
  });

  it('không thêm prefix cho key thường', () => {
    const dict = { '类型': 'Loại' };
    restoreVariablePrefixes(dict);
    expect(dict['类型']).toBe('Loại');
  });

  it('phân biệt biến thường và biến readonly cùng tên (không trùng giả)', () => {
    // `类型` và `_类型` là hai biến khác nhau → bản dịch phải khác nhau
    const dict = { '类型': 'Loại', '_类型': 'Loại' };
    restoreVariablePrefixes(dict);
    expect(dict['类型']).toBe('Loại');
    expect(dict['_类型']).toBe('_Loại');
    expect(dict['类型']).not.toBe(dict['_类型']);
  });
});

describe('applyMvuToText — thay biến có prefix giữ nguyên marker', () => {
  it('YAML: _类型: giữ dấu _ sau khi thay', () => {
    const out = applyMvuToText('_类型: 魔法', { '_类型': '_Loại' }, true);
    expect(out).toContain('_Loại:');
    expect(out).not.toContain('_类型');
  });

  it('không thay nhầm `类型` bare khi dict chỉ có `_类型`', () => {
    // dòng có `类型:` (không prefix) phải giữ nguyên vì key trong dict là `_类型`
    const out = applyMvuToText('类型: 普通\n_类型: 魔法', { '_类型': '_Loại' }, true);
    expect(out).toContain('类型: 普通'); // bare key giữ nguyên
    expect(out).toContain('_Loại: 魔法');
  });
});
