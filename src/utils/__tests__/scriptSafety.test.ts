import { describe, it, expect } from 'vitest';
import { extractScriptBodies, isJsSyntaxOk, jsParseError, checkHtmlScripts } from '../scriptSafety';

describe('scriptSafety', () => {
  it('extractScriptBodies — lấy đúng thân, bỏ khối rỗng', () => {
    const html = '<div>x</div><script>var a=1;</script><script>  </script><script>let b=2;</script>';
    expect(extractScriptBodies(html)).toEqual(['var a=1;', 'let b=2;']);
  });

  it('isJsSyntaxOk / jsParseError', () => {
    expect(isJsSyntaxOk('const x = 1;')).toBe(true);
    expect(isJsSyntaxOk("var a = 'x' 'y';")).toBe(false); // 2 chuỗi liền → lỗi
    expect(jsParseError('const x = 1;')).toBeNull();
    const err = jsParseError('function(){');
    expect(err).not.toBeNull();
    expect(err!.pos).toBeGreaterThanOrEqual(0);
  });

  it('checkHtmlScripts — đếm script vỡ', () => {
    const html = '<script>ok()</script><script>var a = ) (</script>';
    const r = checkHtmlScripts(html);
    expect(r.total).toBe(2);
    expect(r.broken).toBe(1);
    expect(r.brokenIndices).toEqual([1]);
  });

  it('không có <script> → total 0, broken 0', () => {
    expect(checkHtmlScripts('<div>hello</div>')).toEqual({ total: 0, broken: 0, brokenIndices: [] });
  });
});
