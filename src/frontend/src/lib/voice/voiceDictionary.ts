/**
 * Словарь синонимов показателей: код из indicator_set_list → произношения.
 * Расширяется по реальным логам ошибок распознавания — это живой справочник.
 */
import type { VoiceDictionary } from './voiceParser';

// ключи — id показателей (indicator.id из БД)
const SYNONYMS: Record<number, string[]> = {
  1: ['углерод'],
  2: ['сера'],
};

export interface DictionarySource {
  id: number;
  code: string;
}

export function buildDictionary(indicators: DictionarySource[]): VoiceDictionary {
  return {
    indicators: indicators.map((ind) => ({
      // ключ драфта — строковый id, чтобы совпадал с row.values в таблице
      id: String(ind.id),
      synonyms: SYNONYMS[ind.id] ?? [ind.code.toLowerCase()],
    })),
  };
}