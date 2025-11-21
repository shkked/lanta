import { useUserStore } from "@/stores/user.store.js";

export default function loginPageMiddleware(to, from) {
	const userStore = useUserStore();
	// Если авторизирован
	if (userStore.Auth) {
		// и пытается зайти на Login
		if (to.name === "Login") {
			// если идёт откуда-то, то отменяем переход (защита от использования стрелок)
			if (from.name) {
				return false;
			} else {
				// иначе переводим на Main (защита от прямого перехода через url)
				return { name: "Main" };
			}
		}
	} else {
		// Если не авторизирован
		if (to.name !== "Login") {
			// и пытается уйти с Login, то отменяем переход (защита от использования стрелок)
			if (from.name === "Login") {
				return false;
			} else {
				// иначе переводим на Login (защита от прямого перехода через url)
				return { name: "Login" };
			}
		}
	}
}
