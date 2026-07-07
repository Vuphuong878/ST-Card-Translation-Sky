import { CardV3, CardV3Data } from '../types/card';

/** Thông tin 1 biến MVU-Zod đọc từ schema. */
export interface VariableInfo { key: string; type: string; describe: string; enumValues: string[]; }
/** 1 phép đổi tên/nghĩa biến. */
export interface VariableRemap { oldKey: string; newKey?: string; newDescribe?: string; }

export class CardParser {
  /**
   * Parses a JSON string into a CardV3 object.
   */
  static parse(jsonString: string): CardV3 {
    try {
      const card = JSON.parse(jsonString) as CardV3;
      if (!card.spec || card.spec !== 'chara_card_v3') {
        throw new Error('Invalid card spec. Expected chara_card_v3.');
      }
      return card;
    } catch (error) {
      console.error('Failed to parse card JSON:', error);
      throw error;
    }
  }

  /** Nhận diện file là LOREBOOK standalone (có `entries`, không phải card có `spec`/`data`). */
  static isLorebook(json: unknown): boolean {
    const j = json as { spec?: unknown; data?: unknown; entries?: unknown };
    return !!j && !j.spec && !j.data && j.entries != null &&
      (Array.isArray(j.entries) || typeof j.entries === 'object');
  }

  /** Bọc Lorebook standalone thành CardV3 tối thiểu để tái dùng pipeline mod. Giữ raw để export lại đúng format. */
  static wrapLorebook(raw: Record<string, unknown>): CardV3 {
    const rawEntries = raw.entries;
    const rawArr: Record<string, unknown>[] = Array.isArray(rawEntries)
      ? rawEntries as Record<string, unknown>[]
      : Object.values((rawEntries || {}) as Record<string, Record<string, unknown>>);
    const entries = rawArr.map((e) => ({
      ...e,
      keys: Array.isArray(e.keys) ? e.keys : (Array.isArray(e.key) ? e.key : []),
      content: typeof e.content === 'string' ? e.content : '',
      comment: (e.comment ?? e.name ?? '') as string,
    }));
    const name = (raw.name as string) || 'Lorebook';
    return {
      spec: 'chara_card_v3', spec_version: '3.0', create_date: new Date().toISOString(), name,
      data: {
        name, description: '', personality: '', scenario: '', first_mes: '', mes_example: '',
        creator_notes: '', system_prompt: '', post_history_instructions: '', tags: [], creator: '',
        character_version: '1.0', alternate_greetings: [], extensions: {},
        character_book: { name, entries },
      },
      __lorebookOnly: true, __lorebookRaw: raw,
    } as unknown as CardV3;
  }

  /** Từ card đã mod (chế độ lorebook) → dựng lại Lorebook standalone: giữ format gốc, cập nhật content/keys đã đổi. */
  static unwrapLorebook(card: CardV3): Record<string, unknown> {
    const raw = (card.__lorebookRaw || {}) as Record<string, unknown>;
    const modEntries = (card.data?.character_book?.entries || []) as unknown as Record<string, unknown>[];
    const rawArr: Record<string, unknown>[] = Array.isArray(raw.entries)
      ? raw.entries as Record<string, unknown>[]
      : Object.values((raw.entries || {}) as Record<string, Record<string, unknown>>);
    const usesKeyField = rawArr.length > 0 && rawArr[0].key !== undefined && rawArr[0].keys === undefined;
    const rebuilt = modEntries.map((me, i) => {
      const orig = rawArr[i] || {};
      const out: Record<string, unknown> = { ...orig, content: me.content };
      if (me.keys) { if (usesKeyField) out.key = me.keys; else out.keys = me.keys; }
      if (me.comment !== undefined && orig.comment !== undefined) out.comment = me.comment;
      return out;
    });
    const wasObject = !!raw.entries && !Array.isArray(raw.entries) && typeof raw.entries === 'object';
    if (wasObject) {
      const obj: Record<string, unknown> = {};
      rebuilt.forEach((e, i) => { obj[String((e.uid ?? e.id ?? i))] = e; });
      return { ...raw, entries: obj };
    }
    return { ...raw, entries: rebuilt };
  }

  /** Load 1 file JSON: trả về Card V3 (bọc nếu là Lorebook) + cờ isLorebook. */
  static load(jsonString: string): { card: CardV3; isLorebook: boolean } {
    const json = JSON.parse(jsonString);
    if (json && json.spec === 'chara_card_v3') return { card: json as CardV3, isLorebook: false };
    if (CardParser.isLorebook(json)) return { card: CardParser.wrapLorebook(json), isLorebook: true };
    if (json && json.data && json.data.character_book) return { card: json as CardV3, isLorebook: false };
    throw new Error('File không phải Character Card V3, cũng không phải Lorebook (JSON cần có "entries").');
  }

  static detectMvuZod(card: CardV3): boolean {
    const scripts = card?.data?.extensions?.tavern_helper?.scripts || [];
    const entries = card?.data?.character_book?.entries || [];

    const hasMvuImport = scripts.some(s =>
      s.content?.includes('MagicalAstrogy/MagVarUpdate') ||
      s.content?.includes('MagVarUpdate/artifact/bundle.js')
    );

    const hasZodSchema = scripts.some(s =>
      s.content?.includes('registerMvuSchema') ||
      s.content?.includes('mvu_zod.js')
    );

    const hasEjsController = entries.some(e =>
      e.content?.trim().startsWith('@@preprocessing')
    );

    const hasMvuUpdateEntries = entries.some(e =>
      e.comment?.includes('[mvu_update]') ||
      e.comment?.includes('mvu_update')
    );

    const hasInitvar = entries.some(e =>
      e.comment?.includes('[initvar]')
    );

    const signals = [hasMvuImport, hasZodSchema, hasEjsController, hasMvuUpdateEntries, hasInitvar];
    const signalCount = signals.filter(Boolean).length;

    return signalCount >= 3;
  }

