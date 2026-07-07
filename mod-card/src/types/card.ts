export interface ScriptObject {
  type: string;
  enabled: boolean;
  name: string;
  id: string;
  content: string;
  info: string;
  button?: unknown;
  data?: unknown;
}

export interface RegexObject {
  id: string;
  scriptName: string;
  findRegex: string;
  replaceString: string;
  trimStrings: string[];
  placement: number[];
  disabled: boolean;
  markdownOnly: boolean;
  promptOnly: boolean;
  runOnEdit: boolean;
  substituteRegex: number;
  minDepth?: number | null;
  maxDepth?: number | null;
}

export interface EntryObject {
  id: number;
  keys: string[];
  secondary_keys: string[];
  comment: string;
  content: string;
  constant: boolean;
  selective: boolean;
  insertion_order: number;
  enabled: boolean;
  position: string;
  use_regex: boolean;
  extensions: {
    position: number;
    exclude_recursion: boolean;
    display_index: number;
    probability: number;
    useProbability: boolean;
    depth: number;
    selectiveLogic: number;
    outlet_name: string;
    group: string;
    group_override: boolean;
    group_weight: number;
    prevent_recursion: boolean;
    delay_until_recursion: boolean;
    scan_depth: number | null;
    match_whole_words: boolean | null;
    use_group_scoring: boolean;
    case_sensitive: boolean | null;
    automation_id: string;
    role: number;
    vectorized: boolean;
    sticky: number;
    cooldown: number;
    delay: number;
    ignore_budget: boolean;
    [key: string]: unknown;
  };
}

export interface CardV3Data {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  tags: string[];
  creator: string;
  character_version: string;
  alternate_greetings: string[];
  extensions: {
    talkativeness?: string;
    fav?: boolean;
    world?: string;
    depth_prompt?: {
      prompt: string;
      depth: number;
      role: string;
    };
    tavern_helper?: {
      scripts?: ScriptObject[];
      variables?: Record<string, unknown>;
    };
    TavernHelper_scripts?: ScriptObject[];
    regex_scripts?: RegexObject[];
    character_book?: {
      name: string;
      entries: EntryObject[];
    };
    [key: string]: unknown;
  };
  character_book?: {
    name: string;
    entries: EntryObject[];
  };
  [key: string]: unknown;
}

export interface CardV3 {
  spec: "chara_card_v3" | string;
  spec_version: "3.0" | string;
  create_date: string;
  avatar?: string;
  name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  creatorcomment?: string;
  talkativeness?: string;
  fav?: boolean;
  tags?: string[];
  data: CardV3Data;
  /** Đánh dấu card này thực ra là 1 Lorebook standalone được BỌC để tái dùng pipeline mod. */
  __lorebookOnly?: boolean;
  /** Lorebook gốc (giữ nguyên format) để export lại đúng khi ở chế độ mod Lorebook. */
  __lorebookRaw?: unknown;
}
