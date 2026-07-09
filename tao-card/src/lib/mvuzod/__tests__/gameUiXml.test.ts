import { describe, it, expect } from 'vitest';
import {
  stripCdata, tagInner, tagAttr, allBlocks, hasDoneTag,
  applyOneEdit, extractSearchReplacePairs, parseSetRegex,
} from '../gameUiXml';

describe('gameUiXml — parse XML khoan dung', () => {
  it('stripCdata gỡ vỏ CDATA, giữ nguyên chuỗi thường', () => {
    expect(stripCdata('<![CDATA[hello]]>')).toBe('hello');
    expect(stripCdata('  <![CDATA[\n<div>x</div>\n]]>  ')).toBe('\n<div>x</div>\n');
    expect(stripCdata('no cdata')).toBe('no cdata');
  });

  it('tagInner lấy nội dung tag đóng chuẩn', () => {
    expect(tagInner('<say>xin chào</say>', 'say')).toBe('xin chào');
  });

  it('tagInner khoan dung: thiếu tag đóng vẫn lấy tới hết', () => {
    expect(tagInner('<say>chưa đóng tag', 'say')).toBe('chưa đóng tag');
  });

  it('tagInner trả null khi không có tag', () => {
    expect(tagInner('không có gì', 'say')).toBeNull();
  });

  it('tagAttr đọc thuộc tính, không có → chuỗi rỗng', () => {
    expect(tagAttr(' id="status_bar" name="Thanh"', 'id')).toBe('status_bar');
    expect(tagAttr(' id="x"', 'name')).toBe('');
  });

  it('allBlocks bắt nhiều khối cùng tên kèm attrs', () => {
    const t = '<write_component id="a">AA</write_component><write_component id="b">BB</write_component>';
    const blocks = allBlocks(t, 'write_component');
    expect(blocks).toHaveLength(2);
    expect(tagAttr(blocks[0].attrs, 'id')).toBe('a');
    expect(blocks[1].inner).toBe('BB');
  });

  it('hasDoneTag nhận cả <done/> và <done></done>', () => {
    expect(hasDoneTag('...<done/>')).toBe(true);
    expect(hasDoneTag('<done></done>')).toBe(true);
    expect(hasDoneTag('chưa xong')).toBe(false);
  });

  // ─── applyOneEdit: cơ chế sống còn của trải nghiệm chỉnh sửa ───
  it('applyOneEdit khớp nguyên văn', () => {
    const r = applyOneEdit('<div class="hp">80</div>', '80', '95');
    expect(r.ok).toBe(true);
    expect(r.html).toBe('<div class="hp">95</div>');
  });

  it('applyOneEdit khớp MỀM khi lệch khoảng trắng/thụt dòng', () => {
    const html = '<div>\n    <span>HP</span>\n</div>';
    // search viết trên 1 dòng, thụt lề khác — vẫn phải khớp
    const r = applyOneEdit(html, '<span>HP</span>', '<span>Máu</span>');
    expect(r.ok).toBe(true);
    expect(r.html).toContain('<span>Máu</span>');
  });

  it('applyOneEdit trượt hẳn → ok=false, giữ nguyên html', () => {
    const r = applyOneEdit('<div>abc</div>', 'KHÔNG TỒN TẠI', 'x');
    expect(r.ok).toBe(false);
    expect(r.html).toBe('<div>abc</div>');
  });

  it('extractSearchReplacePairs rút nhiều cặp, gỡ CDATA', () => {
    const inner = `
      <search><![CDATA[old1]]></search><replace><![CDATA[new1]]></replace>
      <search>old2</search><replace>new2</replace>`;
    const pairs = extractSearchReplacePairs(inner);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toEqual({ search: 'old1', replace: 'new1' });
    expect(pairs[1]).toEqual({ search: 'old2', replace: 'new2' });
  });

  // ─── parseSetRegex ───
  it('parseSetRegex lấy replaceString từ fromComponent', () => {
    const inner = `
      <scriptName>Render Status</scriptName>
      <findRegex>/<status>([\\s\\S]*?)<\\/status>/s</findRegex>
      <placement>2</placement>
      <markdownOnly>true</markdownOnly>
      <promptOnly>false</promptOnly>
      <fromComponent>status_bar</fromComponent>`;
    const script = parseSetRegex(inner, { status_bar: { html: '<div>$1</div>' } });
    expect(script).not.toBeNull();
    expect(script!.scriptName).toBe('Render Status');
    expect(script!.findRegex).toBe('/<status>([\\s\\S]*?)<\\/status>/s');
    expect(script!.replaceString).toBe('<div>$1</div>');
    expect(script!.placement).toEqual([2]);
    expect(script!.markdownOnly).toBe(true);
    expect(script!.promptOnly).toBe(false);
  });

  it('parseSetRegex: thiếu findRegex → null', () => {
    expect(parseSetRegex('<scriptName>x</scriptName>', {})).toBeNull();
  });

  it('parseSetRegex: placement mặc định [2], bool mặc định đúng', () => {
    const script = parseSetRegex('<findRegex>/x/</findRegex>', {});
    expect(script!.placement).toEqual([2]);
    expect(script!.markdownOnly).toBe(true);
    expect(script!.promptOnly).toBe(false);
    expect(script!.replaceString).toBe('');
  });

  it('parseSetRegex: placement nhiều giá trị "2,4"', () => {
    const script = parseSetRegex('<findRegex>/x/</findRegex><placement>2,4</placement>', {});
    expect(script!.placement).toEqual([2, 4]);
  });
});
