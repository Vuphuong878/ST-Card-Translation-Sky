import { CardV3 } from '../types/card';
import { CardParser, VariableRemap } from './parser';
import { LLMConfig } from './llm';
import { SYSTEM_PROMPT, ANALYZE_CARD_PROMPT, MOD_SECTION_PROMPT, MOD_SCRIPT_PROMPT, KEYWORD_SYNC_PROMPT, CONSISTENCY_AUDIT_PROMPT, VALIDATE_CARD_PROMPT, MVUZOD_NARRATIVE_MOD_PROMPT, MVUZOD_VALIDATE_PROMPT, MVUZOD_VAR_REMAP_PROMPT, EXPAND_SECTION_PROMPT, EXPAND_SUBSECTION_PROMPT } from './prompts';

/** Tuỳ chọn chế độ mở rộng khi mod 1 section. */
export interface ModOptions { expand?: boolean; intensity?: string; loreDigest?: string; }

/** Digest toàn cảnh card + lorebook (để AI mở rộng bám lore, không mâu thuẫn). */
export function buildLoreDigest(card: CardV3): string {
  const d = card.data;
  const strip = (s: string) => (s || '').replace(/<%[\s\S]*?%>/g, '').replace(/\s+/g, ' ').trim();
  const parts: string[] = [];
  if (d.name) parts.push(`Nhân vật chính: ${d.name}`);
  const desc = strip(d.description || card.description || '').slice(0, 600);
  if (desc) parts.push(`Mô tả (tóm tắt): ${desc}`);
  const scen = strip(d.scenario || '').slice(0, 300);
  if (scen) parts.push(`Bối cảnh: ${scen}`);
  const entries = (d.character_book?.entries || []).filter(e =>
    e.content && !e.content.trim().startsWith('@@preprocessing') &&
    !e.comment?.includes('[mvu_update]') && !e.comment?.includes('[initvar]'));
  const loreLines = entries.slice(0, 30).map(e => `• ${e.comment || 'entry'}: ${strip(e.content).slice(0, 160)}`);
  if (loreLines.length) parts.push(`LOREBOOK (${loreLines.length} mục tham chiếu):\n${loreLines.join('\n')}`);
  return parts.join('\n\n').slice(0, 5000);
}

/** Lấy nội dung 1 tag XML (khoan dung: chấp nhận thiếu tag đóng). */
function extractTag(text: string, name: string): string {
  const closed = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(text);
  if (closed) return closed[1].replace(/^\n+|\n+$/g, '').trim();
  const open = new RegExp(`<${name}>([\\s\\S]*)`, 'i').exec(text);
  return open ? open[1].replace(/^\n+/g, '').trim() : '';
}

/** Parse khoan dung khối <remap> XML từ AI → danh sách đổi biến. */
function parseRemapXml(text: string): VariableRemap[] {
  const block = /<remap>([\s\S]*?)<\/remap>/i.exec(text)?.[1] ?? text;
  const tag = (s: string, t: string) => new RegExp(`<${t}>([\\s\\S]*?)</${t}>`, 'i').exec(s)?.[1]?.trim() ?? '';
  const out: VariableRemap[] = [];
  const re = /<var>([\s\S]*?)<\/var>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const oldKey = tag(m[1], 'old');
    if (!oldKey) continue;
    const newName = tag(m[1], 'new_name');
    const newDesc = tag(m[1], 'new_desc');
    out.push({ oldKey, newKey: newName || oldKey, newDescribe: newDesc || undefined });
  }
  return out;
}

export interface OrchestratorRule {
  id: string;
  name: string;
  details: string;
  keywords: string;
  enabled: boolean;
}

async function fetchLLM(systemPrompt: string, userPrompt: string, config: LLMConfig) {
  const res = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userPrompt, config })
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'LLM fetch failed');
  }
  const data = await res.json();
  return data.result;
}

export interface CardSection {
  section_id: string;
  label: string;
  field_path: string;
  mirror_paths: string[];
  content: string;
  is_code: boolean;
  content_type?: string;
  entry_position?: string;
}

