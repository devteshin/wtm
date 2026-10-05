<template>
  <div class="parser-container">
    <h2>Парсер зон</h2>

    <div class="svg-wrapper" ref="svgContainer">
      <div v-if="status === 'Загрузка...'" class="loading-state">
        <p>Загрузка карты...</p>
      </div>
      <div v-else v-html="svgContent" class="svg-host"></div>

      <!-- Оверлей теперь ВНУТРИ svg-wrapper -->
      <div class="overlay-wrapper">
        <div
          v-for="zone in parsedZones"
          :key="zone.id"
          class="overlay-zone"
          :style="{
            left: zone.x + 'px',
            top: zone.y + 'px',
            width: zone.width + 'px',
            height: zone.height + 'px'
          }"
          @click="onZoneClick(zone)"
        >
          {{ zone.id }}
        </div>
      </div>
    </div>

    <div class="debug-panel">
      <h3>Статус: {{ status }}</h3>
      <p v-if="parsedZones.length === 0 && status !== 'Загрузка...'" class="warn">
        Зоны не найдены.
      </p>
      <ul v-else class="zone-list">
        <li v-for="zone in parsedZones" :key="zone.id" class="zone-item">
          <span class="id-badge">{{ zone.id }}</span>
          <span class="coords">
            X: {{ zone.x.toFixed(0) }} | Y: {{ zone.y.toFixed(0) }} |
            W: {{ zone.width.toFixed(0) }} | H: {{ zone.height.toFixed(0) }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';

const svgContainer = ref(null);
const svgContent = ref('');
const parsedZones = ref([]);
const status = ref('Ожидание...');

const loadExternalSvg = async (url) => {
  status.value = 'Загрузка...';
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('SVG файл битый');
    }

    svgContent.value = doc.documentElement.outerHTML;
    status.value = 'Парсинг...';
    await nextTick();
    initParser();
  } catch (error) {
    console.error('Ошибка загрузки SVG:', error);
    status.value = `Ошибка: ${error.message}`;
  }
};

const initParser = () => {
  const svgElement = svgContainer.value.querySelector('svg');

  if (!svgElement) {
    status.value = 'SVG не найден в DOM';
    return;
  }

  const rects = svgElement.querySelectorAll('rect');

  if (rects.length === 0) {
    status.value = 'Теги <rect> не найдены. Сохраните файл как Plain SVG.';
    parsedZones.value = [];
    return;
  }

  // Берём реальную позицию контейнера на экране
  const containerRect = svgContainer.value.getBoundingClientRect();

  parsedZones.value = Array.from(rects)
    .map((rect) => {
      const id = rect.id;
      if (!id) return null;

      // Реальная позиция и размер rect на экране
      const bbox = rect.getBoundingClientRect();

      // Смещаем относительно контейнера (а не всей страницы)
      return {
        id,
        x: bbox.left - containerRect.left,
        y: bbox.top - containerRect.top,
        width: bbox.width,
        height: bbox.height,
      };
    })
    .filter((item) => item !== null);

  status.value = `Найдено зон: ${parsedZones.value.length}`;
  console.log(parsedZones.value);
};

const onZoneClick = (zone) => {
  console.log('Клик по зоне:', zone.id);
};

onMounted(() => {
  loadExternalSvg('/test_plan.svg');
});
</script>

<style scoped>
.parser-container {
  position: relative;
  font-family: sans-serif;
  padding: 20px;
}

.svg-wrapper {
  border: 1px solid #ccc;
  background: #f0f0f0;
  overflow: auto;
  width: 100%;
  max-width: 1200px;
  height: 600px;
  margin-bottom: 20px;
  position: relative;
}

.svg-host :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #666;
  font-size: 16px;
}

.debug-panel {
  background: #fff;
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 8px;
  max-width: 600px;
}

.warn {
  color: orange;
  background: #fff3cd;
  padding: 8px;
  border-radius: 4px;
}

.zone-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.zone-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
  font-family: monospace;
  font-size: 14px;
}

.id-badge {
  background: #333;
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 10px;
}

.overlay-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.overlay-zone {
  position: absolute;
  border: 2px dashed red;
  color: red;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  user-select: none;
  pointer-events: auto;
  cursor: pointer;
}
</style>
