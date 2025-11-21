import { useUserStore } from "@/stores/user.store.js";

export default function roleMiddleware(route) {
	const roles = route.meta.roles;
	if (roles && roles.length) {
		const { permittedFor } = useUserStore();
		if (!permittedFor(roles)) {
			return "/404";
		}
	}
}
