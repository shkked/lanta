import { computed, ref } from "vue";

export function filtersToQueryParams(selectedFilter, customData, property = "name") {
	return selectedFilter.reduce((acc, el) => {
		const elem = customData.find((item) => item[property] == el)?.id;
		if (elem) acc.push(elem);
		return acc;
	}, []);
}
export function queryParamsToFilters(queryParams, customData, property = "name") {
	return queryParams.reduce((acc, el) => {
		const elem = customData.find((item) => item.id == el)?.[property];
		if (elem) acc.push(elem);
		return acc;
	}, []);
}
export function arrayFromSet(arr) {
	return Array.from(new Set(arr));
}
export function createFilter(optionsGetter) {
	const activator = ref(null);
	const valueModel = ref([]);

	const filterFn = (value) => {
		return valueModel.value.length === 0 || valueModel.value.includes(value);
	};

	return {
		refElement: ref(null),
		activator,
		valueModel,
		activatorValue: computed(() => activator.value),
		options: computed(optionsGetter),
		filterFn,
	};
}
