<template>
  <div class="svg-zone-map">
    <!-- Панель управления зумом -->
    <div class="zoom-controls">
      <button class="zoom-btn" @click="zoomByFactor(0.8)" title="Приблизить">+</button>
      <button class="zoom-btn" @click="zoomByFactor(1.25)" title="Отдалить">−</button>
      <button class="zoom-btn" @click="resetView" title="Сбросить вид">⟲</button>
    </div>

    <!-- Контейнер с SVG -->
    <div
      ref="container"
      class="svg-container"
      :class="{ panning: isPanning }"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
    >
      <div v-if="loading" class="loading-state">Загрузка схемы...</div>
      <div v-else v-html="svgContent" ref="svgHost" class="svg-host"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  src: { type: String, required: true },
});

const emit = defineEmits(['zone-click']);

// --- Refs ---
const container = ref(null);
const svgHost = ref(null);
const svgContent = ref('');
const loading = ref(true);
const isPanning = ref(false);

// --- Внутреннее состояние (не реактивное) ---
let svgElement = null;
let viewBox = { x: 0, y: 0, w: 0, h: 0 };
let originalViewBox = { x: 0, y: 0, w: 0, h: 0 };

// Пан
let panStartX = 0;
let panStartY = 0;
let dragged = false;

// Лимиты зума
const MIN_ZOOM = 0.05;  // не ближе 5% от оригинала

// === Загрузка SVG ===
const loadSvg = async (url) => {
  loading.value = true;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');

    if (doc.querySelector('parsererror')) {
      throw new Error('SVG файл повреждён');
    }

    svgContent.value = doc.documentElement.outerHTML;
    loading.value = false;

    await nextTick();
    initViewer();
  } catch (error) {
    console.error('Ошибка загрузки SVG:', error);
    loading.value = false;
  }
};

// === Инициализация ===
const initViewer = () => {
  svgElement = svgHost.value?.querySelector('svg');
  if (!svgElement) {
    console.error('SVG элемент не найден');
    return;
  }

  // Читаем viewBox из файла или создаём из width/height
  const vb = svgElement.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    viewBox = { x: vb.x, y: vb.y, w: vb.width, h: vb.height };
  } else {
    const w = parseFloat(svgElement.getAttribute('width')) || 1000;
    const h = parseFloat(svgElement.getAttribute('height')) || 1000;
    viewBox = { x: 0, y: 0, w, h };
  }

  originalViewBox = { ...viewBox };

  // SVG заполняет контейнер
  svgElement.setAttribute('width', '100%');
  svgElement.setAttribute('height', '100%');
  svgElement.style.display = 'block';

  // Навешиваем клики на зоны
  const rects = svgElement.querySelectorAll('rect[id]');
  rects.forEach((rect) => {
    rect.style.cursor = 'pointer';
    rect.addEventListener('click', (e) => {
      if (dragged) return; // подавляем клик после пана
      e.stopPropagation();
      emit('zone-click', rect.id);
    });
  });

  console.log(`SvgZoneMap: загружено зон — ${rects.length}`);
};

// === Обновление viewBox в DOM ===
const updateViewBox = () => {
  if (!svgElement) return;
  svgElement.setAttribute(
    'viewBox',
    `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
  );
};

// === Зум к точке (clientX, clientY) ===
const zoomAt = (clientX, clientY, factor) => {
  const newW = viewBox.w * factor;
  const newH = viewBox.h * factor;

  // Не отдаляем дальше оригинала
  if (newW > originalViewBox.w) {
    viewBox = { ...originalViewBox };
    updateViewBox();
    return;
  }
  // Не приближаем ближе минимума
  if (newW < originalViewBox.w * MIN_ZOOM) return;

  const rect = svgElement.getBoundingClientRect();
  const ratioX = (clientX - rect.left) / rect.width;
  const ratioY = (clientY - rect.top) / rect.height;

  // Точка в координатах SVG под курсором
  const svgX = viewBox.x + ratioX * viewBox.w;
  const svgY = viewBox.y + ratioY * viewBox.h;

  // Новые x/y так, чтобы точка осталась под курсором
  viewBox.x = svgX - ratioX * newW;
  viewBox.y = svgY - ratioY * newH;
  viewBox.w = newW;
  viewBox.h = newH;

  updateViewBox();
};

// === Колесо мыши ===
const onWheel = (e) => {
  const factor = e.deltaY < 0 ? 0.9 : 1.1; // вверх — приблизить
  zoomAt(e.clientX, e.clientY, factor);
};

// === Кнопки зума (к центру) ===
const zoomByFactor = (factor) => {
  const rect = svgElement?.getBoundingClientRect();
  if (!rect) return;
  zoomAt(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
    factor
  );
};

// === Сброс ===
const resetView = () => {
  viewBox = { ...originalViewBox };
  updateViewBox();
};

// === Панорамирование ===
const onMouseDown = (e) => {
  isPanning.value = true;
  dragged = false;
  panStartX = e.clientX;
  panStartY = e.clientY;
};

const onMouseMove = (e) => {
  if (!isPanning.value) return;

  const dx = e.clientX - panStartX;
  const dy = e.clientY - panStartY;

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    dragged = true;
  }

  if (dragged) {
    const rect = svgElement.getBoundingClientRect();
    // Переводим пиксели в единицы viewBox
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;

    viewBox.x -= dx * scaleX;
    viewBox.y -= dy * scaleY;

    updateViewBox();

    panStartX = e.clientX;
    panStartY = e.clientY;
  }
};

const onMouseUp = () => {
  isPanning.value = false;
  // Даём кликам обработаться, потом сбрасываем флаг
  setTimeout(() => {
    dragged = false;
  }, 50);
};

// === Жизненный цикл ===
onMounted(() => {
  loadSvg(props.src);
});

onBeforeUnmount(() => {
  svgElement = null;
});
</script>

<style scoped>
.svg-zone-map {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.zoom-controls {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  flex-shrink: 0;
}

.zoom-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #ccc;
  background: #fff;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  user-select: none;
}

.zoom-btn:hover {
  background: #e8e8e8;
}

.zoom-btn:active {
  background: #d0d0d0;
}

.svg-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #f0f0f0;
  cursor: grab;
  user-select: none;
  touch-action: none;
  min-height: 0;
}

.svg-container.panning {
  cursor: grabbing;
}

.svg-host {
  width: 100%;
  height: 100%;
}

.svg-host :deep(svg) {
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
</style>
