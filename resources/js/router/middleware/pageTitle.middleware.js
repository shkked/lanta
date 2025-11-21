import router from "@/router";
import { setDynamicValues } from "@/helpers";
export default function setPageTitleMiddleware() {
	// Если сделать через route который приходит в аргументах, то будет устанавливаться title маршрута даже если переход по нему был отменён
	const title = setDynamicValues(router.currentRoute.value.meta.title, router.currentRoute.value.params);
	document.title = title || "Лантасервис";
}
