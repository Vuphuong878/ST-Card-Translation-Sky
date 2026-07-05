import { CardV3 } from '../types/card';

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
    const scripts = card?.data?.extensions?.tavern_helper?.scripts || [];
    const schemaScript = scripts.find(s => s.content && (s.content.includes('registerMvuSchema') || s.content.includes('mvu_zod.js')));
    if (!schemaScript || !schemaScript.content) return [];
    
    const paths: string[] = [];
    const keyPattern = /"([^"]+)":\s*z\./g;
    let match;
    while ((match = keyPattern.exec(schemaScript.content)) !== null) {
      paths.push(match[1]);
    }
    return Array.from(new Set(paths));
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
