<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<div class="d-flex border-sm rounded pa-5 justify-space-between">
			<div class="d-flex flex-column ga-2">
				<div>
					Взят на проверку: <b class="text-primary">{{ infoPage?.analyst || "Не указано" }}</b>
				</div>
				<div>
					Итоговая сумма: <b class="text-primary">{{ infoPage?.resultPrice + " рублей" || "Не указано" }}</b>
				</div>
				<div>
					Число позиций: <b class="text-primary">{{ infoPage?.itemsCounter || "Не указано" }}</b>
				</div>
			</div>
		</div>
		<div class="d-flex w-100 ga-5">
			<div class="d-flex w-50 align-center">
				<v-select
					id="columns"
					v-model="selectedColumn"
					:items="columns.filter((col) => col.value)"
					variant="outlined"
					color="primary"
					density="compact"
					label="Поиск по:"
					hide-details
					class="w-50"
				></v-select>
			</div>

			<v-text-field
				id="filterField"
				v-model="filterValue"
				type="text"
				variant="outlined"
				color="primary"
				density="compact"
				label="Введите значение"
				hide-details
				class="w-50"
			/>
		</div>

		<div class="w-100">
			<v-skeleton-loader v-if="loading" class="border" type="table"> </v-skeleton-loader>
			<hot-table v-if="!loading && data.length" ref="billingTable" :settings="hotSettings" :language="language" />
			<h3 v-if="!loading && !data.length" class="text-h6 no-data">Нет позиций в биллинге</h3>
		</div>
		<!-- <div v-if="comment" class="border-sm rounded pa-5">Комментарий: {{ comment }}</div> -->
		<div class="d-flex ga-5">
			<v-btn color="primary" variant="flat" prepend-icon="mdi mdi-tray-arrow-down" @click="downloadTestList"
				>Скачать тест. листы</v-btn
			>
			<v-btn color="primary" variant="flat" prepend-icon="mdi mdi-tray-arrow-down" @click="downloadExcel"
				>Выгрузить в excel</v-btn
			>
		</div>
		<div class="d-flex">
			<v-btn color="primary" variant="flat" prepend-icon="mdi mdi-tray-arrow-down" @click="checkSerialNotFound"
				>Просигнализировать не найденные серийники</v-btn
			>
		</div>
	</v-container>
</template>

<script setup>
import { api } from "@/axios";
import {
	deleteTippy,
	isSameOrder,
	loadColumnsData,
	mapStatusToColor,
	paintRow,
	removeFilters,
	searchErrors,
	setColumnsOrder,
	setColumnsWidth,
} from "@/helpers";
import { useToastStore } from "@/stores/toast.store.js";
import { HotTable } from "@handsontable/vue3";
import Handsontable from "handsontable";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { tippy } from "vue-tippy";

const loading = ref(true);
const toastStore = useToastStore();
const billingTable = ref(null);
const selectedColumn = ref(3);
const filterValue = ref("");
const language = "ru-RU";

const route = useRoute();
const data = ref([]);
const infoPage = ref({});

const filteredCol = computed(() => {
	if (data.value.some((item) => item.canDelete)) {
		return columns;
	} else {
		return columns.filter((item) => item.id != "buttons");
	}
});

const checkSerialNotFound = async () => {
	try {
		for (let i = 0; i < data.value.length; i++) {
			const error = data.value[i].errors.find((item) => item.name == "assets_not_found");
			if (error) {
				console.log(data.value[i]);
				data.value[i].commentPartner = "Устройство на КТО";
				const params = {
					billingId: infoPage.value.id,
					commentPartner: data.value[i].commentPartner,
				};
				const response = await api.put(`/billings/billing-items/${data.value[i].id}`, params);
				const newItem = response.data.data;
				data.value[i] = newItem;
				billingTable.value.hotInstance.loadData(data.value);
			}
		}
		const responseInfo = await api.get(`billings/${infoPage.value.id}`);
		infoPage.value = responseInfo.data.data;
	} catch (e) {
		console.error(e);
		toastStore.show("Ошибка!", e?.message, "error", 10000);
	}
};

