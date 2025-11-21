import { useUserStore } from "@/stores/user.store.js";

export default async function authorizationMiddleware(route) {
	const userStore = useUserStore();
	// Если данных о юзере нет (например т.к. страница была перезагружена) и это не был редирект (чтобы избежать двойных вызовов)
	if (!userStore.Auth && !route.redirectedFrom) {
		try {
			// пытаемся получить эти данные
			await userStore.getUser();
			// если получить их удалось (значит юзер авторизован)
			// Дальше отработает loginPage.middleware
		} catch (error) {
			// если возникла ошибка при получении данных (скорее всего 401 если сессия истекла)
			// Дальше отработает loginPage.middleware
			// P.s. error уже выводится в getUser
		}
	}
}
