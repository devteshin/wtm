/**
 * useVoiceDictation — сердце голосового ввода.
 *
 * Машина состояний: idle (выключено) → listening (микрофон открыт, диктовка).
 * На каждый финальный сегмент ASR зовём parseTranscript и применяем
 * результат к драфту. Команда «запиши» — и есть подтверждение: до неё
 * на сервер ничего не уходит.
 */
import { ref, computed } from 'vue';
import {
  parseTranscript,
  type VoiceDictionary,
  type VoiceCommand,
  type ParsedValue,
} from './voiceParser';
import type { AsrEngine } from './asrEngine';

export type VoiceState = 'idle' | 'listening';

export interface DraftValue extends ParsedValue {
  /** откуда пришло значение: голос или ручная правка */
  source: 'voice' | 'manual';
}

export interface VoiceDraft {
  probeNum: number | null;
  /** ключ — String(indicator_id) из меты */
  values: Record<string, DraftValue>;
  warnings: string[];
  unknown: string[];
}

export interface UseVoiceDictationOptions {
  /** словарь — функция: показатели зависят от загруженной меты */
  getDictionary: () => VoiceDictionary;
  /**
   * Вызывается по команде «запиши» и кнопке «Записать».
   * Верните false (например, дубль номера пробы) — драфт НЕ сбросится
   * и лаборант сможет поправить номер без повторной диктовки.
   */
  onSave: (draft: VoiceDraft) => boolean | Promise<boolean>;
  engine: AsrEngine;
}

const emptyDraft = (): VoiceDraft => ({
  probeNum: null,
  values: {},
  warnings: [],
  unknown: [],
});

export function useVoiceDictation(options: UseVoiceDictationOptions) {
  const state = ref<VoiceState>('idle');
  const partial = ref('');
  const draft = ref<VoiceDraft>(emptyDraft());
  const repeatText = ref('');

  const canSave = computed(
    () => draft.value.probeNum !== null && Object.keys(draft.value.values).length > 0,
  );

  const warnings = computed(() => draft.value.warnings);
  const unknown = computed(() => draft.value.unknown);

  const reset = (): void => {
    draft.value = emptyDraft();
    repeatText.value = '';
  };

  /** эхо для команды «повтори»: «проба 100, углерод 15, сера 12,5» */
  const makeEcho = (d: VoiceDraft, dict: VoiceDictionary): string => {
    const parts: string[] = [];
    if (d.probeNum !== null) parts.push(`проба ${d.probeNum}`);
    for (const ind of dict.indicators) {
      const v = d.values[ind.id];
      if (v) parts.push(`${ind.synonyms[0]} ${String(v.value).replace('.', ',')}`);
    }
    return parts.join(', ');
  };

  const applyCommand = (cmd: VoiceCommand, dict: VoiceDictionary): void => {
    console.log('[dictation] команда:', cmd.type, cmd);
    switch (cmd.type) {
      case 'save':
        void save();
        break;
      case 'cancel':
        reset();
        break;
      case 'repeat':
        repeatText.value = makeEcho(draft.value, dict);
        break;
      case 'fix': {
        if (cmd.field === 'probeNum') {
          if (cmd.value !== undefined) draft.value.probeNum = cmd.value;
        } else if (cmd.field && cmd.value !== undefined) {
          draft.value.values[cmd.field] = {
            value: cmd.value,
            decimals: cmd.decimals ?? 0,
            source: 'voice',
          };
        }
        break;
      }
    }
  };

  const onFinal = (text: string): void => {
    const dict = options.getDictionary();
    console.log('[dictation] словарь:', dict.indicators.map(i => `${i.id}:${i.synonyms.join('/')}`));
    const res = parseTranscript(text, dict);
    console.log('[dictation] parseTranscript →', {
      kind: res.kind,
      patch: res.patch,
      unknown: res.unknown,
      command: res.command ?? null,
    });

    // сначала сливаем patch (там могут быть значения до команды),
    // потом применяем команду — иначе «сера 12 запиши» потеряет серу
    if (res.patch.probeNum !== null) draft.value.probeNum = res.patch.probeNum;
    for (const [id, v] of Object.entries(res.patch.values)) {
      draft.value.values[id] = { ...v, source: 'voice' };
    }
    if (res.patch.warnings.length) draft.value.warnings.push(...res.patch.warnings);
    draft.value.unknown = res.unknown;
    partial.value = '';

    if (res.kind === 'command' && res.command) applyCommand(res.command, dict);
  };

  const handlers = {
    onPartial: (t: string): void => {
      console.log('[dictation] partial:', JSON.stringify(t));
      partial.value = t;
    },
    onFinal: (t: string): void => {
      console.log('[dictation] ФИНАЛ дошёл до композабла:', JSON.stringify(t));
      onFinal(t);
    },
  };

  const start = async (): Promise<void> => {
    console.log('[dictation] start(): подписываюсь на движок =', options.engine);
    await options.engine.start(handlers);
    state.value = 'listening';
    console.log('[dictation] state = listening');
  };

  const stop = (): void => {
    options.engine.stop();
    state.value = 'idle';
    partial.value = '';
  };

  const toggle = async (): Promise<void> => {
    if (state.value === 'idle') await start();
    else stop();
  };

  const save = async (): Promise<void> => {
    console.log('[dictation] save(): probeNum =', draft.value.probeNum,
                '| значений =', Object.keys(draft.value.values).length);    
    if (!canSave.value) {
      draft.value.warnings.push('нужны номер пробы и хотя бы одно значение');
      return;
    }
    const ok = await options.onSave(draft.value);
    if (ok !== false) reset(); // false → драфт остался, лаборант правит номер
  };

  // ---- ручная правка тем же драфтом ----

  const setProbeNum = (n: number | null): void => {
    draft.value.probeNum = n;
  };

  const setValue = (id: string, v: number | null): void => {
    if (v === null) {
      delete draft.value.values[id];
      return;
    }
    draft.value.values[id] = {
      value: v,
      decimals: String(v).split('.')[1]?.length ?? 0,
      source: 'manual',
    };
  };

  return {
    // состояние
    state, partial, draft, canSave, warnings, unknown, repeatText,
    // управление
    start, stop, toggle, save, reset,
    // ручной ввод
    setProbeNum, setValue,
  };
}