  static extractVariables(card: CardV3): string[] {
    return CardParser.extractVariableInfos(card).map(v => v.key);
  }

  /** Đọc biến trong Zod schema kèm type + describe + enum (để đưa AI đổi tên/nghĩa). */
  static extractVariableInfos(card: CardV3): VariableInfo[] {
    const scripts = card?.data?.extensions?.tavern_helper?.scripts || [];
    const schema = scripts.find(s => s.content && (s.content.includes('registerMvuSchema') || s.content.includes('mvu_zod.js')));
    if (!schema?.content) return [];
    const content = schema.content;
    const re = /"([^"]+)"\s*:\s*z\.([a-zA-Z.]+)\(/g;
    const matches: { key: string; type: string; idx: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) matches.push({ key: m[1], type: m[2], idx: m.index });
    const out: VariableInfo[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      if (seen.has(cur.key)) continue;
      seen.add(cur.key);
      const chunk = content.slice(cur.idx, matches[i + 1]?.idx ?? Math.min(content.length, cur.idx + 400));
      const describe = /\.describe\(\s*['"]([^'"]*)['"]/.exec(chunk)?.[1] || '';
      const enumsRaw = /\.enum\(\s*\[([^\]]*)\]/.exec(chunk)?.[1] || '';
      const enumValues = enumsRaw ? enumsRaw.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : [];
      out.push({ key: cur.key, type: cur.type, describe, enumValues });
    }
    return out;
  }

  /**
   * Áp DETERMINISTIC 1 danh sách đổi tên/nghĩa biến lên card — không nhờ AI:
   * đổi tên leaf-key ở MỌI vị trí là path/định-nghĩa (schema key, getvar('...'), {{getvar::...}},
   * ["..."], .key), NHƯNG chừa văn xuôi thường (chỉ đổi khi có delimiter path đứng trước).
   * KHÔNG đụng runtime MVU (bundle.js). Cập nhật cả .describe() trong schema nếu có newDescribe.
   */
  static applyVariableRemap(card: CardV3, remaps: VariableRemap[]): CardV3 {
    const next: CardV3 = JSON.parse(JSON.stringify(card));
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const active = remaps.filter(r => r.oldKey && ((r.newKey && r.newKey !== r.oldKey) || r.newDescribe));
    if (active.length === 0) return next;

    const renameInText = (text: string): string => {
      let t = text;
      for (const r of active) {
        if (!r.newKey || r.newKey === r.oldKey) continue;
        const o = esc(r.oldKey);
        // Path segment: đứng sau . ' " [ và trước . ' " ] (hoặc ranh giới từ).
        t = t.replace(new RegExp(`(['".\\[])${o}(?=['".\\]]|\\b)`, 'g'), (_mm, p1) => p1 + r.newKey);
        // Key định nghĩa trong schema/JSON: "old":
        t = t.replace(new RegExp(`"${o}"(\\s*:)`, 'g'), `"${r.newKey}"$1`);
      }
      return t;
    };
    const updateDescribe = (text: string): string => {
      let t = text;
      for (const r of active) {
        if (!r.newDescribe) continue;
        const key = esc(r.newKey && r.newKey !== r.oldKey ? r.newKey : r.oldKey);
        const re = new RegExp(`("${key}"\\s*:\\s*z\\.[\\s\\S]{0,300}?\\.describe\\(\\s*)(['"])[^'"]*(['"])`);
        t = t.replace(re, (_mm, pre, q) => pre + q + r.newDescribe + q);
      }
      return t;
    };

    const scripts = next.data?.extensions?.tavern_helper?.scripts || [];
    scripts.forEach(s => {
      if (!s.content) return;
      const isMvuCore = s.content.includes('MagVarUpdate/artifact/bundle.js') || s.content.includes('MagicalAstrogy/MagVarUpdate');
      if (isMvuCore) return;
      s.content = updateDescribe(renameInText(s.content));
    });
    (next.data?.character_book?.entries || []).forEach(e => { if (e.content) e.content = renameInText(e.content); });
    const textFields: (keyof CardV3Data)[] = ['first_mes', 'mes_example', 'description', 'scenario', 'personality', 'system_prompt', 'post_history_instructions'];
    textFields.forEach(f => { const v = next.data[f]; if (typeof v === 'string') (next.data[f] as unknown) = renameInText(v); });
    if (typeof next.first_mes === 'string') next.first_mes = renameInText(next.first_mes);
    if (typeof next.description === 'string') next.description = renameInText(next.description);
    return next;
  }

  /**
   * Stringifies a CardV3 object back to a JSON string.
   */
  static stringify(card: CardV3, pretty = true): string {
    return JSON.stringify(card, null, pretty ? 2 : 0);
  }

  /**
   * Removes the base64 avatar from the card to save tokens before sending to LLM.
   * Returns a deeply cloned card with the avatar removed.
   */
  static sanitizeForLLM(card: CardV3): CardV3 {
    // Deep clone to avoid mutating the original
    const sanitized: CardV3 = JSON.parse(JSON.stringify(card));
    
    if (sanitized.avatar) {
      sanitized.avatar = '[BASE64_IMAGE_OMITTED]';
    }
    
    // According to instructions, we also protect technical fields here if needed,
    // but the prompts also handle skipping technical fields.
    // The main token saver is the avatar.
    
    return sanitized;
  }
}
