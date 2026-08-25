// src/utils/tableCellDoubleClick.ts
import { Ref } from 'vue'

export interface OptionItem {
  id: number
  name: string
}

/**
 * Добавляет уникальные ID по совпадению имён из строки значений.
 */
export const addUniqueIdsByValue = (
  optionList: OptionItem[],
  selectedRef: Ref<number[]>,
  searchValues: string | null | undefined
): void => {
  if (!searchValues) return

  const valuesArray = searchValues
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (valuesArray.length === 0) return

  const valuesSet = new Set(valuesArray)

  // Находим ID, соответствующие именам
  const newIds = optionList
    .filter((item) => valuesSet.has(item.name))
    .map((item) => item.id)

  const existingSet = new Set(selectedRef.value ?? [])
  const uniqueNewIds = newIds.filter((id) => !existingSet.has(id))

  if (uniqueNewIds.length > 0) {
    selectedRef.value = [...selectedRef.value, ...uniqueNewIds]
  }
}
