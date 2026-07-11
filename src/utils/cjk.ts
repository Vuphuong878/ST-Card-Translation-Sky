/**
 * src/utils/cjk.ts — NGUỒN CHÂN LÝ cho việc đếm/lọc ký tự CJK (audit đợt 3).
 * ─────────────────────────────────────────────────────────────────────────
 * Trước đây `stripUrlsForCjkCheck` bị ĐÚP 3 NƠI (useTranslation, apiClient, bản lite ở langDetect)
 * và regex đếm CJK đúp 2 nơi (aiVerify, langDetect) — bản apiClient còn dính typo `(?:\.\.\?\/)`
 * khiến không strip được đường dẫn tương đối `./x`. Gom về đây: sửa 1 chỗ, mọi nơi hưởng.
 *
 * Hai "thước đo" CJK khác nhau CÓ CHỦ Ý (đừng gộp làm một):
 *  - HAN_RE_G:      chỉ ideograph Hán — dùng cho việc "còn tiếng TRUNG chưa dịch?" (card nguồn zh).
 *  - CJK_TEXT_RE_G: Hán + kana Nhật + hangul Hàn — dùng cho Verify "còn chữ NGUỒN chưa dịch?"
 *    (card nguồn có thể là Nhật/Hàn). KHÔNG bao gồm dải dấu câu 、。【】 (bug #2: đếm dấu câu
 *    làm báo oan "còn tiếng Trung").
 */

/** Chỉ chữ Hán (CJK Unified Ideographs + Extension A). */
export const HAN_RE_G = /[一-鿿㐀-䶿]/g;

/** Chữ VĂN BẢN CJK: Hán + hiragana + katakana + hangul (không dấu câu/fullwidth). */
export const CJK_TEXT_RE_G = /[一-鿿㐀-䶿぀-ゟ゠-ヿ가-힯]/g;

/**
 * Bỏ URL/đường dẫn/link khỏi text TRƯỚC khi đếm CJK — CJK trong URL là cố ý
 * (vd `import('https://cdn.com/骰子系统/stable.js')`) và KHÔNG được tính là "chưa dịch".
 * Strips: URL chuẩn, thuộc tính src/href..., CSS url(), import()/require(), data URI,
 * đường dẫn tương đối ./ ../, và phần URL của link markdown.
 */
export function stripUrlsForCjkCheck(text: string): string {
  let s = text || '';
  // 1. URL chuẩn: http(s)://, ftp://, //host
  s = s.replace(/(?:https?|ftp):\/\/[^\s'"<>(){}\\]+|\/\/[a-zA-Z0-9][^\s'"<>(){}\\]*/gi, '');
  // 2. Giá trị thuộc tính HTML src/href/action/data-src/poster/srcset
  s = s.replace(/(?:src|href|action|data-src|data-href|poster|srcset)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
  // 3. CSS url()
  s = s.replace(/url\(\s*(?:"[^"]*"|'[^']*'|[^)]*?)\s*\)/gi, '');
  // 4. import()/require() (chuỗi thường và template literal)
  s = s.replace(/(?:import|require)\s*\(\s*(?:[`'"][^`'"]*[`'"]|`[^`]*`)\s*\)/gi, '');
  // 5. Data URI
  s = s.replace(/data:[a-zA-Z0-9+/.-]+;[^\s'"<>)]+/gi, '');
  // 6. Đường dẫn tương đối ./x hoặc ../x  (bản apiClient cũ dính typo `\.\.\?\/` — đã sửa)
  s = s.replace(/(?:\.\.?\/)[^\s'"<>(){}\\]+/g, '');
  // 7. Link markdown [...](url) — chỉ bỏ phần URL
  s = s.replace(/(!?\[[^\]]*\])\([^)]+\)/g, '$1()');
  return s;
}

/** Đếm chữ Hán SAU khi bỏ URL — thước đo "còn tiếng Trung chưa dịch". */
export function countHanStripped(text: string): number {
  return (stripUrlsForCjkCheck(text).match(HAN_RE_G) || []).length;
}

/** Đếm chữ văn bản CJK (Hán+kana+hangul), KHÔNG strip URL — thước đo của Verify. */
export function countCjkText(text: string): number {
  return ((text || '').match(CJK_TEXT_RE_G) || []).length;
}
