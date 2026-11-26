/**
 * Парсер голосовых транскриптов результатов измерений.
 *
 * Чистая функция: на вход текст от ASR + словарь показателей,
 * на выходе — черновик пробы или голосовая команда.
 * Ничего не знает об UI и сети — легко тестировать и подменять ASR.
 *
 * Регламент диктовки:
 *   «проба N» / «номер N» → номер пробы (целое, до 9999)
 *   «{показатель} {число}» → значение показателя
 *   Числа: «12», «двенадцать», «12 и 25», «12 запятая 25», «12 точка 25»,
 *   «12 целых 25 сотых», «12,25», «12.25», «одна целая две», «ноль целых пять»,
 *   «пять десятых», «25 сотых», «пол»
 *   Команды: «запиши/готово/нормально/сохрани», «повтори», «отмена»,
 *   «исправь {показатель|пробу} на {число}»
 */

export interface VoiceIndicator {
  /** идентификатор показателя (indicator_id из меты измерения) */
  id: string;
  /** варианты произношения: ['углерод'], ['сера'] … */
  synonyms: string[];
}

export interface VoiceDictionary {
  indicators: VoiceIndicator[];
}

/** Распознанное значение с честной метадатой: сколько знаков прозвучало */
export interface ParsedValue {
  value: number;
  /** количество озвученных знаков после разделителя (0 — целое) */
  decimals: number;
}

export interface DraftPatch {
  probeNum: number | null;
  values: Record<string, ParsedValue>;
  /** «повторная диктовка», «номер пробы должен быть целым» и т. п. */
  warnings: string[];
}

export type VoiceCommandType = 'save' | 'repeat' | 'cancel' | 'fix';

export interface VoiceCommand {
  type: VoiceCommandType;
  /** только для fix: id показателя или 'probeNum' */
  field?: string;
  value?: number;
  decimals?: number;
}

export interface VoiceParseResult {
  kind: 'draft' | 'command';
  /** только для kind === 'command' */
  command?: VoiceCommand;
  /** всегда есть: значения до команды (например «сера 12 и 25 запиши») */
  patch: DraftPatch;
  /** токены, которые не удалось разобрать — для подсветки в UI */
  unknown: string[];
}

// ---------------------------------------------------------------- словари

const DIGITS: Record<string, number> = {
  'ноль': 0, 'нуль': 0,
  'один': 1, 'одна': 1,
  'два': 2, 'две': 2,
  'три': 3, 'четыре': 4, 'пять': 5,
  'шесть': 6, 'семь': 7, 'восемь': 8, 'девять': 9,
};
const TEENS: Record<string, number> = {
  'десять': 10, 'одиннадцать': 11, 'двенадцать': 12, 'тринадцать': 13,
  'четырнадцать': 14, 'пятнадцать': 15, 'шестнадцать': 16,
  'семнадцать': 17, 'восемнадцать': 18, 'девятнадцать': 19,
};
const TENS: Record<string, number> = {
  'двадцать': 20, 'тридцать': 30, 'сорок': 40, 'пятьдесят': 50,
  'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80, 'девяносто': 90,
};
const HUNDREDS: Record<string, number> = {
  'сто': 100, 'двести': 200, 'триста': 300, 'четыреста': 400,
  'пятьсот': 500, 'шестьсот': 600, 'семьсот': 700,
  'восемьсот': 800, 'девятьсот': 900,
};
const THOUSANDS: Record<string, number> = { 'тысяча': 1000, 'тысячи': 1000, 'тысяч': 1000 };

/** слова-связки десятичной части */
const CONNECTORS = new Set(['и', 'запятая', 'точка', 'целых', 'целая', 'целое', 'целую']);
/** масштаб дробной части словами: «сотых» → 2 знака */
const SCALE: Record<string, number> = {
  'десятых': 1, 'десятая': 1, 'десятые': 1, 'десятой': 1,
  'сотых': 2, 'сотая': 2, 'сотые': 2, 'сотой': 2,
  'тысячных': 3, 'тысячная': 3, 'тысячные': 3, 'тысячной': 3,
};
const PROBE_WORDS = new Set(['проба', 'пробы', 'пробе', 'пробу', 'пробой', 'проб', 'номер']);
const HALF = new Set(['пол', 'половина']);

const COMMANDS: Record<VoiceCommandType, string[]> = {
  save: ['запиши', 'записать', 'записываю', 'готово', 'готов', 'сохрани', 'сохранить', 'сохранил', 'нормально', 'норм', 'ок'],
  repeat: ['повтори', 'повторить', 'повторяй', 'прочитай', 'прочесть'],
  cancel: ['отмена', 'отмени', 'отменить', 'сброс', 'сбросить'],
  fix: ['исправь', 'исправить', 'замени', 'заменить', 'поправь', 'поправить'],
};