export const extractSections = (card: CardV3): CardSection[] => {
  const sections: CardSection[] = [];
  const CORE_FIELDS = [
    { key: 'description', label: 'Mô tả nhân vật', mirror: 'data.description' },
    { key: 'personality', label: 'Tính cách', mirror: 'data.personality' },
    { key: 'scenario', label: 'Kịch bản', mirror: 'data.scenario' },
    { key: 'first_mes', label: 'Tin nhắn đầu', mirror: 'data.first_mes' },
    { key: 'mes_example', label: 'Tin nhắn mẫu', mirror: 'data.mes_example' },
  ];

  // Core fields
  CORE_FIELDS.forEach(({ key, label, mirror }) => {
    // Only looking at the root level for extraction
    const val = (card as unknown as Record<string, string | undefined>)[key] || card.data[key]; 
    if (val && typeof val === 'string' && val.trim()) {
      sections.push({
        section_id: key,
        label,
        field_path: key,
        mirror_paths: [mirror],
        content: val,
        is_code: false,
        content_type: 'text_narrative'
      });
    }
  });

  // System instructions
  const sysPrompt = card.data.system_prompt;
  if (sysPrompt && sysPrompt.trim()) {
    sections.push({
      section_id: 'system_prompt',
      label: 'System Prompt',
      field_path: 'data.system_prompt',
      mirror_paths: [],
      content: sysPrompt,
      is_code: false,
      content_type: 'system_instruction'
    });
  }

  // Lorebook entries
  const entries = card.data.character_book?.entries || [];
  entries.forEach((entry, i) => {
    if (entry.content && entry.content.trim()) {
      const isEjs = entry.content.trim().startsWith('@@preprocessing');
      sections.push({
        section_id: `entry_${i}`,
        label: isEjs ? `EJS Controller: ${entry.comment || `Entry #${i+1}`}` : `Lorebook: ${entry.comment || `Entry #${i+1}`}`,
        field_path: `data.character_book.entries[${i}].content`,
        mirror_paths: [],
        content: entry.content,
        is_code: isEjs,
        content_type: isEjs ? 'template_code' : 'world_lore',
        entry_position: entry.position !== undefined ? String(entry.position) : undefined
      });
    }
  });

  // Tavern Helper scripts (Protect MVU runtime CDN library)
  const scripts = card.data.extensions?.tavern_helper?.scripts || [];
  scripts.forEach((s, i) => {
    // DO NOT extract or mod core MVU runtime script
    const isMvuCore = s.content && (
      s.content.includes('MagicalAstrogy/MagVarUpdate') ||
      s.content.includes('MagVarUpdate/artifact/bundle.js')
    );
    if (isMvuCore) return;
    
    if (s.content && s.content.trim()) {
      sections.push({
        section_id: `script_${i}`,
        label: `Script: ${s.name || `Script #${i+1}`}`,
        field_path: `data.extensions.tavern_helper.scripts[${i}].content`,
        mirror_paths: [],
        content: s.content,
        is_code: true,
        content_type: 'template_code'
      });
    }
  });

  return sections;
};

const formatRules = (rules: OrchestratorRule[]) => {
  return rules
    .filter(r => r.enabled)
    .map(r => `[ID: ${r.id}] ${r.name}: ${r.details} (Từ khóa: ${r.keywords})`)
    .join('\n\n');
};

export const applyModification = (card: CardV3, fieldPath: string, newContent: string): CardV3 => {
  const newCard = JSON.parse(JSON.stringify(card));
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setField = (obj: any, path: string, val: any) => {
    const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
      if (!current) return;
    }
    current[keys[keys.length - 1]] = val;
  };

  let finalContent = newContent;
  // MVU Zod Protection: Auto re-inject <StatusPlaceHolderImpl/> in first_mes
  if (fieldPath === 'data.first_mes' || fieldPath === 'first_mes') {
    if (typeof finalContent === 'string' && !finalContent.includes('<StatusPlaceHolderImpl/>')) {
      finalContent = finalContent + '\n\n<StatusPlaceHolderImpl/>';
    }
  }

  setField(newCard, fieldPath, finalContent);

  // Sync mirrors (Update the mirror if it exists, but don't recurse)
  const MIRRORS: Record<string, string> = {
    'description': 'data.description',
    'data.description': 'description',
    'personality': 'data.personality',
    'data.personality': 'personality',
    'scenario': 'data.scenario',
    'data.scenario': 'scenario',
    'first_mes': 'data.first_mes',
    'data.first_mes': 'first_mes',
    'mes_example': 'data.mes_example',
    'data.mes_example': 'mes_example',
  };

  if (MIRRORS[fieldPath]) {
    const mirrorPath = MIRRORS[fieldPath];
    let mirrorContent = finalContent;
    if (mirrorPath === 'data.first_mes' || mirrorPath === 'first_mes') {
      if (typeof mirrorContent === 'string' && !mirrorContent.includes('<StatusPlaceHolderImpl/>')) {
        mirrorContent = mirrorContent + '\n\n<StatusPlaceHolderImpl/>';
      }
    }
    setField(newCard, mirrorPath, mirrorContent);
  }

  return newCard;
};

