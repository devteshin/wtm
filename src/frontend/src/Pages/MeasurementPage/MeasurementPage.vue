<template>
  <el-card>
    <!-- Панель: дата + действия -->
    <div class="toolbar">
      <el-button :icon="ArrowLeft" circle @click="shiftDay(-1)" />
      <el-date-picker
        v-model="selectedDate"
        type="date"
        :clearable="false"
        format="DD.MM.YYYY"
        @change="loadDay"
      />
      <el-button :icon="ArrowRight" circle @click="shiftDay(1)" />
      <el-button type="primary" @click="openCreate">Добавить измерение</el-button>
    </div>

    <!-- Таблица дня -->
    <el-table :data="rows" v-loading="loading" border>
      <el-table-column prop="measured_at" label="Время забора" width="120">
        <template #default="{ row }">{{ fmtTime(row.measured_at) }}</template>
      </el-table-column>
      <el-table-column prop="tech_process_name" label="Техпроцесс" />
      <el-table-column label="Операция" width="180">
        <template #default="{ row }">{{ row.operation_name || '—' }}</template>
      </el-table-column>
      <el-table-column label="C, %" width="100" align="right">
        <template #default="{ row }">{{ row.C ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="S, %" width="100" align="right">
        <template #default="{ row }">{{ row.S ?? '—' }}</template>
      </el-table-column>
      <el-table-column label="" width="140" align="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">Изменить</el-button>
          <el-button link type="danger" @click="remove(row)">Удалить</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- Диалог ввода -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? 'Изменение' : 'Новое измерение'" width="480px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="130px">
        <el-form-item label="Техпроцесс" prop="tech_process_id">
          <el-select v-model="form.tech_process_id" filterable>
            <el-option v-for="tp in techProcesses" :key="tp.id"
                       :label="tp.name" :value="tp.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Операция">
          <el-select v-model="form.operation_id" filterable clearable>
            <el-option v-for="op in operations" :key="op.id"
                       :label="op.name" :value="op.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Время забора" prop="measured_at">
          <el-date-picker v-model="form.measured_at" type="datetime"
                          format="DD.MM.YYYY HH:mm" />
        </el-form-item>
        <el-form-item label="Углерод, %">
          <el-input-number v-model="form.C" :min="0" :max="100" :precision="2" :controls="false" />
        </el-form-item>
        <el-form-item label="Сера, %">
          <el-input-number v-model="form.S" :min="0" :max="100" :precision="2" :controls="false" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">Отмена</el-button>
        <el-button type="primary" :loading="saving" @click="save">Сохранить</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
