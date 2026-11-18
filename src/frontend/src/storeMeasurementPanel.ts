import { defineStore } from 'pinia'

const STORAGE_KEY = 'measurementsPanelState'

/**
 * Состояние страницы измерений (раскладка, общие настройки).
 * Выбор измерения/материала/даты живёт в useMeasurementsTableStore,
 * график — в собственном сторе компонента графиков.
 */
export const useMeasurementsPanelStore = defineStore('measurementsPanel', () => {
  const loadFromStorage = (): void => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      // TODO: восстановление состояния по мере наполнения стора
    } catch (error) {
      console.error('Ошибка загрузки состояния панели измерений:', error)
    }
  }

  const saveToStorage = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        timestamp: Date.now(),
      }))
    } catch (error) {
      console.error('Ошибка сохранения состояния панели измерений:', error)
    }
  }

  return {
    loadFromStorage,
    saveToStorage,
  }
})