const isDigitTok = (t: string): boolean => /^\d+([.,]\d+)?$/.test(t);
const isNumWord = (t: string): boolean =>
  DIGITS.hasOwnProperty(t) || TEENS.hasOwnProperty(t) ||
  TENS.hasOwnProperty(t) || HUNDREDS.hasOwnProperty(t) || THOUSANDS.hasOwnProperty(t);

// ---------------------------------------------------------------- токенизация

function tokenize(text: string): string[] {
  const prepared = text.toLowerCase()
    .replace(/[«»"']/g, ' ')
    .replace(/(\d)\s*,\s*(\d)/g, '$1.$2'); // «12,25» → «12.25» до разбиения на токены
  const raw = prepared.split(/[\s,;:!?()—–-]+/);
  const out: string[] = [];
  for (let t of raw) {
    t = t.replace(/[^а-яё0-9.]/g, '');
    if (!t) continue;
    // хвостовая точка/запятая вне числа — мусор («15,» при паузе ASR)
    if (!/^\d/.test(t) && !/\d$/.test(t)) t = t.replace(/[.,]/g, '');
    else t = t.replace(/[.,]$/, '');
    if (t) out.push(t);
  }
  return out;
}

// ---------------------------------------------------------------- числа

/** число из слов: «две тысячи триста сорок пять» → 2345 */
function readNumberWords(tokens: string[], i: number): { value: number; used: number } | null {
  let val = 0, group = 0, used = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (THOUSANDS.hasOwnProperty(t)) { val = (group || 1) * THOUSANDS[t]; group = 0; used++; i++; }
    else if (HUNDREDS.hasOwnProperty(t)) { group += HUNDREDS[t]; used++; i++; }
    else if (TENS.hasOwnProperty(t)) { group += TENS[t]; used++; i++; }
    else if (TEENS.hasOwnProperty(t)) { group += TEENS[t]; used++; i++; }
    else if (DIGITS.hasOwnProperty(t)) { group += DIGITS[t]; used++; i++; }
    else break;
  }
  return used ? { value: val + group, used } : null;
}

/** вклад слова в дробную часть — одна ведущая цифра: двадцать→2, пятьдесят→5 */
function fracDigit(n: number): string { return n < 10 ? String(n) : String(n)[0]; }

/** дробная часть словами: «двадцать пять», «ноль пять», «5» … */
function readFracWords(tokens: string[], i: number): { value: number; decimals: number; used: number } | null {
  let digits = '', used = 0, scale: number | null = null;
  while (i + used < tokens.length) {
    const t = tokens[i + used];
    if (SCALE[t]) { scale = SCALE[t]; used++; break; }
    if (isDigitTok(t)) { digits += t.replace(/[.,]/g, ''); used++; continue; }
    const nw = readNumberWords(tokens, i + used);
    if (nw) {
      digits += fracDigit(nw.value);
      used += nw.used;
      continue;
    }
    break;
  }
  if (!used || (digits === '' && scale === null)) return null;
  if (scale !== null) {
    const padded = digits.padStart(scale, '0'); // «5 сотых» → «05» → 0.05
    return { value: Number(padded) / Math.pow(10, scale), decimals: scale, used };
  }
  return { value: Number(digits) / Math.pow(10, digits.length), decimals: digits.length, used };
}

/** числовое выражение после показателя/пробы */
function readNumberExpr(tokens: string[], i: number): { value: number; decimals: number; used: number } | null {
  const t = tokens[i];
  if (!t) return null;

  if (isDigitTok(t)) {
    const norm = t.replace(',', '.');
    const [intPart, fracPart] = norm.split('.');
    const value = Number(norm);
    const decimals = fracPart ? fracPart.length : 0;
    i++;
    // «25 сотых» без «целых»: число целиком становится дробью
    if (i < tokens.length && SCALE[tokens[i]]) {
      const s = SCALE[tokens[i]];
      const d = fracPart !== undefined ? fracPart : intPart;
      const frac = Number(d.padStart(s, '0')) / Math.pow(10, s);
      return { value: fracPart !== undefined ? Number(intPart) + frac : frac, decimals: s, used: 2 };
    }
    // «12 и 25», «12 запятая 25», «12 точка 25», «12 целых 25»
    if (i < tokens.length && CONNECTORS.has(tokens[i])) {
      const frac = readFracWords(tokens, i + 1);
      if (frac) {
        return { value: Number(intPart) + frac.value, decimals: frac.decimals, used: 2 + frac.used };
      }
    }
    return { value, decimals, used: 1 };
  }

  if (isNumWord(t)) {
    const nw = readNumberWords(tokens, i);
    if (!nw) return null;
    let j = i + nw.used;
    let value = nw.value, decimals = 0, used = nw.used;
    if (j < tokens.length && SCALE[tokens[j]]) {
      const s = SCALE[tokens[j]];
      value = nw.value / Math.pow(10, s); // «пять десятых» → 0.5
      decimals = s;
      used = nw.used + 1;
    } else if (j < tokens.length && CONNECTORS.has(tokens[j])) {
      // «одна целая две», «ноль целых пять»
      const frac = readFracWords(tokens, j + 1);
      if (frac) {
        value = nw.value + frac.value;
        decimals = frac.decimals;
        used = nw.used + 1 + frac.used;
      }
    }
    return { value, decimals, used };
  }

  if (HALF.has(t)) return { value: 0.5, decimals: 1, used: 1 };

  return null;
}

// ---------------------------------------------------------------- словарь показателей

function stem(w: string): string { return w.length >= 4 ? w.slice(0, -1) : w; }

type IndicatorMatcher = (token: string) => string | null;

function buildMatcher(dict: VoiceDictionary): IndicatorMatcher {
  const stems: { stem: string; id: string; full: string }[] = [];
  for (const ind of dict.indicators) {
    for (const syn of ind.synonyms) {
      const s = stem(syn.toLowerCase());
      if (s) stems.push({ stem: s, id: ind.id, full: syn.toLowerCase() });
    }
  }
  // длинные основы — приоритет («молибден» важнее короче совпадения)
  stems.sort((a, b) => b.stem.length - a.stem.length);
  return (token) => {
    for (const s of stems) if (token === s.full || token.startsWith(s.stem)) return s.id;
    return null;
  };
}

// ---------------------------------------------------------------- разбор

export function parseTranscript(text: string, dict: VoiceDictionary): VoiceParseResult {
  const tokens = tokenize(text);
  const matchIndicator = buildMatcher(dict);
  const consumed: boolean[] = new Array(tokens.length).fill(false);
  const unknown: string[] = [];
  const warnings: string[] = [];

  const patch: DraftPatch = { probeNum: null, values: {}, warnings };
  const cmd: { type: VoiceCommandType | null; field: string | null; value: number | null; decimals: number | null } =
    { type: null, field: null, value: null, decimals: null };

  // проход 1: команды (cancel — высший приоритет, затем fix, save, repeat)
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    for (const type of ['cancel', 'fix', 'save', 'repeat'] as VoiceCommandType[]) {
      if (COMMANDS[type].includes(t)) {
        if (cmd.type === null || (type === 'fix' && cmd.type !== 'cancel')) cmd.type = type;
        consumed[i] = true;
        break;
      }
    }
  }

  // проход 2: fix — найти поле и значение
  for (let i = 0; i < tokens.length; i++) {
    if (!COMMANDS.fix.includes(tokens[i])) continue;
    for (let j = i + 1; j < tokens.length && j <= i + 3; j++) {
      const tok = tokens[j];
      if (PROBE_WORDS.has(tok)) {
        const nw = readNumberWords(tokens, j + 1) ??
          (isDigitTok(tokens[j + 1]) ? { value: Number(tokens[j + 1].replace(',', '.')), used: 1 } : null);
        if (nw) {
          consumed[j] = true;
          for (let k = 1; k <= nw.used; k++) consumed[j + k] = true;
          cmd.field = 'probeNum'; cmd.value = Math.trunc(nw.value); cmd.decimals = 0;
        }
        break;
      }
      const ind = matchIndicator(tok);
      if (ind) {
        let k = j + 1;
        if (tokens[k] === 'на') { consumed[k] = true; k++; }
        const num = readNumberExpr(tokens, k);
        if (num) {
          consumed[j] = true;
          for (let m = 0; m < num.used; m++) consumed[k + m] = true;
          cmd.field = ind; cmd.value = num.value; cmd.decimals = num.decimals;
        }
        break;
      }
    }
  }

  // проход 3: проба и показатели
  let target: string | null = null; // 'probeNum' | indicator id
  for (let i = 0; i < tokens.length; i++) {
    if (consumed[i]) continue;
    const t = tokens[i];

    if (PROBE_WORDS.has(t)) {
      consumed[i] = true;
      target = 'probeNum';
      continue;
    }
    const ind = matchIndicator(t);
    if (ind) {
      consumed[i] = true;
      if (target === ind) warnings.push(`повторная диктовка: ${ind}`);
      target = ind;
      continue;
    }
    if (target === null) { unknown.push(t); continue; }

    const num = readNumberExpr(tokens, i);
    if (num) {
      for (let k = 0; k < num.used; k++) consumed[i + k] = true;
      if (target === 'probeNum') {
        patch.probeNum = Math.trunc(num.value);
        if (patch.probeNum > 9999) warnings.push('номер пробы больше 9999');
        if (num.decimals > 0) warnings.push('номер пробы должен быть целым');
      } else {
        if (patch.values[target]) warnings.push(`повторная диктовка: ${target}`);
        patch.values[target] = { value: num.value, decimals: num.decimals };
      }
      target = null;
    } else {
      unknown.push(t);
    }
  }

  const result: VoiceParseResult = { kind: cmd.type ? 'command' : 'draft', patch, unknown };
  if (cmd.type) {
    result.command = {
      type: cmd.type,
      field: cmd.field ?? undefined,
      value: cmd.value ?? undefined,
      decimals: cmd.decimals ?? undefined,
    };
  }

  return result;
}
