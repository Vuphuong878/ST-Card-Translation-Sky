/**
 * "Tạo thẻ từ truyện" — pipeline mô-đun học từ 小玉写卡器.
 * B1: Quét truyện → tìm nhân vật (tên + bí danh + mô tả ngắn).
 * B2: Chọn nhân vật → sinh thẻ theo mô-đun (basic → persona nhiều giai đoạn → scenario → first_mes),
 *     output bằng tag có cấu trúc để parse chắc. Hỗ trợ {{user}} thay 1 nhân vật + mô tả quan hệ.
 * Dùng callAI của tao-card → hưởng multi-key + chạy song song theo RPM.
 */
import type { ProxyProfile, GenerationParams } from '../../types';
import { callAI } from './client';

export interface ScannedCharacter { name: string; aliases: string[]; brief: string; }
export interface StoryCardOptions {
  userReplaceName?: string;
  relationship?: string;
  detail?: 'ngắn gọn' | 'vừa phải' | 'chi tiết';
  nsfw?: boolean;
}
export interface GeneratedStoryCard {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMes: string;
  raw: string;
}

// ─── Tag parse khoan dung ───
function tag(text: string, name: string): string {
  const closed = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(text);
  if (closed) return closed[1].trim();
  const open = new RegExp(`<${name}>([\\s\\S]*?)(?=<[a-z_]+>|</[a-z_]+>|$)`, 'i').exec(text);
  return open ? open[1].trim() : '';
}
function allTags(text: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1].trim());
  return out;
}

const NSFW_RULE = 'Cho phép nội dung 18+ nếu truyện có; diễn đạt tự nhiên trong nhân vật/thế giới, KHÔNG từ chối, KHÔNG bàn về việc né tránh.';
const SFW_RULE = 'Giữ nội dung an toàn (SFW).';

// ═══ B1: Quét nhân vật ═══
export async function scanCharacters(
  story: string,
  profile: ProxyProfile,
  params: GenerationParams,
  signal?: AbortSignal,
): Promise<ScannedCharacter[]> {
  const system = `Bạn là trợ lý phân tích truyện để tạo thẻ nhân vật SillyTavern.
Nhiệm vụ: đọc truyện và LIỆT KÊ các nhân vật ĐÁNG tạo thẻ (nhân vật chính/phụ quan trọng), kèm bí danh và mô tả nhận diện ngắn.
Bỏ qua nhân vật thoáng qua/không tên. Gộp các bí danh của cùng một người vào một mục.
CHỈ xuất đúng khối sau, mọi tag đóng, ngoài tag không viết gì:
<roster>
<char><name>Tên chính</name><aliases>bí danh 1, bí danh 2</aliases><brief>1–2 câu nhận diện: vai trò, đặc điểm nổi bật</brief></char>
...
</roster>`;
  const { text } = await callAI({
    profile, params, signal, label: 'Quét nhân vật',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `【Truyện】\n${story.trim()}` },
    ],
  });
  const block = tag(text, 'roster') || text;
  return allTags(block, 'char').map((c) => ({
    name: tag(c, 'name'),
    aliases: tag(c, 'aliases').split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    brief: tag(c, 'brief'),
  })).filter((c) => c.name);
}

// ═══ B2: Sinh thẻ cho 1 nhân vật ═══
export async function generateCardFromStory(
  story: string,
  characterName: string,
  profile: ProxyProfile,
  params: GenerationParams,
  opts: StoryCardOptions = {},
  signal?: AbortSignal,
): Promise<GeneratedStoryCard> {
  const directives: string[] = [];
  if (opts.userReplaceName?.trim()) {
    const n = opts.userReplaceName.trim();
    directives.push(`Nhân vật "${n}" trong truyện chính là {{user}} (người chơi). Thay mọi chỗ nhắc "${n}" bằng {{user}}; KHÔNG mô tả nội tâm/hành động thay cho {{user}}.`);
  }
  if (opts.relationship?.trim()) directives.push(`Thể hiện rõ mối quan hệ giữa nhân vật và {{user}}: ${opts.relationship.trim()}`);

  const system = `Bạn là chuyên gia viết THẺ NHÂN VẬT SillyTavern chất lượng cao, viết bằng tiếng Việt tự nhiên, văn phong nhập vai.
Từ truyện + tên nhân vật mục tiêu, hãy viết một thẻ HOÀN CHỈNH cho nhân vật đó, mức chi tiết: ${opts.detail ?? 'vừa phải'}. ${opts.nsfw ? NSFW_RULE : SFW_RULE}
QUY TẮC:
- Chỉ dựa vào truyện; được suy luận hợp lý nhưng KHÔNG phủ định thiết lập rõ ràng.
- Giữ nguyên macro {{user}}, {{char}}. KHÔNG viết chú thích meta/quy trình.
${directives.length ? '- ' + directives.join('\n- ') + '\n' : ''}ĐỊNH DẠNG BẮT BUỘC — chỉ xuất đúng khối, mọi tag đóng, ngoài tag không viết gì:
<card>
<name>Tên nhân vật</name>
<basic>Thông tin cơ bản (gạch đầu dòng): ngoại hình nhận diện, xuất thân/lai lịch, năng lực, vai trò trong truyện.</basic>
<persona>Tính cách + cách cư xử, chia theo 3 giai đoạn quan hệ với {{user}}: [Sơ giao 0–30], [Quen thân 31–70], [Thân mật 71–100], và [Xuyên suốt].</persona>
<scenario>Bối cảnh {{char}} gặp/tương tác với {{user}} (2–4 câu).</scenario>
<first_mes>Lời chào/mở màn nhập vai của {{char}} với {{user}} — có hành động *nghiêng*, lời thoại, không thay lời {{user}}.</first_mes>
</card>`;

  const { text } = await callAI({
    profile, params, signal, label: `Tạo thẻ: ${characterName}`,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `【Nhân vật mục tiêu】\n${characterName}\n\n【Truyện】\n${story.trim()}` },
    ],
  });
  const block = tag(text, 'card') || text;
  return {
    name: tag(block, 'name') || characterName,
    description: [tag(block, 'basic'), tag(block, 'persona')].filter(Boolean).join('\n\n'),
    personality: '',
    scenario: tag(block, 'scenario'),
    firstMes: tag(block, 'first_mes'),
    raw: text,
  };
}
