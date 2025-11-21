import { AppLayoutToFileMap } from "@/layouts/layout.types.js";

export default async function loadLayoutMiddleware(route) {
	const { layout } = route.meta;
	const layoutName = layout || "default";
	const fileName = AppLayoutToFileMap[layoutName];
	const component = await import(`../../layouts/${fileName}.vue`);
	route.meta.layoutComponent = component.default;
}

//https://gitlab.com/Sticker0ne/vue-layouts
