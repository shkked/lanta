<template>
	<v-container fluid class="primary fill-height">
		<v-row class="fill-height">
			<v-col cols="6" class="d-flex justify-center align-center">
				<v-sheet min-width="450">
					<v-form id="authForm" v-model="valid" @submit.prevent="login">
						<div class="text-grey-darken-4">
							<h1 class="font-weight-bolder text-h4">Вход в личный кабинет</h1>
							<p class="text-h7">Введите свой логин и пароль для входа</p>
						</div>

						<v-text-field
							v-model="form.login"
							name="login"
							label="Введите свой логин"
							:rules="rules"
							variant="outlined"
							color="primary"
							class="mt-10"
						></v-text-field>

						<v-text-field
							v-model="form.password"
							name="password"
							:append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
							:type="showPassword ? 'text' : 'password'"
							:rules="rules"
							label="Введите свой пароль"
							variant="outlined"
							color="primary"
							class="mt-5"
							@click:append-inner="showPassword = !showPassword"
						></v-text-field>
						<p v-if="loginFailed" class="text-red-darken-4">Неверный логин или пароль</p>

						<v-btn
							:loading="loading"
							size="x-large"
							class="bg-primary mt-5"
							type="submit"
							:disabled="!valid"
							block
						>
							Войти
						</v-btn>
					</v-form>
				</v-sheet>
			</v-col>
			<v-col cols="6">
				<div class="d-flex pa-5 lanta-image flex-column justify-center align-center rounded-lg">
					<div class="d-flex flex-column">
						<h1 class="text-uppercase text-light-blue-darken-4 font-weight-bold text-h3">Лантаcервис</h1>
						<p class="text-uppercase font-weight-bold text-white text-overline align-self-end">
							прогрессивные бизнес-решения
						</p>
					</div>
					<p class="text-white text-h7 text-center mt-5">
						Мы гордимся своей историей, в которой мы уделяем особое внимание экологическим, социальным и
						экономическим результатам.
					</p>
				</div>
			</v-col>
		</v-row>

		<!-- Модальное окно с новым паролем -->
		<v-dialog v-model="isNewPassword" :close-on-back="false" :retain-focus="false" max-width="700" persistent>
			<v-card title="Уведомление от портала" class="px-6 py-4 rounded-10">
				<v-card-text>
					<p class="mt-5">Это Ваш первый заход на портал, придумайте новый пароль</p>
					<v-row class="mt-5 main__form">
						<v-col>
							<v-text-field
								v-model="form.newPassword"
								:append-inner-icon="showNewPassword ? 'mdi-eye' : 'mdi-eye-off'"
								variant="outlined"
								:type="showNewPassword ? 'text' : 'password'"
								placeholder="Введите новый пароль"
								required
								@click:append-inner="showNewPassword = !showNewPassword"
							>
							</v-text-field>
						</v-col>
					</v-row>
				</v-card-text>
				<v-card-actions class="px-6">
					<v-spacer></v-spacer>
					<v-btn class="bg-primary mt-5" @click="isNewPassword = false"> Ок </v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-container>
</template>

<script setup>
import { api, axios } from "@/axios";
import { useCentrifugeStore } from "@/stores/centrifuge.store.js";
import { useUserStore } from "@/stores/user.store.js";
import { ref } from "vue";
import { useRouter } from "vue-router";

const { useCentrifuge, disconnectCentrifuge } = useCentrifugeStore();

const router = useRouter();
const { getUser } = useUserStore();

const loading = ref(false);
const valid = ref(false);
const form = ref({
	login: null,
	password: null,
	newPassword: null,
});
const loginFailed = ref(false);
const isNewPassword = ref(false);
const showPassword = ref(false);
const showNewPassword = ref(false);

const rules = [(v) => !!v || "Поле обязательно для заполнения"];

async function login() {
	try {
		loading.value = true;
		await axios.get("/sanctum/csrf-cookie");
		const responseLogin = await api.post("/login", {
			login: form.value.login,
			password: form.value.password,
		});
		const tokenWebSocket = localStorage.getItem("dataCentrifuge");
		if (tokenWebSocket) {
			await disconnectCentrifuge();
		}
		localStorage.setItem("dataCentrifuge", JSON.stringify(responseLogin.data.message));
		await useCentrifuge();

		loginFailed.value = false;
		await getUser();
		loading.value = false;
		router.push({ name: "Main" });
	} catch (error) {
		// const code = error.data.data;
		// if(code == 422)	{
		// 	isNewPassword.value = true;
		// }
		loginFailed.value = true;
		console.error("Ошибка при авторизации:", error);
	}
}
</script>
<style>
.lanta-image {
	background:
		linear-gradient(to bottom, rgba(144, 202, 249, 0.4), rgba(1, 87, 155, 0.7)),
		url("/img/lightbulb.jpg") center;
	background-size: cover;
	width: 100%;
	height: 100%;
}
</style>
