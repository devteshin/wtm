// src/components/metricsConfig.ts

export interface MetricFilterConfig {
  showDate: boolean
  showPeriod: boolean
  showStore: boolean
  showSchema: boolean
  showProcess: boolean
  showOperation: boolean
  showMaterial: boolean
  showProduct: boolean
  showOperationGraph: boolean
  showMaterialGraph: boolean
  showProductGraph: boolean
  showProductCoeffTables: boolean
  component: string
}

export const metricTypeOptions = [
  { value: 'storage_lifetime', label: 'Сроки хранения материалов' },
  //{ value: 'turnover',         label: 'Оборачиваемость материалов' },
  //{ value: 'deficit',          label: 'Дефицит материалов' },
] as const

export type MetricType = typeof metricTypeOptions[number]['value']

const configs: Record<MetricType, MetricFilterConfig> = {
  storage_lifetime: {
    showDate: true,  showPeriod: false,  showStore: true,  showSchema: false,
    showProcess: false, showOperation: false, showMaterial: true,
    showProduct: false,
    showOperationGraph: false, showMaterialGraph: false,
    showProductGraph: false, showProductCoeffTables: false,
    component: 'StorageLifetimeReport',
  },
/*    turnover: {
    showDate: true,  showPeriod: true,  showStore: true,  showSchema: false,
    showProcess: false, showOperation: false, showMaterial: true,
    showProduct: false,
    showOperationGraph: false, showMaterialGraph: false,
    showProductGraph: false, showProductCoeffTables: false,
    component: 'TurnoverReport',
  },
  deficit: {
    showDate: true,  showPeriod: true,  showStore: true,  showSchema: true,
    showProcess: true, showOperation: false, showMaterial: true,
    showProduct: true,
    showOperationGraph: false, showMaterialGraph: false,
    showProductGraph: true, showProductCoeffTables: false,
    component: 'DeficitReport',
  }, */ 
}

export function getMetricConfig(type: MetricType): MetricFilterConfig {
  return configs[type] ?? configs.storage_lifetime
}