export class ModOrchestrator {
  config: LLMConfig;
  private pool: LLMConfig[];
  private cursor = 0;

  /** Nhận provider chính + (tuỳ chọn) danh sách provider PHỤ → pool rải call round-robin
   *  (nhiều provider chạy song song cho các bước mod). 1 provider ⇒ như cũ. */
  constructor(config: LLMConfig, extraProviders: LLMConfig[] = []) {
    this.config = config;
    const usable = (c?: LLMConfig) => !!(c?.apiKey?.trim() && c?.model?.trim());
    const pool = [config, ...extraProviders.filter(usable)].filter(usable);
    this.pool = pool.length ? pool : [config];
  }

  /** Chọn provider kế tiếp (round-robin) cho 1 call. */
  private cfg(): LLMConfig {
    if (this.pool.length <= 1) return this.pool[0];
    const c = this.pool[this.cursor % this.pool.length];
    this.cursor = (this.cursor + 1) % this.pool.length;
    return c;
  }

  async analyze(card: CardV3, rules: OrchestratorRule[]) {
    // We sanitize avatar to save tokens
    const sanitized = JSON.parse(JSON.stringify(card));
    if (sanitized.avatar) sanitized.avatar = "[BASE64_IMAGE_OMITTED]";
    if (sanitized.data?.extensions?.avatar) sanitized.data.extensions.avatar = "[OMITTED]";

    const userPrompt = ANALYZE_CARD_PROMPT
      .replace('{MOD_RULES}', formatRules(rules))
      .replace('{CARD_JSON}', JSON.stringify(sanitized, null, 2));

    const response = await fetchLLM(SYSTEM_PROMPT, userPrompt, this.cfg());
    
    // Extract JSON array from markdown if present
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("LLM raw response:", response);
      throw new Error(`Could not parse JSON array from LLM response. Raw response: ${response.substring(0, 300)}...`);
    }
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      const err = e as Error;
      console.error("LLM JSON parse error:", err, "JSON string:", jsonMatch[0]);
      throw new Error(`JSON parse failed: ${err.message}. Content: ${jsonMatch[0].substring(0, 300)}...`);
    }
  }

  async modSection(card: CardV3, section: CardSection, rules: OrchestratorRule[], context: string, opts?: ModOptions) {
    const isMvuZod = CardParser.detectMvuZod(card);
    const isCode = section.is_code;
    const isSystemMvuEntry = section.label.includes('[mvu_update]') || section.label.includes('[initvar]') || section.section_id === 'system_prompt';

    // ═══ Chế độ MỞ RỘNG: đào sâu narrative (không dùng cho code / entry hệ thống MVU) ═══
    if (opts?.expand && !isCode && !isSystemMvuEntry) {
      const userPrompt = EXPAND_SECTION_PROMPT
        .replace('{INTENSITY}', opts.intensity || 'vừa')
        .replace('{MOD_RULES}', formatRules(rules))
        .replace('{LORE_DIGEST}', opts.loreDigest || '(không có)')
        .replace('{SECTION_LABEL}', section.label)
        .replace('{CONTENT_TYPE}', section.content_type || 'text_narrative')
        .replace('{ORIGINAL_CONTENT}', section.content)
        .replace('{PREVIOUSLY_MODIFIED_CONTEXT}', context || 'Chưa có context');
      const response = await fetchLLM(SYSTEM_PROMPT, userPrompt, this.cfg());
      return extractTag(response, 'expanded') || response.trim() || section.content;
    }

    if (isMvuZod && !isCode && !isSystemMvuEntry) {
      const entryIndex = section.section_id.startsWith('entry_') 
        ? section.section_id.replace('entry_', '') 
        : 'N/A';
        
      const userPrompt = MVUZOD_NARRATIVE_MOD_PROMPT
        .replace('{ENTRY_INDEX}', entryIndex)
        .replace('{ENTRY_COMMENT}', section.label)
        .replace('{POSITION}', section.entry_position || 'N/A')
        .replace('{ENTRY_KEYS}', '')
        .replace('{MOD_RULES}', formatRules(rules))
        .replace('{ORIGINAL_CONTENT}', section.content);

      const response = await fetchLLM(SYSTEM_PROMPT, userPrompt, this.cfg());
      // Output XML: lấy <modified> (fallback raw). Không parse JSON để tránh vỡ với nội dung lớn.
      return extractTag(response, 'modified') || response.trim() || section.content;
    }

    const promptTemplate = isCode ? MOD_SCRIPT_PROMPT : MOD_SECTION_PROMPT;
    
    let userPrompt = promptTemplate
      .replace('{SECTION_ID}', section.section_id)
      .replace('{SECTION_LABEL}', section.label)
      .replace('{FIELD_PATH}', section.field_path)
      .replace('{MOD_RULES_APPLIED}', formatRules(rules))
      .replace('{ORIGINAL_CONTENT}', section.content)
      .replace('{ORIGINAL_SCRIPT}', section.content);

    if (!isCode) {
      userPrompt = userPrompt
        .replace('{MIRROR_PATHS}', section.mirror_paths.join(', '))
        .replace('{CONTENT_TYPE}', section.content_type || 'text_narrative')
        .replace('{XML_TAGS}', 'auto-detect')
        .replace('{CARD_LANGUAGE}', 'Vietnamese')
        .replace('{IMPORTANCE_SCORE}', '90')
        .replace('{PREVIOUSLY_MODIFIED_CONTEXT}', context || 'Chưa có context');
    }

    const response = await fetchLLM(SYSTEM_PROMPT, userPrompt, this.cfg());
    if (isCode) {
      // Output XML: lấy <modified_script> (fallback raw) — chắc hơn JSON cho script dài.
      return extractTag(response, 'modified_script') || response.trim() || section.content;
    }
    return response;
  }

  /**
   * MOD BIẾN MVU-ZOD: gom biến schema → AI đề xuất đổi tên/nghĩa theo yêu cầu (output XML, chia lô).
   * Trả về danh sách remap để user duyệt; áp bằng CardParser.applyVariableRemap (deterministic).
   */
  async remapMvuVariables(card: CardV3, userRequest: string): Promise<VariableRemap[]> {
    const infos = CardParser.extractVariableInfos(card);
    if (infos.length === 0) return [];
    const BATCH = 60;
    const results: VariableRemap[] = [];
    for (let i = 0; i < infos.length; i += BATCH) {
      const batch = infos.slice(i, i + BATCH);
      const list = batch
        .map(v => `- ${v.key} | ${v.type} | ${v.describe || '(chưa có mô tả)'}${v.enumValues.length ? ' | enum: ' + v.enumValues.join(', ') : ''}`)
        .join('\n');
      const userPrompt = MVUZOD_VAR_REMAP_PROMPT
        .replace('{USER_REQUEST}', userRequest)
        .replace('{VARIABLE_LIST}', list);
      const response = await fetchLLM(SYSTEM_PROMPT, userPrompt, this.cfg());
      results.push(...parseRemapXml(response));
    }
    // Chỉ giữ remap có oldKey là biến THẬT + thực sự thay đổi.
    const valid = new Set(infos.map(v => v.key));
    return results.filter(r => valid.has(r.oldKey) && ((r.newKey && r.newKey !== r.oldKey) || r.newDescribe));
  }

  /** Đào sâu 1 phần nhỏ (sub-block) trong 1 section → trả về TOÀN BỘ section đã đào sâu. */
  async expandSubSection(card: CardV3, sectionContent: string, subMarker: string, instruction: string): Promise<string> {
    const userPrompt = EXPAND_SUBSECTION_PROMPT
      .replace('{SUB_MARKER}', subMarker)
      .replace('{INSTRUCTION}', instruction || '(chi tiết hoá tối đa, giữ đúng ý gốc)')
      .replace('{LORE_DIGEST}', buildLoreDigest(card))
      .replace('{ORIGINAL_CONTENT}', sectionContent);
    const response = await fetchLLM(SYSTEM_PROMPT, userPrompt, this.cfg());
    return extractTag(response, 'result') || response.trim() || sectionContent;
  }

  async syncKeywords(card: CardV3, rules: OrchestratorRule[], moddedEntries: { index: number; content: string }[]) {
    if (!moddedEntries || moddedEntries.length === 0) return [];
    
    const userPrompt = KEYWORD_SYNC_PROMPT
      .replace('{MOD_RULES}', formatRules(rules))
      .replace('{MODIFIED_ENTRIES_JSON}', JSON.stringify(moddedEntries, null, 2));

    const response = await fetchLLM(SYSTEM_PROMPT, userPrompt, this.cfg());
    
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("Could not parse JSON array for keyword sync");
      return [];
    }
    return JSON.parse(jsonMatch[0]);
  }

  async auditConsistency(card: CardV3, rules: OrchestratorRule[]) {
    const sanitized = JSON.parse(JSON.stringify(card));
    if (sanitized.avatar) sanitized.avatar = "[BASE64_IMAGE_OMITTED]";
    if (sanitized.data?.extensions?.avatar) sanitized.data.extensions.avatar = "[OMITTED]";

    const userPrompt = CONSISTENCY_AUDIT_PROMPT
      .replace('{MOD_RULES}', formatRules(rules))
      .replace('{MODIFIED_CARD_JSON}', JSON.stringify(sanitized, null, 2));

    const response = await fetchLLM(SYSTEM_PROMPT, userPrompt, this.cfg());
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("Could not parse JSON object for consistency audit");
      return null;
    }
    return JSON.parse(jsonMatch[0]);
  }

  async validateCard(originalCard: CardV3, modifiedCard: CardV3, rules: OrchestratorRule[]) {
    const isMvuZod = CardParser.detectMvuZod(modifiedCard);

    if (isMvuZod) {
      const sanitizeOriginal = JSON.parse(JSON.stringify(originalCard));
      if (sanitizeOriginal.avatar) sanitizeOriginal.avatar = "[BASE64_IMAGE_OMITTED]";
      const sanitizeModified = JSON.parse(JSON.stringify(modifiedCard));
      if (sanitizeModified.avatar) sanitizeModified.avatar = "[BASE64_IMAGE_OMITTED]";
      
      const scripts = modifiedCard.data.extensions?.tavern_helper?.scripts || [];
      const schemaScript = scripts[1]?.content || '';
      
      const entries = modifiedCard.data.character_book?.entries || [];
      const updateRules = entries.find(e => e.comment?.includes('[mvu_update]'))?.content || '';
      const ejsController = entries.find(e => e.content?.trim().startsWith('@@preprocessing'))?.content || '';
      const initvar = entries.find(e => e.comment?.includes('[initvar]'))?.content || '';

      const userPrompt = MVUZOD_VALIDATE_PROMPT
        .replace('{MOD_SUMMARY}', formatRules(rules))
        .replace('{SCHEMA_CONTENT}', schemaScript.substring(0, 2000))
        .replace('{UPDATE_RULES_CONTENT}', updateRules.substring(0, 2000))
        .replace('{EJS_CONTROLLER_PREVIEW}', ejsController.substring(0, 2000))
        .replace('{INITVAR_CONTENT}', initvar.substring(0, 2000));

      const response = await fetchLLM(SYSTEM_PROMPT, userPrompt, this.cfg());
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("Could not parse JSON object for MVU-Zod validation");
        return null;
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        status: parsed.validation_status || 'PASS',
        stats: {
          protected_fields_verified: (parsed.passed_checks?.length || 2) * 5
        },
        issues: parsed.issues?.map((issue: { severity?: string; check?: string; description?: string; fix?: string }) => ({
          severity: issue.severity || 'MEDIUM',
          category: issue.check || 'MVUZOD_INTEGRITY',
          description: issue.description || '',
          fix: issue.fix || ''
        })) || []
      };
    }

    const sanitizeOriginal = JSON.parse(JSON.stringify(originalCard));
    if (sanitizeOriginal.avatar) sanitizeOriginal.avatar = "[BASE64_IMAGE_OMITTED]";
    if (sanitizeOriginal.data?.extensions?.avatar) sanitizeOriginal.data.extensions.avatar = "[OMITTED]";

    const sanitizeModified = JSON.parse(JSON.stringify(modifiedCard));
    if (sanitizeModified.avatar) sanitizeModified.avatar = "[BASE64_IMAGE_OMITTED]";
    if (sanitizeModified.data?.extensions?.avatar) sanitizeModified.data.extensions.avatar = "[OMITTED]";

    const userPrompt = VALIDATE_CARD_PROMPT
      .replace('{MOD_RULES}', formatRules(rules))
      .replace('{ORIGINAL_CARD_JSON}', JSON.stringify(sanitizeOriginal, null, 2))
      .replace('{MODIFIED_CARD_JSON}', JSON.stringify(sanitizeModified, null, 2));

    const response = await fetchLLM(SYSTEM_PROMPT, userPrompt, this.cfg());
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("Could not parse JSON object for validation");
      return null;
    }
    return JSON.parse(jsonMatch[0]);
  }
}
