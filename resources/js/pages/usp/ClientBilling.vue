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
				<div class="d-flex align-center">
					Ссылка на тест. листы:&nbsp;
					<a
						class="text-primary font-weight-bold d-inline-block text-truncate"
						style="max-width: 150px"
						:href="infoPage.href"
						target="_blank"
					>
						{{ infoPage?.href || "Не указано" }}
					</a>
					<v-tooltip text="Скопировать ссылку">
						<template #activator="{ props }">
							<v-btn
								variant="flat"
								density="compact"
								class="pa-0 ma-0"
								min-width="30"
								v-bind="props"
								@click="copyTestLink"
							>
								<v-icon>mdi-content-copy</v-icon>
							</v-btn>
						</template>
					</v-tooltip>
				</div>
			</div>
			<v-btn :disabled="!infoPage.canTake" color="primary" variant="flat" @click="takeOnCheck()">
				Взять на проверку
			</v-btn>
		</div>

		<cityPicker
			ref="cityPickerRef"
			:billing-item-id="actualBillingItemId"
			:activator="activatorCityRef"
			@apply="applyCity($event)"
		/>

		<modelSearch
			ref="modelSearchRef"
			:activator="activatorModelRef"
			:billing-item-id="actualBillingItemId"
			@apply="applyModel($event)"
		/>

		<div v-if="!loading && data.length" class="d-flex w-100 ga-5">
			<div class="d-flex w-50 align-center">
				<v-select
					id="columns"
					v-model="selectedColumn"
					:items="
						columns
							.filter((col) => col.value)
							.map((col) => ({
								title: col.title?.replace(/<[^>]*>/g, ' '),
								value: col.value,
							}))
					"
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
			<v-skeleton-loader v-if="loading" class="border" type="table"></v-skeleton-loader>
			<h3 v-if="!loading && !data.length" class="text-h6 no-data">Нет позиций в биллинге</h3>
			<hot-table
				v-if="!loading && data.length"
				ref="hotTableComponentRef"
				:settings="hotSettings"
				:language="language"
			/>
		</div>
		<!-- <v-textarea
			v-if="!loading && data.length"
			v-model="comment"
			label="Комментарий"
			variant="outlined"
			color="primary"
			hide-details
			density="compact"
		/> -->
		<div v-if="!loading && data.length" class="d-flex ga-5">
			<v-btn
				color="primary"
				variant="flat"
				prepend-icon="mdi mdi-send-check"
				:disabled="checkApprove"
				@click="approveAnalyst(data.id)"
			>
				Согласовать
			</v-btn>
			<v-spacer />
			<v-btn color="primary" variant="flat" prepend-icon="mdi mdi-tray-arrow-down" @click="downloadTestList"
				>Скачать тест. листы</v-btn
			>
			<v-btn color="primary" variant="flat" prepend-icon="mdi mdi-tray-arrow-down" @click="downloadExcel"
				>Выгрузить в excel</v-btn
			>
		</div>
	</v-container>
</template>

