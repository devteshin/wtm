<script setup lang="ts">
const props = defineProps<{
  bgColor?: string
  textColor?: string
}>()

const bg = props.bgColor ?? '#f0f4ff'
const text = props.textColor ?? '#333'
</script>

<template>
  <div :style="{
    height: '100%',
    width: '100%',
    backgroundColor: bg,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    padding: '24px',
    overflow: 'hidden'
  }">
    <h2 :style="{ color: text, margin: '0 0 12px 0', fontSize: '20px' }">
      Debug Drawer Content
    </h2>
    <p :style="{ color: '#666', margin: 0 }">
      Ширина drawer контролируется снаружи.<br>
      Внутри — только сплошной блок.
    </p>
    <div :style="{
      marginTop: '16px',
      padding: '8px 16px',
      backgroundColor: '#fff',
      border: '1px solid #ddd',
      borderRadius: '4px'
    }">
      Нет таблиц, скроллов, position:absolute.
    </div>
  </div>
</template>