const columns = [
	{
		id: "buttons",
		minWidth: 75,
		columnSorting: {
			headerAction: false,
		},
		readOnly: true,
		renderer: (instance, td, row) => {
			td.innerHTML = "";
			const buttonDelete = document.createElement("button");
			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			buttonDelete.className = "mdi mdi-trash-can-outline text-h5";
			td.className = "d-flex justify-center";

			if (rowData?.canDelete) td.appendChild(buttonDelete);

			const id = rowData.id;

			buttonDelete.addEventListener("click", () => {
				deleteRow(id);
			});
			return td;
		},
	},
	{
		title: "Модель",
		type: "dropdown",
		strict: false,
		data: "printerModel",
		readOnly: true,
		columnSorting: {
			headerAction: false,
		},
	},
	{
		title: "Адрес",
		type: "text",
		readOnly: true,
		data: "address",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const canEdit = rowData?.canEdit;
			if (canEdit) {
				cellProperties.readOnly = false;
			}
			td.innerHTML = value;
			td.className = "htMiddle";
			return td;
		},
	},
	{
		id: "serialNumber",
		title: "Серийный номер",
		type: "text",
		data: "assetName",
		readOnly: true,
		value: 3,
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["assets_not_found"];
			// Обработка ошибок
			searchErrors({
				errorsData,
				rowData,
				td,
				tippy,
				cellProperties: rowData?.canEdit ? cellProperties : null,
			});

			const status = rowData.status;
			td.innerHTML = `<div class="${status === "error" ? `${mapStatusToColor(status, true)} font-weight-bold` : ""}">${value}</div>`;

			return td;
		},
	},
	{
		title: "Комментарий",
		type: "text",
		data: "commentPartner",
		editor: "textareaEditor",
		readOnly: true,
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["assets_not_found"];
			// Обработка ошибок
			searchErrors({
				errorsData,
				rowData,
				td,
				tippy,
				colorize: false,
				cellProperties: rowData?.canEdit ? cellProperties : null,
			});
			td.innerHTML = value;
			return td;
		},
	},
	{ title: "Комментарий<br/>Ланты", editor: "textareaEditor", readOnly: true, type: "text", data: "commentAnalyst" },
	{
		title: "Нач<br/>ЧБ",
		readOnly: true,
		type: "text",
		data: "initialBwSheetCount",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["initial_bw_sheet_count_error"];
			// Обработка ошибок
			searchErrors({
				errorsData,
				rowData,
				td,
				tippy,
				cellProperties: rowData?.canEdit ? cellProperties : null,
			});

			td.innerHTML = value;
			return td;
		},
	},
	{
		title: "Кон<br/>ЧБ",
		readOnly: true,
		type: "text",
		data: "finalBwSheetCount",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["final_bw_sheet_count_error"];
			// Обработка ошибок
			searchErrors({
				errorsData,
				rowData,
				td,
				tippy,
				cellProperties: rowData?.canEdit ? cellProperties : null,
			});

			td.innerHTML = value;
			return td;
		},
	},
	// { title: "Конечный<br/>ЧБ ланта", readOnly: true, type: "text", data: "" },
	{
		title: "Итог<br/>ЧБ",
		readOnly: true,
		type: "text",
		data: "bwSheetCountDiff",
	},
	{
		title: "Нач<br/>ЦВ",
		readOnly: true,
		type: "text",
		data: "initialColorSheetCount",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			// Обработка ошибок
			const errorsData = ["initial_color_sheet_count_error"];
			searchErrors({
				errorsData,
				rowData,
				td,
				tippy,
				cellProperties: rowData?.canEdit ? cellProperties : null,
			});

			td.innerHTML = value;
			return td;
		},
	},
	{
		title: "Кон<br/>ЦВ",
		type: "text",
		data: "finalColorSheetCount",
		readOnly: true,
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["final_color_sheet_count_error"];
			// Обработка ошибок
			searchErrors({
				errorsData,
				rowData,
				td,
				tippy,
				cellProperties: rowData?.canEdit ? cellProperties : null,
			});

			td.innerHTML = value;
			return td;
		},
	},
	// { title: "Конечный<br/>ЦВ ланта", readOnly: true, type: "text", data: "" },
	{
		title: "Итог<br/>ЦВ",
		readOnly: true,
		type: "text",
		data: "colorSheetCountDiff",
	},
	{ id: "sticker", title: "Наклейки", readOnly: true, type: "text", data: "sticker", value: 12 },
	{ title: "Стоимость<br/>ЧБ", readOnly: true, type: "text", data: "finalCostBw" },
	{ title: "Стоимость<br/>ЦВ", readOnly: true, type: "text", data: "finalCostColor" },
	{
		title: "Цена<br/>ЦВ",
		readOnly: true,
		type: "text",
		data: "colorSheetCost",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["color_sheet_cost_error"];
			// Обработка ошибок
			searchErrors({
				errorsData,
				rowData,
				td,
				tippy,
				cellProperties: rowData?.canEdit ? cellProperties : null,
			});

			td.innerHTML = value;
			return td;
		},
	},
	{
		title: "Цена<br/>ЧБ",
		readOnly: true,
		type: "text",
		data: "bwSheetCost",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["bw_sheet_cost_error"];
			// Обработка ошибок
			searchErrors({
				errorsData,
				rowData,
				td,
				tippy,
				cellProperties: rowData?.canEdit ? cellProperties : null,
			});

			td.innerHTML = value;
			return td;
		},
	},
];

