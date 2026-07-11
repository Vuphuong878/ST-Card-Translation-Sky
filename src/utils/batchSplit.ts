/**
 * src/utils/batchSplit.ts — chia field lorebook thành các LÔ dịch/mod (audit đợt 3).
 * ──────────────────────────────────────────────────────────────────────────────
 * Trước đây logic này bị ĐÚP NGUYÊN KHỐI ở 2 nơi trong useTranslation (pipeline DỊCH ~130 dòng và
 * pipeline MOD ~70 dòng) — sửa 1 nơi quên nơi kia là lệch (bản Mod đã lệch: thiếu smart-packing,
 * thiếu isolate entry dài). Gom về 1 hàm, hai pipeline truyền options khác nhau:
 *
 *  - DỊCH:  getLength = original.length · isolate entry dài (chunk riêng) · softCharCap 30K ·
 *           tách theo model routing · smartPacking (🚀 Dịch siêu tốc).
 *  - MOD:   getLength = (translated||original).length · không isolate · không soft · không smart.
 *
 * Bất biến an toàn: nhóm SCHEMA MVU (initvar/controller/mvu_logic) LUÔN 1 field/lô, xếp TRƯỚC
 * (typeOrder) để bản dịch schema nạp từ điển biến cho các lô sau — đừng đổi nếu không hiểu covariance.
 */
import type { TranslationField } from '../types/card';
import { smartPackFields } from './smartPack';

const SEP = ''; // ngăn cách entryType|model trong key gộp nhóm (không xuất hiện trong data)
const SCHEMA_TYPES = new Set(['initvar', 'mvu_logic', 'controller']);
const TYPE_ORDER = ['initvar', 'controller', 'mvu_logic', 'rules', 'narrative', 'other'];

export interface LorebookSplitOptions {
  /** Số field tối đa / lô (nhóm không phải schema). */
  batchSize: number;
  /** Trần ký tự cứng / lô. */
  maxBatchChars: number;
  /** true = gộp nhóm theo entryType (schema 1-1, xếp trước). */
  mvuEnabled: boolean;
  /** Model đích của field (model routing) — bỏ qua nếu không tách theo model. */
  getModelKey?: (f: TranslationField) => string;
  /** Độ dài để đếm ký tự (mặc định original.length; MOD dùng translated||original). */
  getLength?: (f: TranslationField) => number;
  /** Entry dài hơn ngưỡng này → 1 lô riêng (để dịch chunk); 0/undefined = tắt. */
  isolateChars?: number;
  /** Trần mềm: khi lô đã có ≥ softMinCount field và sắp vượt → chốt lô sớm; 0/undefined = tắt. */
  softCharCap?: number;
  softMinCount?: number;
  /** ⚡ Dịch siêu tốc: bin-packing entry ngắn (chỉ nhóm không phải schema). */
  smartPacking?: boolean;
}

export interface LorebookSplitResult {
  batches: TranslationField[][];
  /** Song song với batches: true = lô GỘP entry ngắn (smart pack) → ưu tiên model phụ. */
  prefer: boolean[];
  /** Tóm tắt nhóm (để log), vd "initvar:3, narrative:40". */
  summary: string;
}

export function splitLorebookBatches(
  all: TranslationField[],
  opts: LorebookSplitOptions,
): LorebookSplitResult {
  const getLen = opts.getLength ?? ((f: TranslationField) => (f.original || '').length);
  const getModel = opts.getModelKey ?? (() => '');
  const isolate = opts.isolateChars ?? 0;
  const softCap = opts.softCharCap ?? 0;
  const softMin = opts.softMinCount ?? 3;

  const batches: TranslationField[][] = [];
  const prefer: boolean[] = [];
  const push = (b: TranslationField[], p = false) => { batches.push(b); prefer.push(p); };

  /** Nhét tuần tự vào lô: đầy số lượng / vượt trần cứng / (tuỳ chọn) vượt trần mềm → chốt lô. */
  const fillSequential = (fields: TranslationField[], perBatch: number, useSoft: boolean) => {
    let cur: TranslationField[] = [];
    let chars = 0;
    for (const f of fields) {
      const len = getLen(f);
      if (isolate > 0 && len > isolate) {
        if (cur.length > 0) { push(cur); cur = []; chars = 0; }
        push([f]); // entry dài → lô riêng, pipeline sẽ dịch theo chunk
        continue;
      }
      const hardHit = cur.length >= perBatch || (cur.length > 0 && chars + len > opts.maxBatchChars);
      const softHit = useSoft && softCap > 0 && cur.length >= softMin && chars + len > softCap;
      if (hardHit || softHit) { push(cur); cur = []; chars = 0; }
      cur.push(f);
      chars += len;
    }
    if (cur.length > 0) push(cur);
  };

  let summary = '';
  if (opts.mvuEnabled) {
    // Gộp theo entryType (+model nếu có routing); schema 1-1 và xếp trước.
    const groups: Record<string, TranslationField[]> = {};
    for (const f of all) {
      const key = `${f.entryType || 'other'}${SEP}${getModel(f)}`;
      (groups[key] ||= []).push(f);
    }
    const sorted = Object.keys(groups).sort((a, b) => {
      const ia = TYPE_ORDER.indexOf(a.split(SEP)[0]);
      const ib = TYPE_ORDER.indexOf(b.split(SEP)[0]);
      if (ia === ib) return a.localeCompare(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    for (const key of sorted) {
      const base = key.split(SEP)[0];
      const perBatch = SCHEMA_TYPES.has(base) ? 1 : opts.batchSize;
      if (opts.smartPacking && perBatch > 1) {
        for (const p of smartPackFields(groups[key])) push(p.batch, p.preferSecondary);
        continue;
      }
      fillSequential(groups[key], perBatch, false);
    }
    summary = sorted
      .map(k => {
        const [base, model] = k.split(SEP);
        return `${model ? `${base}_|_${model}` : base}:${groups[k].length}`;
      })
      .join(', ');
  } else {
    // Không MVU: chỉ tách theo model routing (mặc định 1 nhóm).
    const groups: Record<string, TranslationField[]> = {};
    for (const f of all) (groups[getModel(f)] ||= []).push(f);
    for (const mk of Object.keys(groups)) {
      if (opts.smartPacking) {
        for (const p of smartPackFields(groups[mk])) push(p.batch, p.preferSecondary);
        continue;
      }
      fillSequential(groups[mk], opts.batchSize, true);
    }
  }

  return { batches, prefer, summary };
}