<script setup>
import { api } from "@/axios";
import cityPicker from "@/components/cityPicker.vue";
import modelSearch from "@/components/modelSearch.vue";
import {
	deleteTippy,
	isSameOrder,
	loadColumnsData,
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

const route = useRoute();
const toastStore = useToastStore();
const loading = ref(true);

const hotTableComponentRef = ref(null);

const selectedColumn = ref(2);
const filterValue = ref("");
const language = "ru-RU";

const cityPickerRef = ref(null);
const activatorCityRef = ref(null);
const actualBillingItemId = ref(null);

const modelSearchRef = ref(null);
const activatorModelRef = ref(null);

const data = ref([]);
const infoPage = ref({});

const filteredCol = computed(() => {
	if (data.value.some((item) => item.canEdit)) {
		return columns;
	} else {
		return columns.filter((item) => item.id != "buttons");
	}
});

const checkApprove = computed(() => {
	return data.value.some((item) => item.isAgreed == null || !item.commentAnalyst);
});
const applyCity = async ({ value, id } = {}) => {
	try {
		const params = {
			userClientCityId: value,
		};

		console.log({ value, id });
		const responseCity = await api.post(`/billings/billing-items/${id}/asset`, params);
		console.log(responseCity);
		toastStore.show("Успех!", responseCity?.data.message, "success", 10000);

		const response = await api.put(`/billings/billing-items/${id}`, { billingId: infoPage.value.id });
		const newItem = response.data.data;
		const index = data.value.findIndex((item) => item.id == id);
		data.value[index] = newItem;
		cityPickerRef?.value?.closeMenu();
		hotTableComponentRef.value.hotInstance.loadData(data.value);

		const responseInfo = await api.get(`billings/${infoPage.value.id}`);
		infoPage.value = responseInfo.data.data;
	} catch (e) {
		console.error(e);
		toastStore.show("Ошибка!", e?.response.data.message, "error", 10000);

		const response = await api.put(`/billings/billing-items/${id}`, { billingId: infoPage.value.id });
		const newItem = response.data.data;
		const index = data.value.findIndex((item) => item.id == id);
		data.value[index] = newItem;
		cityPickerRef?.value?.closeMenu();
		hotTableComponentRef.value.hotInstance.loadData(data.value);

		const responseInfo = await api.get(`billings/${infoPage.value.id}`);
		infoPage.value = responseInfo.data.data;
	}
};
const applyModel = async ({ value, id } = {}) => {
	try {
		const index = data.value.findIndex((item) => item.id == id);
		const params = {
			billingId: infoPage.value.id,
			assetInfo: {
				assetName: data.value[index].assetName,
				printerModel: value.name,
			},
		};

		console.log({ value, id });

		// toastStore.show("Успех!", responseModel?.data.message, "success", 10000);

		const response = await api.put(`/billings/billing-items/${id}`, params);
		const newItem = response.data.data;
		data.value[index] = newItem;
		modelSearchRef?.value?.closeMenu();
		hotTableComponentRef.value.hotInstance.loadData(data.value);

		const responseInfo = await api.get(`billings/${infoPage.value.id}`);
		infoPage.value = responseInfo.data.data;
	} catch (e) {
		console.error(e);
		toastStore.show("Ошибка!", e?.response.data.message, "error", 10000);

		// const response = await api.put(`/billings/billing-items/${id}`, { billingId: infoPage.value.id });
		// const newItem = response.data.data;
		// const index = data.value.findIndex((item) => item.id == id);
		// data.value[index] = newItem;
		modelSearchRef?.value?.closeMenu();
		// hotTableComponentRef.value.hotInstance.loadData(data.value);

		// const responseInfo = await api.get(`billings/${infoPage.value.id}`);
		// infoPage.value = responseInfo.data.data;
	}
};

watch([selectedColumn, filterValue], ([newSelectedColumn, newFilterValue], [oldSelectedColumn]) => {
	// console.log({ newSelectedColumn, newFilterValue, oldSelectedColumn });
	const handsontableInstance = hotTableComponentRef.value.hotInstance;
	let physicalIndex;
	if (newSelectedColumn == 2) {
		physicalIndex = handsontableInstance.getSettings().columns.findIndex((col) => col.id === "serialNumber");
	} else if (newSelectedColumn == 11) {
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

const columns = [
	{
		id: "buttons",
		width: 100,
		minWidth: 75,
		columnSorting: {
			headerAction: false,
		},
		readOnly: true,
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			Handsontable.renderers.TextRenderer.call(this, instance, td, row, col, prop, value, cellProperties);
			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const id = rowData.id;

			const buttonSuccess = document.createElement("button");
			const buttonError = document.createElement("button");

			buttonSuccess.className = "table_success_button mr-2";
			buttonError.className = "table_error_button";
			td.className = "htMiddle";

			if (!rowData.canEdit) return;

			td.appendChild(buttonSuccess);
			td.appendChild(buttonError);

			buttonSuccess.addEventListener("click", () => {
				updateStatus(id, true);
			});

			buttonError.addEventListener("click", () => {
				updateStatus(id, false);
			});

			return td;
		},
	},
	{
		title: "Модель",
		type: "dropdown",
		data: "printerModel",
		strict: false,
		readOnly: true,
		columnSorting: {
			headerAction: false,
		},
		renderer: (instance, td, row, col, prop, value) => {
			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const canEdit = rowData?.canEdit;

			td.innerHTML = "";
			const container = document.createElement("div");
			container.className = "container d-flex flex-column ga-1 py-1";
			const div = document.createElement("div");
			div.textContent = value;

			if (canEdit) {
				div.className = " d-flex align-center flex-row justify-space-between";
				const btn = document.createElement("button");
				btn.className = "btn btn-sm btn-primary d-flex align-center justify-center";
				const icon = document.createElement("i");
				icon.className = "mdi mdi-table-edit";
				btn.appendChild(icon);

				modelSearchRef?.value?.closeMenu();

				btn.addEventListener("click", async (e) => {
					e.stopPropagation();

					activatorModelRef.value = null;
					await nextTick(); // Ждём, чтобы DOM обновился
					activatorModelRef.value = btn;

					actualBillingItemId.value = rowData.id;
					modelSearchRef?.value?.openMenu();
				});

				div.appendChild(btn);
			}
			container.appendChild(div);
			td.appendChild(container);

			return td;
		},
	},
	{ title: "Адрес", type: "text", readOnly: true, data: "address" },
	{
		id: "serialNumber",
		title: "Серийный<br/>номер",
		type: "text",
		width: 100,
		data: "assetName",
		readOnly: true,
		value: 2,
		renderer: async (instance, td, row, col, prop, value) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			td.innerHTML = "";
			const container = document.createElement("div");
			container.className = "container d-flex flex-column ga-1 py-1";

			const div = document.createElement("div");
			div.textContent = value;

			let errorData = rowData?.errors?.find((error) => error.name === "assets_not_found");
			if (errorData) {
				td.className += "bg-red-color";
				td.value = tippy(td, { content: errorData?.slug });

				if (rowData.canEdit) {
					div.className = " d-flex align-center flex-row justify-space-between";
					const btn = document.createElement("button");
					btn.className = "btn btn-sm btn-primary d-flex align-center justify-center";
					const icon = document.createElement("i");
					icon.className = "mdi mdi-plus";
					btn.appendChild(icon);

					cityPickerRef?.value?.closeMenu();

					btn.addEventListener("click", async (e) => {
						e.stopPropagation();

						activatorCityRef.value = null;
						await nextTick(); // Ждём, чтобы DOM обновился
						activatorCityRef.value = btn;

						actualBillingItemId.value = rowData.id;
						cityPickerRef?.value?.openMenu();
					});

					div.appendChild(btn);
				}
			}

			container.appendChild(div);
			td.appendChild(container);

			return td;
		},
	},
	{
		title: "Комментарий",
		type: "text",
		readOnly: true,
		editor: "textareaEditor",
		data: "commentPartner",
	},
	{
		title: "Комментарий<br/>Ланты",
		width: 170,
		type: "text",
		readOnly: true,
		editor: "textareaEditor",
		data: "commentAnalyst",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			Handsontable.renderers.TextRenderer.call(this, instance, td, row, col, prop, value, cellProperties);
			td.style.whiteSpace = "pre-wrap";
			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const canEdit = rowData?.canEdit;
			if (canEdit) {
				if (!rowData?.isAgreed && rowData?.isAgreed !== null) {
					td.innerHTML = "";
					td.innerHTML = value;
					cellProperties.readOnly = false;
				} else if (rowData?.isAgreed != null) {
					const index = data.value.findIndex((item) => item.id == rowData.id);
					data.value[index]["commentAnalyst"] = "Проверено";
					td.innerHTML = "Проверено";
				}
			}
		},
	},
	{
		title: "Нач<br/>ЧБ",
		readOnly: true,
		type: "text",
		width: 80,
		data: "initialBwSheetCount",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["initial_bw_sheet_count_error"];
			// Обработка ошибок
			searchErrors({ errorsData, rowData, td, tippy });
			td.innerHTML = value;
			return td;
		},
	},
	{
		title: "Кон<br/>ЧБ",
		readOnly: true,
		type: "text",
		width: 80,
		data: "finalBwSheetCount",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["final_bw_sheet_count_error"];
			// Обработка ошибок
			searchErrors({ errorsData, rowData, td, tippy });
			td.innerHTML = value;
			return td;
		},
	},
	{ title: "Итог<br/>ЧБ", readOnly: true, type: "text", data: "bwSheetCountDiff" },
	{
		title: "Нач<br/>ЦВ",
		readOnly: true,
		type: "text",
		width: 80,
		data: "initialColorSheetCount",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["initial_color_sheet_count_error"];
			// Обработка ошибок
			searchErrors({ errorsData, rowData, td, tippy });
			td.innerHTML = value;
			return td;
		},
	},
	{
		title: "Кон<br/>ЦВ",
		type: "text",
		width: 80,
		data: "finalColorSheetCount",
		readOnly: true,
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["final_color_sheet_count_error"];
			// Обработка ошибок
			searchErrors({ errorsData, rowData, td, tippy });
			td.innerHTML = value;
			return td;
		},
	},
	// { title: "Конечный<br/>ЦВ ланта", readOnly: true, type: "text", data: "" },
	{ title: "Итог<br/>ЦВ", readOnly: true, type: "text", width: 80, data: "colorSheetCountDiff" },
	{ id: "sticker", title: "Наклейки", readOnly: true, type: "text", width: 80, data: "sticker", value: 11 },
	{ title: "Стоим<br/>ЧБ", readOnly: true, type: "text", width: 80, data: "finalCostBw" },
	{ title: "Стоим<br/>ЦВ", readOnly: true, type: "text", width: 80, data: "finalCostColor" },
	{
		title: "Цена<br/>ЦВ",
		readOnly: true,
		type: "text",
		width: 80,
		data: "colorSheetCost",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["color_sheet_cost_error"];
			// Обработка ошибок
			searchErrors({ errorsData, rowData, td, tippy });
			td.innerHTML = value;
			return td;
		},
	},
	{
		title: "Цена<br/>ЧБ",
		readOnly: true,
		type: "text",
		width: 80,
		data: "bwSheetCost",
		renderer: (instance, td, row, col, prop, value, cellProperties) => {
			deleteTippy(td);

			const physicalRowIndex = instance.toPhysicalRow(row);
			const rowData = instance.getSourceData()[physicalRowIndex];
			if (!rowData) return td;

			const errorsData = ["bw_sheet_cost_error"];
			// Обработка ошибок
			searchErrors({ errorsData, rowData, td, tippy });
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
			// console.log(changes, source)
			document.querySelectorAll("[inert]").forEach((element) => {
				element.setAttribute("aria-hidden", "true");
			});
			if (source === "edit") {
				const arr = changes[0];
				const index = arr[0];
				const name = arr[1];
				const value = arr[3];
				data.value[index][name] = value;

				if (data.value[index].canEdit) {
					const params = {
						billingId: infoPage.value.id,
					};
					if (name == "printerModel") {
						Object.assign(params, {
							assetInfo: {
								assetName: data.value[index].assetName,
								printerModel: value,
							},
						});
					} else {
						Object.assign(params, { [name]: value });
					}
					// commentAnalyst: data.value[index].commentAnalyst,

					const billingItemId = data.value[index].id;
					const response = await api.put(`billings/billing-items/${billingItemId}`, params);
					const newItem = response.data.data;
					data.value[index] = newItem;

					const responseInfo = await api.get(`billings/${infoPage.value.id}`);
					infoPage.value = responseInfo.data.data;
					console.log(response.data);
				}
				hotTableComponentRef.value.hotInstance.loadData(data.value);
			}
		} catch (e) {
			console.error(e);
		}
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
			setColumnsOrder("ClientBillings", hotTableComponentRef.value.hotInstance);
			setColumnsWidth("ClientBillings", hotTableComponentRef.value.hotInstance);
		}
	},
	cells: (row, col) => {
		const cellProperties = {};
		const rowData = data.value[row];
		const column = hotTableComponentRef.value.hotInstance.getSettings().columns[col];
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
	allowInvalid: false,
	autoWrapRow: true,
	autoWrapCol: true,
	dropdownMenu: ["filter_by_condition", "filter_by_value", "filter_action_bar"],
	columnSorting: true,
	width: "100%",
	height: "54vh",
	stretchH: "all",
	licenseKey: "non-commercial-and-evaluation",
	afterGetColHeader: removeFilters(0),
	afterRenderer: paintRow(hotTableComponentRef, [0]),
};

