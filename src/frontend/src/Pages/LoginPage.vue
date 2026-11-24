<template>
  <div class="login-page">
    <el-card class="login-card">
      <el-form
        ref="ruleFormRef"
        label-position="top"
        :model="loginForm"
        :rules="rules"
        status-icon
        @submit.prevent="handleLogin">
        <el-form-item label="Логин" prop="login">
          <el-input v-model="loginForm.login" autofocus />
        </el-form-item>
        <el-form-item label="Пароль" prop="password">
          <el-input v-model="loginForm.password" type="password" show-password />
        </el-form-item>
        <el-button
          class="login-submit"
          type="primary"
          native-type="submit"
          :loading="submitting">
          Войти
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from "vue";
import useApplicationStore from "@/store";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";

const ruleFormRef = ref();
const submitting = ref(false);

const loginForm = reactive({
  login: "",
  password: ""
});

const rules = {
  login: {
    required: true, message: 'Поле "логин" обязательно к заполнению', trigger: "blur"
  },
  password: {
    required: true, message: 'Поле "пароль" обязательно к заполнению', trigger: "blur"
  }
};

const router = useRouter();
const store = useApplicationStore();

/** Запрос к API на авторизацию (получение токена) */
const handleLogin = async (): Promise<void> => {
  if (!ruleFormRef.value || submitting.value) return;
  const valid = await ruleFormRef.value.validate(() => true).catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await store.doLogin(loginForm);
    await router.push("/");
  } catch (error) {
    ruleFormRef.value?.resetFields();
    ElMessage.error(error as string);
  } finally {
    submitting.value = false;
  }
};

/** Проверка сохранённого токена: авторизованного сразу пропускаем */
onMounted(async () => {
  store.checkToken();
  if (store.isAuth) await router.push("/");
});
</script>

<style scoped>
.login-page {
  max-width: 400px;
  margin: 20vh auto 0;
  padding: 0 16px;
  box-sizing: border-box;
}

.login-submit {
  width: 100%;
  margin-top: 8px;
}
</style>
