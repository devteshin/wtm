/**
 * Словарь синонимов показателей: код из indicator_set_list → произношения.
 * Расширяется по реальным логам ошибок распознавания — это живой справочник.
 */
import type { VoiceDictionary } from './voiceParser';

type DictionaryInput = {
    indicators: Array<{ id: number; code: string }>;
    synonyms?: frontend.IIndicatorVoiceSynonym[];
};

export function buildDictionary({ indicators, synonyms = [] }: DictionaryInput): VoiceDictionary {
    const synonymsMap = new Map<number, string[]>();

    for (const row of synonyms) {
        const list = synonymsMap.get(row.indicator_id) ?? [];
        list.push(row.synonym.toLowerCase());
        synonymsMap.set(row.indicator_id, list);
    }

    return {
        indicators: indicators.map((ind) => ({
            id: String(ind.id),
            synonyms: synonymsMap.get(ind.id) ?? [ind.code.toLowerCase()],
        })),
    };
}