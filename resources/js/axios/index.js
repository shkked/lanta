/**
 * axios/index.js
 */

import Axios from "axios";
import { useUserStore } from "@/stores/user.store.js";

// Общие настройки для всех экземпляров axios
Axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
Axios.defaults.withCredentials = true;
Axios.defaults.withXSRFToken = true;

// экземпляр axios
const axios = Axios.create();

// Создаем экземпляр axios для API
const api = Axios.create({
	baseURL: "/api",
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		// Тут проверяем если какое-либо обращение помимо первичной попытки авторизации вызовет 401, то редиректим на Login
		// Сделано для того, чтобы если юзер не перезагружает страницу (соответственно Auth у него не обновляется т.к.
		// он не обращается к /user при первичной авторизации) и пытается получить какие-либо данные,
		// в случае если сессия истекла он получит в ответ 401 и будет редиректнут на Login
		// P.s. Если убрать проверку на url, то возникнет конфликт с авторизационным миддлвером т.к. и тут и там
		// будет идти обработка ошибки и он будет бесконечно редиректить на Login
		if (error?.response.status === 401 && error?.response.config.url !== "/user") {
			useUserStore().logout(false);
		}
		return Promise.reject(error);
	},
);

export { axios, api };
