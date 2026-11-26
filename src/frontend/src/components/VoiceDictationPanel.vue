<template>
  <div class="voice-panel">
    <div class="voice-header">
      <el-button
        :type="state === 'listening' ? 'danger' : 'primary'"
        circle
        :icon="state === 'listening' ? CircleClose : Microphone"
        @click="dictation.toggle()"
      />
      <span class="voice-state">
        {{ state === 'listening' ? 'Слушаю… диктуйте' : 'Голосовой ввод выключен' }}
      </span>
      <span v-if="partial" class="voice-partial">{{ partial }}</span>
    </div>

    <!-- отладочный ввод вместо микрофона: только для StubAsrEngine -->
    <div v-if="debug" class="voice-debug">
      <el-input
        v-model="debugText"
        placeholder="Отладка: введите фразу, как будто её распознали"
        @keyup.enter="onDebugSubmit"
      />
      <el-button @click="onDebugSubmit">Распознать</el-button>
    </div>

    <div class="voice-form">
      <div class="voice-field">
        <label>№ пробы</label>
        <el-input-number
          :model-value="draft.probeNum"
          :controls="false"
          :precision="0"
          :min="1"
          class="probe-input"
          @update:model-value="(v: number | undefined) => dictation.setProbeNum(numOrNull(v))"
        />
      </div>
      <div v-for="ind in indicators" :key="ind.id" class="voice-field">
        <label>{{ ind.code }}, {{ ind.unit }}</label>
        <el-input-number
          :model-value="draft.values[String(ind.id)]?.value ?? null"
          :precision="ind.precision ?? 2"
          :min="0"
          :controls="false"
          :class="{ suspicious: isSuspicious(ind) }"
          @update:model-value="onValueUpdate(String(ind.id), numOrNull($event))"
        />
        <span
          v-if="draft.values[String(ind.id)]?.source === 'voice'"
          class="src-dot"
          title="введено голосом"
        />
      </div>
    </div>

    <div v-if="unknown.length" class="voice-unknown">
      <span class="voice-unknown-label">Не распознано:</span>
      <el-tag v-for="(w, i) in unknown" :key="i" type="warning" size="small">{{ w }}</el-tag>
    </div>

    <div v-if="warnings.length" class="voice-warnings">
      <el-alert
        v-for="(w, i) in warnings"
        :key="i"
        :title="w"
        type="warning"
        :closable="false"
        show-icon
      />
    </div>

    <div v-if="repeatText" class="voice-echo">{{ repeatText }}</div>

    <div class="voice-actions">
      <el-button type="primary" :disabled="!canSave" @click="dictation.save()">Записать</el-button>
      <el-button @click="dictation.reset()">Отмена</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Microphone, CircleClose } from '@element-plus/icons-vue';
import { useVoiceDictation, type VoiceDraft } from '@/lib/voice/useVoiceDictation';
import { buildDictionary } from '@/lib/voice/voiceDictionary';
import type { AsrEngine, StubAsrEngine } from '@/lib/voice/asrEngine';

export interface PanelIndicator {
  id: number;
  code: string;
  unit: string;
  precision: number | null;
}

const props = defineProps<{
  indicators: PanelIndicator[];
  engine: AsrEngine;
  /** отладочная строка ввода вместо микрофона (для StubAsrEngine) */
  debug?: boolean;
  /** по команде «запиши»/кнопке: верните false, чтобы драфт не сбросился */
  onSave: (draft: VoiceDraft) => boolean | Promise<boolean>;
}>();

const dictation = useVoiceDictation({
  engine: props.engine,
  getDictionary: () => buildDictionary(props.indicators),
  onSave: (d) => props.onSave(d),
});

const { state, partial, draft, canSave, repeatText, warnings, unknown } = dictation;

const debugText = ref('');

const emitDebug = (): void => {
  console.log('[panel] клик по «Распознать», текст =', JSON.stringify(debugText.value),
            '| engine =', props.engine);

  const text = debugText.value.trim();
  if (!text) return;
  (props.engine as unknown as { emit?: (t: string) => void }).emit?.(text);
  console.log('[panel] вызов emit выполнен');

  debugText.value = '';
};

const onDebugSubmit = async (): Promise<void> => {
  const text = debugText.value.trim();
  if (!text) return;
  console.log('[panel] onDebugSubmit:', JSON.stringify(text));

  // движок должен быть в listening — иначе emit уйдёт в никуда
  if (dictation.state.value !== 'listening') {
    await dictation.start();   // внутри вызовется engine.start(handlers)
  }

  (props.engine as StubAsrEngine).emit(text);
  debugText.value = '';   // очистка после передачи
};

const isSuspicious = (ind: PanelIndicator): boolean => {
  const v = draft.value.values[String(ind.id)];
  return !!v && v.decimals > (ind.precision ?? 2);
};

const onValueUpdate = (id: string, v: number | null): void => {
  dictation.setValue(id, typeof v === 'number' ? v : null);
};

const numOrNull = (v: number | undefined | null): number | null => v ?? null;

</script>

<style scoped>
.voice-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.voice-header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.voice-state { font-weight: 600; }

.voice-partial {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
  font-style: italic;
}

.voice-debug { display: flex; gap: 8px; }
.voice-debug > .el-input { flex: 1; min-width: 0; }

.voice-form { display: flex; flex-wrap: wrap; gap: 12px 20px; }

.voice-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  min-width: 0;
}

.voice-field > label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.probe-input { width: 140px; }
.voice-field .el-input-number { width: 120px; }

/* значение, введённое голосом */
.src-dot {
  position: absolute;
  right: -10px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-primary);
}

/* подозрительная точность: прозвучало больше знаков, чем допускает показатель.
   Класс вешается на корень el-input-number — селектор только один, без дублей */
.voice-field .suspicious :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1.5px var(--el-color-warning) inset;
}

.voice-unknown,
.voice-warnings,
.voice-echo {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.voice-warnings { flex-direction: column; align-items: stretch; }

.voice-unknown-label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.voice-echo {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--el-fill-color);
  font-weight: 500;
}

.voice-actions { display: flex; gap: 8px; }
</style>
