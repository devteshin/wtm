<template>
  <el-button size="small" type="primary" round @click="dialogVisible = true">
    Сменить пароль
  </el-button>

  <el-dialog
    v-model="dialogVisible"
    class="change-password-dialog"
    title="Смена пароля"
    :before-close="handleClose">
    <el-form
      ref="ruleFormRef"
      label-position="top"
      :model="changePasswordForm"
      :rules="rules"
      status-icon>
      <el-form-item label="Пароль (минимум 8 символов)" prop="newPassword">
        <el-input v-model="changePasswordForm.newPassword" type="password" show-password />
      </el-form-item>
      <el-form-item label="Повторение пароля" prop="repetitionPassword">
        <el-input v-model="changePasswordForm.repetitionPassword" type="password" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">Отмена</el-button>
      <el-button type="primary" @click="submitForm">Сменить пароль</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import useApplicationStore from "@/store";
import { ElMessage } from "element-plus";

const store = useApplicationStore();
const ruleFormRef = ref();
const dialogVisible = ref(false);

/** Единая точка закрытия: сброс валидации и полей, потом закрытие */
const handleClose = () => {
  ruleFormRef.value?.resetFields();
  dialogVisible.value = false;
};

const changePasswordForm = reactive({
  newPassword: "",
  repetitionPassword: ""
});

const validatePass = (_: any, value: any, callback: any) => {
  if (value === "") {
    callback(new Error("Пожалуйста, введите пароль"));
  } else {
    if (changePasswordForm.repetitionPassword !== "") {
      ruleFormRef.value?.validateField("repetitionPassword", () => null);
    }
    callback();
  }
};

const validatePass2 = (_: any, value: any, callback: any) => {
  if (value === "") {
    callback(new Error("Пожалуйста, введите пароль ещё раз"));
  } else if (value !== changePasswordForm.newPassword) {
    callback(new Error("Пароли не совпадают"));
  } else {
    callback();
  }
};

const rules = {
  newPassword: [
    { validator: validatePass, trigger: "blur" },
    { min: 8, message: "Минимальная длина пароля — 8 символов", trigger: "blur" }
  ],
  repetitionPassword: [{ validator: validatePass2, trigger: "blur" }]
};

const submitForm = async () => {
  if (!ruleFormRef.value) return;
  const valid = await ruleFormRef.value.validate(() => true).catch(() => false);
  if (!valid) return;
  try {
    await store.changePassword(changePasswordForm);
    ElMessage.success("Пароль изменён, перезайдите в систему");
    store.logOut();
  } catch (error) {
    ElMessage.error(error as string);
  }
};
</script>

<style scoped>
.change-password-dialog {
  --el-dialog-width: min(440px, 92vw);
}
</style>