const takeOnCheck = async () => {
	try {
		const billingId = route.query.id;
		const response = await api.post(`/billings/${billingId}/take`);

		getData();

		toastStore.show("Успех!", response.data.message, "success", 10000);
		console.log(response);
	} catch (error) {
		console.error(error);
		toastStore.show("Ошибка!", error.data.message, "error", 10000);
	}
};
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
const approveAnalyst = async () => {
	try {
		const billingId = route.query.id;
		const response = await api.post(`billings/${billingId}/analyst-approve`);

		getData();

		toastStore.show("Успех!", response.data.message, "success", 10000);
		console.log(response);
	} catch (error) {
		console.error(error);
		toastStore.show("Ошибка!", error.data.message, "error", 10000);
	}
};
async function updateStatus(billingItemId, newStatus) {
	try {
		let link = "";
		if (newStatus) {
			link = `/billings/billing-items/${billingItemId}/agree`;
		} else {
			link = `/billings/billing-items/${billingItemId}/disagree`;
		}
		const response = await api.post(link);
		console.log(response);

		getData();
	} catch (error) {
		console.error(error);
	}
}

async function copyTestLink() {
	const textArea = document.createElement("textarea");
	textArea.value = infoPage.value.href;
	document.body.appendChild(textArea);
	textArea.select();
	try {
		document.execCommand("copy");
	} catch (err) {
		console.error("Не удалось скопировать ссылку:", err);
	}
	document.body.removeChild(textArea);
}
const setScrollWatcher = (hot) => {
	const scrollable = hot.view?._wt?.wtTable?.hider?.parentElement;
	if (scrollable) {
		scrollable.addEventListener("scroll", () => {
			cityPickerRef?.value?.closeMenu();
			modelSearchRef?.value?.closeMenu();
		});
	}
};
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

		const hot = hotTableComponentRef?.value?.hotInstance;
		if (hot) {
			setScrollWatcher(hot);

			hot.loadData(data.value);
			hot.updateSettings({ columns: filteredCol.value });
			// Загрузка данных из локального хранилища
			loadColumnsData("ClientBillings", hot);
		}
	} catch (e) {
		console.error(e);
	}
}
onMounted(async () => {
	await getData();
});
</script>