const hotSettings = {
	columns: filteredCol.value,
	filters: true,
	afterSelection: () => {
		document.querySelectorAll('[aria-hidden="true"]').forEach((element) => {
			element.removeAttribute("aria-hidden");
		});
	},
	afterChange: async (changes, source) => {
		try {
			document.querySelectorAll("[inert]").forEach((element) => {
				element.setAttribute("aria-hidden", "true");
			});
			if (source === "edit") {
				console.log(changes, source);
				const arr = changes[0];
				const index = arr[0];
				const name = arr[1];
				const value = arr[3];
				data.value[index][name] = value;

				if (data.value[index].canEdit) {
					const params = {
						billingId: infoPage.value.id,
					};
					if (name == "assetName") {
						Object.assign(params, {
							assetInfo: {
								assetName: value,
								printerModel: data.value[index].printerModel,
							},
						});
					} else {
						Object.assign(params, { [name]: value });
					}
					const response = await api.put(`/billings/billing-items/${data.value[index].id}`, params);
					const newItem = response.data.data;
					data.value[index] = newItem;

					const responseInfo = await api.get(`billings/${infoPage.value.id}`);
					infoPage.value = responseInfo.data.data;
				}
				billingTable.value.hotInstance.loadData(data.value);
			}
		} catch (e) {
			console.error(e);
			toastStore.show("Ошибка!", e?.message, "error", 10000);
		}
	},
	// Сохранение порядка после перемещения
	manualColumnMove: true, // Устанавливаем порядок колонок
	afterColumnMove: (movedColumns, finalIndex, dropIndex, movePossible, orderChanged) => {
		// console.log({ movedColumns }, finalIndex, dropIndex, movePossible, orderChanged);
		if (!orderChanged) return;

		const hot = billingTable.value.hotInstance;
		const currentOrder = hot
			.getPlugin("manualColumnMove")
			.hot.columnIndexMapper.fromPhysicalToVisualIndexesCache.keys();

		const savedOrder = JSON.parse(localStorage.getItem("columnsOrderClientBillings"));

		// Если порядок совпадает с сохранённым — это инициализация, не сохраняем
		if (isSameOrder(Array.from(currentOrder), savedOrder)) return;
		// console.log({ currentOrder: Array.from(currentOrder), savedOrder });

		setColumnsOrder("ClientBillings", hot);
		setColumnsWidth("ClientBillings", hot);
	},
	// Сохранение размеров после перемещения
	manualColumnResize: true,
	afterColumnResize: (newSize, column, isDoubleClick) => {
		if (newSize) {
			setColumnsOrder("ClientBillings", billingTable.value.hotInstance);
			setColumnsWidth("ClientBillings", billingTable.value.hotInstance);
		}
	},
	cells: (row, col) => {
		const cellProperties = {};
		const rowData = data.value[row];
		const column = billingTable.value.hotInstance.getSettings().columns[col];
		if (column.id === "buttons") {
			// Пропускаем кастомный рендер для кнопок
			return cellProperties;
		}

		// Сохраняем оригинальный рендерер, если он был указан в columns
		const originalRenderer = column.renderer || Handsontable.renderers.TextRenderer;

		cellProperties.renderer = (instance, td, row, col, prop, value, cellProperties) => {
			// Вызываем оригинальный рендерер
			originalRenderer.call(this, instance, td, row, col, prop, value, cellProperties);

			// Дополнительная логика для раскраски
			if (rowData && rowData.isAgreed) {
				td.classList.add("bg-green-color");
				td.value = tippy(td, { content: "Утверждено" });
			} else if (rowData && !rowData.isAgreed && rowData.isAgreed !== null) {
				td.classList.add("bg-red-color");
				td.value = tippy(td, { content: "Отклонено" });
			}
		};
		return cellProperties;
	},
	rowHeights: 40,
	autoWrapRow: true,
	autoWrapCol: true,
	dropdownMenu: ["filter_by_condition", "filter_by_value", "filter_action_bar"],
	columnSorting: true,
	width: "100%",
	height: "54vh",
	stretchH: "all",
	licenseKey: "non-commercial-and-evaluation",
	afterGetColHeader: removeFilters(0),
	afterRenderer: paintRow(billingTable),
};

