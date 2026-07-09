import { describe, it, expect } from 'vitest';
import { scanFieldsHealth, buildTranslationReport } from '../cardHealth';
import type { TranslationField } from '../../types/card';

/** Dựng 1 TranslationField tối thiểu cho test (chỉ đặt field cần thiết). */
function mk(o: Partial<TranslationField>): TranslationField {
  return {
    path: 'p', label: 'L', group: 'basic', original: '', translated: '', status: 'done', retries: 0,
    ...o,
  } as unknown as TranslationField;
}

describe('scanFieldsHealth', () => {
  it('thẻ lành → ok, không issue', () => {
    const r = scanFieldsHealth([
      mk({ original: '你好', translated: 'Xin chào', status: 'done' }),
    ]);
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
    expect(r.counts.done).toBe(1);
  });

  it('trường lỗi → issue error, ok=false', () => {
    const r = scanFieldsHealth([mk({ status: 'error', error: 'timeout' })]);
    expect(r.ok).toBe(false);
    expect(r.counts.error).toBe(1);
    expect(r.issues[0]).toMatchObject({ severity: 'error', kind: 'field_error' });
  });

  it('trường chưa xong → warning nhưng vẫn ok (không phải error)', () => {
    const r = scanFieldsHealth([mk({ status: 'pending' })]);
    expect(r.ok).toBe(true);
    expect(r.counts.pending).toBe(1);
    expect(r.issues[0]).toMatchObject({ severity: 'warning', kind: 'field_pending' });
  });

  it('<script> gốc lành mà bản dịch VỠ → broken_script, ok=false', () => {
    const r = scanFieldsHealth([mk({
      original: "<script>var a = '你好';</script>",
      translated: "<script>var a = 'Xin' 'chào';</script>",  // 2 chuỗi liền → SyntaxError
      status: 'done',
    })]);
    expect(r.counts.brokenScripts).toBe(1);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.kind === 'broken_script')).toBe(true);
  });

  it('<script> bản dịch vẫn lành → KHÔNG báo vỡ', () => {
    const r = scanFieldsHealth([mk({
      original: "<script>var a = '你好';</script>",
      translated: "<script>var a = 'Xin chào';</script>",
      status: 'done',
    })]);
    expect(r.counts.brokenScripts).toBe(0);
    expect(r.ok).toBe(true);
  });

  it('chữ Hán còn trong field CODE (json_patch) → residual_cjk_code, ok=false', () => {
    const r = scanFieldsHealth([mk({
      entryType: 'json_patch', translated: 'x = "还有中文";', status: 'done',
    })]);
    expect(r.counts.residualCjkCode).toBe(1);
    expect(r.ok).toBe(false);
  });

  it('chữ Hán sót trong VĂN BẢN done → info (không chặn xuất)', () => {
    const r = scanFieldsHealth([mk({ translated: '主角是李明和王芳', status: 'done' })]);
    expect(r.counts.residualCjkText).toBe(1);
    expect(r.ok).toBe(true); // info không phải error
    expect(r.issues[0].severity).toBe('info');
  });
});

describe('scanFieldsHealth — kiểm áp Từ điển thuật ngữ', () => {
  const glossary = [
    { source: '李明', target: 'Lý Minh' },
    { source: '王芳', target: 'Vương Phương' },
  ];

  it('bản dịch CÒN nguyên tên gốc trong Từ điển → warning glossary_unapplied', () => {
    const r = scanFieldsHealth(
      [mk({ translated: 'Nhân vật chính là 李明 và Vương Phương.', status: 'done' })],
      glossary,
    );
    expect(r.counts.glossaryUnapplied).toBe(1);
    expect(r.issues.some((i) => i.kind === 'glossary_unapplied')).toBe(true);
    expect(r.ok).toBe(true); // warning, không chặn xuất
  });

  it('bản dịch đã áp đúng mọi thuật ngữ → không cảnh báo', () => {
    const r = scanFieldsHealth(
      [mk({ translated: 'Nhân vật chính là Lý Minh và Vương Phương.', status: 'done' })],
      glossary,
    );
    expect(r.counts.glossaryUnapplied).toBe(0);
  });

  it('không truyền Từ điển → bỏ qua kiểm áp thuật ngữ', () => {
    const r = scanFieldsHealth([mk({ translated: '李明', status: 'done' })]);
    expect(r.counts.glossaryUnapplied).toBe(0);
  });

  it('bỏ qua mục từ điển source===target hoặc quá ngắn', () => {
    const r = scanFieldsHealth(
      [mk({ translated: 'X 李明', status: 'done' })],
      [{ source: '李', target: '李' }, { source: 'A', target: 'B' }],
    );
    expect(r.counts.glossaryUnapplied).toBe(0);
  });
});

describe('buildTranslationReport', () => {
  it('gồm tổng quan + phần lỗi khi có script vỡ', () => {
    const fields = [
      mk({ label: 'Mô tả', original: "<script>var a='你';</script>", translated: "<script>var a='x' 'y';</script>", status: 'done' }),
      mk({ label: 'Tên', status: 'error', error: 'timeout' }),
    ];
    const md = buildTranslationReport(fields, 'the-test.json');
    expect(md).toContain('# Báo cáo dịch — the-test.json');
    expect(md).toContain('Script vỡ cú pháp');
    expect(md).toContain('nên sửa trước khi xuất');
  });
});
