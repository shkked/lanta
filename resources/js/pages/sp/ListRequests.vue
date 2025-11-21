<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<div class="w-100 mt-5">
			<h3 class="text-h6 mb-5">Загруженные заявки</h3>
			<v-skeleton-loader v-if="loading" class="border" type="table"> </v-skeleton-loader>
			<hot-table
				v-show="!loading"
				ref="hotTableComponentRef"
				class="border"
				:settings="hotSettings"
				:language="language"
			></hot-table>
			<v-pagination
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
import { isSameOrder, loadColumnsData, paintRow, setColumnsOrder, setColumnsWidth } from "@/helpers";
import router from "@/router";
import { HotTable } from "@handsontable/vue3";
import Handsontable from "handsontable";
import { computed, nextTick, onMounted, ref, watch } from "vue";

const language = "ru-RU";
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

const loading = ref(true);
const data = ref([]);
const hotTableComponentRef = ref(null);

const hotSettings = {
	data: data.value,
	rowHeights: 40,
	columns: [
		{ type: "text", data: "id", title: "ID" },
		{ type: "date", data: "beginReportingPeriod", dateFormat: "DD/MM/YYYY", title: "Начало периода" },
		{ type: "date", data: "endReportingPeriod", dateFormat: "DD/MM/YYYY", title: "Конец периода" },
		{
			type: "text",
			data: "openRequests",
			title: "Открыть заявки",
			renderer: (instance, td, row) => {
				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				td.className = "htMiddle";

				const div = document.createElement("div");
				div.className = "d-flex align-center justify-center";

				const button = document.createElement("button");
				button.className = "table_primary_button";
				button.textContent = "Перейти";

				button.addEventListener("click", () => {
					router.push({ name: "RequestsPeriod", params: { id: rowData.id } });
				});
				td.innerHTML = "";

				rowData.isCompleted ? td.classList.add("bg-yellow-color") : "";

				td.appendChild(div);
				div.appendChild(button);
				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
		// {
		// 	type: "text",
		// 	title: "Не хватает заявок",
		// 	renderer: (instance, td) => {
		// 		const checkbox = document.createElement("input");
		// 		const div = document.createElement("div");
		// 		checkbox.setAttribute("type", "checkbox");
		//
		// 		checkbox.addEventListener("click", () => {});
		//
		// 		div.className = "h-100 d-flex align-center  justify-center";
		//
		// 		td.innerHTML = "";
		// 		td.appendChild(div);
		// 		div.appendChild(checkbox);
		//
		// 		return td;
		// 	},
		// 	columnSorting: {
		// 		headerAction: false,
		// 	},
		// },
		// {
		// 	type: "text",
		// 	title: "Комментарий",
		// 	readOnly: false,
		// 	columnSorting: {
		// 		headerAction: false,
		// 	},
		// },
	],
	cells: (row, col) => {
		const cellProperties = {};
		const rowData = data.value[row];
		const column = hotTableComponentRef.value.hotInstance.getSettings().columns[col];

		if (column.data === "openRequests") {
			// Пропускаем кастомный рендер для кнопок
			return cellProperties;
		}

		// Сохраняем оригинальный рендерер, если он был указан в columns
		const originalRenderer = column.renderer || Handsontable.renderers.TextRenderer;

		cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties) => {
			// Вызываем оригинальный рендерер
			originalRenderer.call(this, instance, td, row, col, prop, value, cellProperties);

			// Дополнительная логика для раскраски
			if (rowData && rowData.isCompleted) {
				td.classList.add("bg-yellow-color");
			}
		};
		return cellProperties;
	},
	// Сохранение порядка после перемещения
	manualColumnMove: true, // Устанавливаем порядок колонок
	afterColumnMove: (movedColumns, finalIndex, dropIndex, movePossible, orderChanged) => {
		// console.log({ movedColumns }, finalIndex, dropIndex, movePossible, orderChanged);
		if (!orderChanged) return;

		const hot = hotTableComponentRef.value.hotInstance;
		const currentOrder = hot
			.getPlugin("manualColumnMove")
			.hot.columnIndexMapper.fromPhysicalToVisualIndexesCache.keys();

		const savedOrder = JSON.parse(localStorage.getItem("columnsOrderListRequests"));

		// Если порядок совпадает с сохранённым — это инициализация, не сохраняем
		if (isSameOrder(Array.from(currentOrder), savedOrder)) return;
		// console.log({ currentOrder: Array.from(currentOrder), savedOrder });

		setColumnsOrder("ListRequests", hot);
		setColumnsWidth("ListRequests", hot);
	},
	// Сохранение размеров после перемещения
	manualColumnResize: true,
	afterColumnResize: (newSize, column, isDoubleClick) => {
		if (newSize) {
			setColumnsOrder("ListRequests", hotTableComponentRef.value.hotInstance);
			setColumnsWidth("ListRequests", hotTableComponentRef.value.hotInstance);
		}
	},
	filters: true,
	dropdownMenu: ["filter_by_condition", "filter_by_value", "filter_action_bar"],
	columnSorting: true,
	width: "100%",
	height: "84vh",
	stretchH: "all",
	readOnly: true,
	licenseKey: "non-commercial-and-evaluation",
	afterGetColHeader(col, TH) {
		if (col === this.countCols() - 1 || col === this.countCols() - 2) {
			const button = TH.querySelector(".changeType");
			if (button) {
				button.parentElement.removeChild(button);
			}
		}
	},
	afterRenderer: paintRow(hotTableComponentRef),
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

const getData = async (page) => {
	try {
		let link;
		if (page) {
			link = `/report-requests?page=${page}`;
		} else {
			link = `/report-requests`;
		}
		const responseData = await api.get(link);
		data.value = responseData.data.data.reportRequests;
		// pageLinks.value = responseData.data.links;
		// itemsOnPage.value = responseData.data.meta.per_page;
		// totalItems.value = responseData.data.meta.total;
		// pager.value = responseData.data.meta.current_page;
		loading.value = false;
		await nextTick();

		const hot = hotTableComponentRef?.value?.hotInstance;
		if (hot) {
			// Загрузка данных из локального хранилища
			hot.loadData(data.value);
			loadColumnsData("ListRequests", hot);
		}
	} catch (e) {
		console.error(e);
	}
};
onMounted(() => {
	getData();
});
</script>

<style lang="scss" scoped></style>
