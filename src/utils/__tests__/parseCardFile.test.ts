import { describe, it, expect } from 'vitest';
import { parseCardFile } from '../parseCardFile';

const jsonFile = (obj: unknown, name = 'card.json') =>
  new File([JSON.stringify(obj)], name, { type: 'application/json' });

describe('parseCardFile', () => {
  it('JSON card hợp lệ → trả card + isPng=false', async () => {
    const card = { spec: 'chara_card_v3', data: { name: 'Test', first_mes: 'hi' } };
    const res = await parseCardFile(jsonFile(card));
    expect(res.isPng).toBe(false);
    expect(res.dataUrl).toBeNull();
    expect(res.fileName).toBe('card.json');
    expect((res.card as { spec?: string }).spec).toBe('chara_card_v3');
  });

  it('JSON không phải card ST → throw', async () => {
    await expect(parseCardFile(jsonFile({ foo: 'bar' }))).rejects.toThrow(/không hợp lệ|card/i);
  });

  it('JSON rác → throw lỗi parse', async () => {
    const bad = new File(['{ not json'], 'bad.json', { type: 'application/json' });
    await expect(parseCardFile(bad)).rejects.toThrow(/JSON/i);
  });

  it('đuôi file lạ → throw', async () => {
    const txt = new File(['hello'], 'note.txt', { type: 'text/plain' });
    await expect(parseCardFile(txt)).rejects.toThrow(/\.json|\.png/i);
  });
});
