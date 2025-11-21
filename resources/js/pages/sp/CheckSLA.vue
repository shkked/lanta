<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<div class="w-100 mt-5">
			<h3 class="text-h6 mb-5">Последние загруженные SLA</h3>
			<v-skeleton-loader v-if="loading" class="border" type="table"> </v-skeleton-loader>
			<h3 v-if="!loading && !data.length" class="text-h6 no-data">Нет SLA</h3>
			<hot-table
				v-if="!loading && data.length"
				ref="hotTableComponentRef"
				class="border"
				:settings="hotSettings"
				:language="language"
			></hot-table>
			<v-pagination
				v-show="!loading && data.length"
				v-model="pager"
				:total-visible="5"
				:disabled="loading"
				:length="lengthPaginationData"
				color="primary"
				class="mt-5"
			></v-pagination>
		</div>
	</v-container>
</template>

<script setup>
import { api } from "@/axios/index.js";
import { isSameOrder, loadColumnsData, paintRow, removeFilters, setColumnsOrder, setColumnsWidth } from "@/helpers";
import router from "@/router";
import { HotTable } from "@handsontable/vue3";
import { computed, nextTick, onMounted, ref, watch } from "vue";

const language = "ru-RU";
const loading = ref(true);

const pager = ref(1);
const pageLinks = ref({});
const itemsOnPage = ref(50);
const totalItems = ref(0);
const lengthPaginationData = computed(() => {
	if (totalItems.value >= itemsOnPage.value) {
		return Math.ceil(totalItems.value / itemsOnPage.value);
	}
	return 1;
});

const data = ref([]);

const hotTableComponentRef = ref(null);
const hotSettings = {
	data: data.value,
	rowHeights: 40,
	columns: [
		{ type: "text", data: "userName", title: "СП" },
		{ type: "text", data: "month", title: "Отчётный<br/>месяц" },
		{ type: "text", data: "year", title: "Отчётный<br/>год" },
		{ type: "text", data: "completedOnTime", title: "В срок", columnSorting: { headerAction: false } },
		{ type: "text", data: "totalCompleted", title: "Всего", columnSorting: { headerAction: false } },
		{ type: "text", data: "overdueInProgress", title: "Просроченных", columnSorting: { headerAction: false } },
		{ type: "text", data: "serviceQuality", title: "Качество", columnSorting: { headerAction: false } },
	],
	// Сохранение порядка после перемещения
	manualColumnMove: true, // Устанавливаем порядок колонок
	afterColumnMove: (movedColumns, finalIndex, dropIndex, movePossible, orderChanged) => {
		// console.log({ movedColumns }, finalIndex, dropIndex, movePossible, orderChanged);
		if (!orderChanged) return;

		const hot = hotTableComponentRef.value.hotInstance;
		const currentOrder = hot
			.getPlugin("manualColumnMove")
			.hot.columnIndexMapper.fromPhysicalToVisualIndexesCache.keys();

		const savedOrder = JSON.parse(localStorage.getItem("columnsOrderCheckSLA"));

		// Если порядок совпадает с сохранённым — это инициализация, не сохраняем
		if (isSameOrder(Array.from(currentOrder), savedOrder)) return;
		// console.log({ currentOrder: Array.from(currentOrder), savedOrder });

		setColumnsOrder("CheckSLA", hot);
		setColumnsWidth("CheckSLA", hot);
	},
	// Сохранение размеров после перемещения
	manualColumnResize: true,
	afterColumnResize: (newSize, column, isDoubleClick) => {
		if (newSize) {
			setColumnsOrder("CheckSLA", hotTableComponentRef.value.hotInstance);
			setColumnsWidth("CheckSLA", hotTableComponentRef.value.hotInstance);
		}
	},
	filters: true,
	dropdownMenu: ["filter_by_condition", "filter_by_value", "filter_action_bar"],
	columnSorting: true,
	width: "100%",
	height: "65vh",
	stretchH: "all",
	className: "htLeft",
	readOnly: true,
	licenseKey: "non-commercial-and-evaluation",
	afterRenderer: paintRow(hotTableComponentRef),
	afterGetColHeader: removeFilters(9),
};
const getData = async (page) => {
	try {
		let link;
		if (page) {
			link = `/slas?page=${page}`;
		} else {
			link = `/slas`;
		}

		const responseData = await api.get(link);
		data.value = responseData.data.data.slas;
		pageLinks.value = responseData.data.links;
		itemsOnPage.value = responseData.data.meta.per_page;
		totalItems.value = responseData.data.meta.total;
		pager.value = responseData.data.meta.current_page;

		loading.value = false;
		await nextTick();

		const hot = hotTableComponentRef?.value?.hotInstance;
		if (hot) {
			hot.loadData(data.value);
			// Загрузка данных из локального хранилища
			loadColumnsData("CheckSLA", hot);
		}
	} catch (error) {
		console.log(error);
	}
};
watch(
	pager,
	() => {
		router.push({
			query: {
				page: pager.value,
			},
		});
		getData(pager.value);
	},
	{ deep: true },
);

onMounted(() => {
	getData();
});
</script>
