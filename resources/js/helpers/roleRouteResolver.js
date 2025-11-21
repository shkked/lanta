import { useUserStore } from "@/stores/user.store.js";
export default function roleRouteResolver(rules) {
	const { permittedFor } = useUserStore();
	for (let routeName in rules) {
		const role = rules[routeName];
		if (permittedFor(role)) {
			return { name: routeName };
		}
	}
	return "/404";
}
