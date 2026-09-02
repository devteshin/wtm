// utils/numberFormat.ts
export const createNumberFormatter = (
  locale = 'ru-RU',
  fractionDigits: number
) =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

// Форматировщик для веса (2 знака) — как у тебя было
export const twoDecimalFormatter  = createNumberFormatter('ru-RU', 2);

// Форматировщик для высокой точности (3 знака)
export const highPrecisionFormatter = createNumberFormatter('ru-RU', 3);

// Форматировщик без дробной части
export const integerFormatter = createNumberFormatter('ru-RU', 0);

export const formatNumber = (
  value: number | null | undefined,
  formatter: Intl.NumberFormat,
  emptyValue: string = '-'
): string => {
  if (value == null) return emptyValue;
  return formatter.format(value);
};

// Удобные обертки
export const formatTwoDecimal = (v: number | null | undefined) =>
  formatNumber(v, twoDecimalFormatter );

export const formatHighPrecision = (v: number | null | undefined) =>
  formatNumber(v, highPrecisionFormatter);

export const formatInteger = (v: number | null | undefined) =>
  formatNumber(v, integerFormatter);
