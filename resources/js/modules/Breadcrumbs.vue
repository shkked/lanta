<template>
	<v-breadcrumbs active-class="text-primary text-h5" :items="breadcrumbs"></v-breadcrumbs>
</template>

<script setup>
import { useRoute } from "vue-router";
import { computed } from "vue";
import { setDynamicValues } from "@/helpers";

const currentRoute = useRoute();

const breadcrumbs = computed(() => {
	const uniqueMatchedRoutes = currentRoute.matched.filter(
		(item, index, self) => self.findIndex((r) => r.path === item.path) === index,
	);
	const items = [];
	uniqueMatchedRoutes.forEach((route) => {
		const isActive = route === uniqueMatchedRoutes[uniqueMatchedRoutes.length - 1];
		const breadcrumb = setDynamicValues(route.meta.breadcrumb, currentRoute.params);
		const title = setDynamicValues(route.meta.title, currentRoute.params);
		items.push({
			title: breadcrumb || title || route.name || "None",
			active: isActive,
			to: (route.components || route.meta?.prefixWithIndex) && !isActive ? route.path : "",
			exact: true,
			key: route.path + Date.now(),
		});
	});
	return items;
});
</script>
