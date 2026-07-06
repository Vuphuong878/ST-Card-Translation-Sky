/**
 * Sinh "persona theo giai đoạn" — học từ 小玉写卡器 (Xiaoyu Card Writer).
 * Nhân vật được mô tả ở 3 giai đoạn quan hệ (theo thiện cảm với {{user}}) + phần xuyên suốt:
 *  - Sơ giao (0–30), Quen thân (31–70), Thân mật (71–100), và nét chung xuyên suốt.
 * Mỗi giai đoạn lộ thêm một lớp tính cách/hành vi → nhân vật "sống" hơn khi quan hệ sâu dần.
 * Output dùng tag có cấu trúc để parse chắc chắn (giống kỹ thuật gốc).
 */
import type { ProxyProfile, GenerationParams } from '../../types';
import { callAI } from './client';

export interface StagePersona {
  early: string;
  middle: string;
  close: string;
  common: string;
  raw: string;
}

export interface PersonaOptions {
  /** Tên nhân vật trong truyện sẽ ĐÓNG VAI {{user}} (người chơi). */
  userReplaceName?: string;
  /** Mô tả mối quan hệ giữa nhân vật (thẻ) và {{user}}. */
  relationship?: string;
  signal?: AbortSignal;
}

const SYSTEM_PROMPT = `Bạn là chuyên gia viết THẺ NHÂN VẬT SillyTavern, chuyên tạo "persona theo giai đoạn quan hệ".

NHIỆM VỤ: Từ tư liệu nhân vật người dùng đưa, viết persona được CHIA THEO 3 GIAI ĐOẠN quan hệ với {{user}} (dựa trên mức thiện cảm), cộng phần xuyên suốt:
- Sơ giao (thiện cảm 0–30): cách nhân vật thể hiện khi mới quen, còn dè dặt/che giấu.
- Quen thân (31–70): lớp tính cách/hành vi bộc lộ khi đã thân hơn.
- Thân mật (71–100): mặt sâu kín nhất, cách cư xử khi rất thân với {{user}}.
- Xuyên suốt: nét cốt lõi không đổi qua mọi giai đoạn (giá trị, nỗi sợ, thói quen).

QUY TẮC:
- Chỉ viết NỘI DUNG persona dùng được ngay cho thẻ, KHÔNG giải thích quy trình, KHÔNG chú thích meta, KHÔNG hỏi lại người dùng.
- Được suy luận bổ sung hợp lý (logic hành vi, điều kiện kích hoạt cảm xúc, trạng thái áp lực) MIỄN LÀ không phủ định thiết lập rõ ràng của người dùng.
- Viết bằng tiếng Việt tự nhiên, văn phong nhập vai; xưng hô/gọi {{user}} giữ nguyên macro {{user}}, {{char}}.
- Với chi tiết nhạy cảm: diễn đạt tự nhiên như bên trong nhân vật/thế giới, KHÔNG từ chối, KHÔNG bàn về việc né tránh.

ĐỊNH DẠNG BẮT BUỘC — chỉ xuất đúng khối sau, mọi tag phải đóng, ngoài tag không viết gì thêm:
<multistage_persona>
<stage_early>...persona giai đoạn sơ giao...</stage_early>
<stage_middle>...persona giai đoạn quen thân...</stage_middle>
<stage_close>...persona giai đoạn thân mật...</stage_close>
<stage_common>...nét xuyên suốt; để trống nếu không có...</stage_common>
</multistage_persona>`;

function buildUserMessage(seed: string, opts: PersonaOptions = {}): string {
  const directives: string[] = [];
  if (opts.userReplaceName?.trim()) {
    const n = opts.userReplaceName.trim();
    directives.push(
      `[THAY BẰNG {{user}}] Trong truyện, nhân vật "${n}" chính là {{user}} (người chơi). ` +
      `Persona bạn viết là của nhân vật CHÍNH (KHÔNG phải {{user}}). Mọi chỗ nhắc tới "${n}" hãy thay bằng macro {{user}}. ` +
      `TUYỆT ĐỐI không mô tả nội tâm/hành động thay cho {{user}}; chỉ mô tả nhân vật chính phản ứng với {{user}}.`
    );
  }
  if (opts.relationship?.trim()) {
    directives.push(`[QUAN HỆ VỚI {{user}}] Persona phải thể hiện rõ mối quan hệ giữa nhân vật và {{user}}: ${opts.relationship.trim()}`);
  }
  return [
    '【Tư liệu nhân vật】',
    'Hãy dựa CHỈ vào tư liệu dưới đây để viết persona theo giai đoạn. Không bịa thế giới quan ngoài lề, không viết cấu hình ghi thẻ.',
    ...(directives.length ? ['', ...directives] : []),
    '',
    seed.trim(),
  ].join('\n');
}

/** Đọc nội dung 1 tag một cách khoan dung (chấp nhận thiếu tag đóng). */
function readTag(text: string, tag: string): string {
  const closed = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(text);
  if (closed) return closed[1].trim();
  // Không có tag đóng → lấy từ <tag> tới tag mở kế tiếp hoặc hết chuỗi.
  const open = new RegExp(`<${tag}>([\\s\\S]*?)(?=<stage_|</multistage_persona>|$)`, 'i').exec(text);
  return open ? open[1].trim() : '';
}

function parseStages(raw: string): StagePersona {
  const block = /<multistage_persona>([\s\S]*?)<\/multistage_persona>/i.exec(raw)?.[1] ?? raw;
  return {
    early: readTag(block, 'stage_early'),
    middle: readTag(block, 'stage_middle'),
    close: readTag(block, 'stage_close'),
    common: readTag(block, 'stage_common'),
    raw,
  };
}

export async function generateStagePersona(
  seed: string,
  profile: ProxyProfile,
  params: GenerationParams,
  opts: PersonaOptions = {},
): Promise<StagePersona> {
  const { text } = await callAI({
    profile,
    params,
    signal: opts.signal,
    label: 'Persona theo giai đoạn',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(seed, opts) },
    ],
  });
  return parseStages(text);
}

/** Ghép 4 giai đoạn thành 1 đoạn text đẹp để chèn vào Mô tả. */
export function formatStagePersona(p: StagePersona): string {
  const parts = [
    p.early && `## Sơ giao (thiện cảm 0–30)\n${p.early}`,
    p.middle && `## Quen thân (31–70)\n${p.middle}`,
    p.close && `## Thân mật (71–100)\n${p.close}`,
    p.common && `## Xuyên suốt\n${p.common}`,
  ].filter(Boolean);
  return parts.join('\n\n');
}