watch([selectedColumn, filterValue], ([newSelectedColumn, newFilterValue], [oldSelectedColumn]) => {
	// console.log({ newSelectedColumn, newFilterValue, oldSelectedColumn });
	const handsontableInstance = billingTable.value.hotInstance;
	let physicalIndex;
	if (newSelectedColumn == 3) {
		physicalIndex = handsontableInstance.getSettings().columns.findIndex((col) => col.id === "serialNumber");
	} else if (newSelectedColumn == 12) {
		physicalIndex = handsontableInstance.getSettings().columns.findIndex((col) => col.id === "sticker");
	}

	// Преобразуем physical index в visual index с учётом текущего порядка
	const visualIndex = handsontableInstance.toVisualColumn(physicalIndex);

	const filtersPlugin = handsontableInstance.getPlugin("filters");
	filtersPlugin.clearConditions();
	if (newSelectedColumn !== oldSelectedColumn) {
		filterValue.value = "";
	}
	if (newFilterValue) {
		filtersPlugin.addCondition(visualIndex, "contains", [newFilterValue]);
	}
	filtersPlugin.filter();
	handsontableInstance.render();
});

const downloadTestList = async () => {
	try {
		const id = route.query.id;
		const response = await api.get(`/billings/${id}/specs`, {
			responseType: "blob", // <--- ОБЯЗАТЕЛЬНО для бинарных данных
		});
		// Создаем ссылку на файл
		const url = window.URL.createObjectURL(new Blob([response.data]));
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", "specs.zip"); // Название файла для скачивания
		document.body.appendChild(link);
		link.click();

		// Очистка
		link.remove();
		window.URL.revokeObjectURL(url);
	} catch (e) {
		console.error(e);
	}
};
const downloadExcel = async () => {
	try {
		const id = route.query.id;
		const response = await api.get(`/billings/${id}/export`, {
			responseType: "blob", // <--- ОБЯЗАТЕЛЬНО для бинарных данных
		});
		// Создаем ссылку на файл
		const url = window.URL.createObjectURL(new Blob([response.data]));
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", "billings.xlsx"); // Название файла для скачивания
		document.body.appendChild(link);
		link.click();

		// Очистка
		link.remove();
		window.URL.revokeObjectURL(url);
	} catch (e) {
		console.error(e);
	}
};
async function deleteRow(billingId) {
	try {
		const response = await api.delete(`billings/billing-items/${billingId}`);

		const index = data.value.findIndex((item) => item.id == billingId);
		billingTable.value.hotInstance.alter("remove_row", index);

		const responseInfo = await api.get(`billings/${infoPage.value.id}`);
		infoPage.value = responseInfo.data.data;

		console.log(responseInfo.data, response.data);
		// billingTable.value.hotInstance.loadData(data.value);
	} catch (error) {
		console.error("Failed to delete row:", error);
		throw error;
	}
}
async function getData() {
	try {
		const billingId = route.query.id;
		const response = await api.get(`billings/${billingId}/billing-items`);
		data.value = response.data.data.billingItems;

		// data.value[0].canEdit = true;
		// data.value[0].errors = [
		// 	{
		// 		name: "initial_color_sheet_count_error",
		// 		slug: "Прикрепите файл",
		// 	},
		// ];

		const responseInfo = await api.get(`billings/${billingId}`);
		infoPage.value = responseInfo.data.data;

		loading.value = false;
		await nextTick();

		const hot = billingTable?.value?.hotInstance;
		if (hot) {
			hot.loadData(data.value);
			hot.updateSettings({ columns: filteredCol.value });
			// Загрузка данных из локального хранилища
			loadColumnsData("ClientBillings", hot);
		}
	} catch (e) {
		console.error(e);

		loading.value = false;
	}
}
onMounted(async () => {
	await getData();
});
</script>
