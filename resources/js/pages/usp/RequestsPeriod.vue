<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<div v-if="!loading && data.length" class="d-flex w-100 ga-5">
			<div class="d-flex w-50 align-center">
				<!-- {{ mapFilters.isApproved.valueModel }} -->
				<!-- {{ changedParams }} -->
				<!-- {{ mapFilters?.user?.valueModel }}
				<br />
				{{ isQueryParamsNonEmpty }}
				<br />
				{{ { lengthPaginationData, totalItems } }} -->
				<v-select
					id="columns"
					v-model="selectedColumn"
					:items="hotSettings.columns.filter((col) => col.value)"
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

		<!-- Кастомные фильтры -->
		<div v-for="(filter, key) in mapFiltersForTemplate" :key="key" class="d-none">
			<customFilter
				:ref="(el) => (mapFilters[key].refElement.value = el)"
				:model-value="filter.selected"
				:items="filter.options"
				:activator="filter.activator"
				@update:model-value="filter.updateSelected"
				@clear="fetchFilters({ value: $event, key })"
				@apply="fetchFilters({ value: $event, key })"
			/>
		</div>

		<div class="w-100 d-flex align-center justify-space-between">
			<v-checkbox v-model="onlyErrors" label="Только заявки с ошибками" />
			<v-btn
				:disabled="!isQueryParamsNonEmpty"
				color="primary"
				prepend-icon="mdi mdi-trash-can"
				variant="flat"
				@click="resetFilters"
			>
				Сбросить фильтры
			</v-btn>
		</div>
		<div class="w-100">
			<v-skeleton-loader v-if="loading" class="border" type="table"></v-skeleton-loader>
			<h3 v-if="!loading && !totalItems" class="text-h6 no-data">Нет заявок</h3>
			<hot-table
				v-show="!loading && totalItems"
				ref="hotTableComponentRef"
				:settings="hotSettings"
				:language="language"
			></hot-table>
			<v-pagination
				v-show="!loading && totalItems"
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
import { api } from "@/axios/index.js"
import customFilter from "@/components/customFilter.vue"
import {
	createFilter,
	deleteTippy,
	isSameOrder,
	loadColumnsData,
	removeFilters,
	searchErrors,
	setColumnsOrder,
	setColumnsWidth,
} from "@/helpers"
import { useToastStore } from "@/stores/toast.store.js"
import { HotTable } from "@handsontable/vue3"
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { tippy } from "vue-tippy"

// Stores
const toastStore = useToastStore();
const route = useRoute();
const router = useRouter();

const language = "ru-RU";
const loading = ref(true);
const data = ref([]);

// Данные для выпадающих списков
const dataSelectAreas = ref([]);
const dataSelectClients = ref([]);
const dataSelectCategories = ref([]);

const hotTableComponentRef = ref(null);
const selectedColumn = ref(2);
const filterValue = ref("");
const changedParams = ref([]);
const isFiltersReady = ref(false);

const pager = ref(1);
const itemsOnPage = ref(20);
const totalItems = ref(0);
const lengthPaginationData = computed(() => {
	if (totalItems.value >= itemsOnPage.value) {
		return Math.ceil(totalItems.value / itemsOnPage.value);
	}
	return 1;
});
watch(
	() => pager.value,
	(newVal) => {
		const currentPage = Number(route.query.page || 1);
		if (currentPage !== newVal) {
			console.log(route);
			router.replace({
				query: {
					...route.query,
					page: newVal.toString(),
				},
			});
			hotTableLoadData();
		}
	},
);

const onlyErrors = ref(false);

watch(
	() => !loading.value && totalItems.value,
	(visible) => {
		if (visible) {
			// Решение проблемы с v-show, когда в таблице не отображаются данные, хотя они загружены
			nextTick(() => {
				// console.log("hotTableComponentRef.value?.hotInstance?.render()");
				hotTableComponentRef.value?.hotInstance?.render();
			});
		}
	},
);

// Показывать только заявки с ошибками
watch(
	() => onlyErrors.value,
	(value) => {
		if (value && hotTableComponentRef?.value?.hotInstance) {
			pager.value = 1;
			hotTableLoadData();
		} else if (!value && hotTableComponentRef?.value?.hotInstance) {
			pager.value = 1;
			hotTableLoadData();
		}
	},
);
// Поиск по номеру заявки
watch([selectedColumn, filterValue], ([newSelectedColumn, newFilterValue]) => {
	const handsontableInstance = hotTableComponentRef.value.hotInstance;
	const actualData = hotTableLoadData();
	const newData = actualData.filter((row) => {
		const text = row.orderCode.toString().toLowerCase();
		const query = newFilterValue.toString().toLowerCase();

		return text.includes(query);
	});
	totalItems.value = newData.length;
	const slicedData = newData.slice((pager.value - 1) * itemsOnPage.value, pager.value * itemsOnPage.value);

	handsontableInstance.loadData(slicedData);
	handsontableInstance.render();
});

// Фильтры
const isQueryParamsNonEmpty = computed(() => {
	const hasSelectedFilters = Object.values(mapFilters).some((filter) => filter.valueModel.value.length > 0);

	return hasSelectedFilters;
});
// TODO подумать над тем, чтобы применить эту логику и в других местах
// Значения для фильтров
function optionsFilter(key) {
	const filtered = isFiltersReady.value ? filteredData() : data.value;
	const source = onlyErrors.value ? filtered.filter((item) => item.errors.length) : filtered;

	const rawValues = source.map((item) => {
		const val = item[key];
		return val == null || (typeof val === "string" && val.trim() === "") ? "" : val;
	});

	const uniqueValues = [...new Set(rawValues)];
	uniqueValues.sort((a, b) => {
		if (a === "") return -1;
		if (b === "") return 1;
		return String(a).localeCompare(String(b), "ru", { numeric: true });
	});

	return uniqueValues.map((val) => {
		if (key === "isApproved") {
			let label;
			if (val === "" || val == null) {
				label = "<Пустое значение>";
			} else if (val === 1) {
				label = "Утверждён";
			} else if (val === 0) {
				label = "Не утверждён";
			} else {
				label = String(val);
			}

			return { label, value: val };
		}

		return {
			label: val === "" || val == null ? "<Пустое значение>" : String(val),
			value: val,
		};
	});
}
const mapFilters = {
	isApproved: createFilter(() => optionsFilter("isApproved")),
	penaltyReason: createFilter(() => optionsFilter("penaltyReason")),
	finalAmount: createFilter(() => optionsFilter("finalAmount")),
	penaltyAmount: createFilter(() => optionsFilter("penaltyAmount")),
	agreedAmount: createFilter(() => optionsFilter("agreedAmount")),
	actualCompletionDate: createFilter(() => optionsFilter("actualCompletionDate")),
	plannedCompletionDate: createFilter(() => optionsFilter("plannedCompletionDate")),
	reportRequestCategory: createFilter(() => optionsFilter("reportRequestCategory")),
	area: createFilter(() => optionsFilter("area")),
	orderCode: createFilter(() => optionsFilter("orderCode")),
	usp: createFilter(() => optionsFilter("usp")),
	user: createFilter(() => optionsFilter("user")),
	client: createFilter(() => optionsFilter("client")),
};
const mapFiltersForTemplate = computed(() => {
	const obj = {};
	for (const [key, filter] of Object.entries(mapFilters)) {
		obj[key] = {
			...filter,
			selected: filter.valueModel.value,
			options: filter.options.value,
			activator: filter.activator.value,
			updateSelected(val) {
				filter.valueModel.value = val;
			},
		};
	}
	return obj;
});
const filteredData = () => {
	let baseData = data.value;

	if (onlyErrors.value) {
		baseData = baseData.filter((item) => item.errors?.length);
	}

	return baseData.filter((row) => {
		return Object.entries(mapFilters).every(([key, filter]) => {
			return filter.filterFn(row[key]);
		});
	});
};

function updateURLFilters() {
	const query = { ...route.query };

	// Удалим все старые фильтры из query
	for (const key of Object.keys(mapFilters)) {
		delete query[key];
	}

	// Добавим актуальные фильтры
	for (const [key, filter] of Object.entries(mapFilters)) {
		if (filter.valueModel.value.length > 0) {
			query[key] = filter.valueModel.value.join(",");
		}
	}

	router.replace({ query });
}

function loadFiltersFromURL() {
	const params = route.query;
	pager.value = Number(params.page || 1);
	for (const [key, filter] of Object.entries(mapFilters)) {
		const raw = params[key];
		if (raw || raw == "") {
			filter.valueModel.value = raw.split(",").map((v) => {
				if (v == "") return v;
				const num = Number(v);
				return isNaN(num) ? v : num;
			});
		} else {
			filter.valueModel.value = [];
		}
	}
}
async function fetchFilters({ value, key } = {}) {
	isFiltersReady.value = false;
	if (key && mapFilters[key]) {
		mapFilters[key].valueModel.value = value;
	}

	pager.value = 1;

	updateURLFilters();

	await nextTick();

	if (hotTableComponentRef?.value?.hotInstance) {
		const newData = filteredData();

		totalItems.value = newData.length;
		hotTableComponentRef.value.hotInstance.loadData(
			newData.slice((pager.value - 1) * itemsOnPage.value, pager.value * itemsOnPage.value),
		);
	}
	isFiltersReady.value = true;
}

function resetFilters() {
	for (const filter of Object.values(mapFilters)) {
		filter.valueModel.value = [];
	}
	pager.value = 1;
	onlyErrors.value = false;

	// Обновление URL после очистки
	fetchFilters();
}
// TODO сделать единый механизм для обновления таблицы
const hotTableLoadData = (newVal = null, idItem, name = "") => {
	// Update value
	if (newVal !== null) {
		const itemIndex = data.value.findIndex((item) => item.id === idItem);
		if (name) {
			data.value[itemIndex][name] = newVal;
		} else {
			data.value[itemIndex] = newVal;
		}
	}
	// console.log(totalItems.value);
	if (isQueryParamsNonEmpty.value) {
		const filtered = filteredData();

		if (onlyErrors.value) {
			const newData = filtered.filter((item) => item.errors.length);

			totalItems.value = newData.length;
			const slicedData = newData.slice((pager.value - 1) * itemsOnPage.value, pager.value * itemsOnPage.value);
			hotTableComponentRef.value.hotInstance.loadData(slicedData);
			return newData;
		} else {
			const slicedData = filtered.slice((pager.value - 1) * itemsOnPage.value, pager.value * itemsOnPage.value);
			totalItems.value = filtered.length;
			hotTableComponentRef.value.hotInstance.loadData(slicedData);
			return filtered;
		}
	} else {
		if (onlyErrors.value) {
			const newData = data.value.filter((item) => item.errors.length);

			totalItems.value = newData.length;
			const slicedData = newData.slice((pager.value - 1) * itemsOnPage.value, pager.value * itemsOnPage.value);
			hotTableComponentRef.value.hotInstance.loadData(slicedData);
			return newData;
		} else {
			const slicedData = data.value.slice((pager.value - 1) * itemsOnPage.value, pager.value * itemsOnPage.value);
			totalItems.value = data.value.length;
			hotTableComponentRef.value.hotInstance.loadData(slicedData);
			return data.value;
		}
	}
};

const filterColumns = {
	user: "user",
	isApproved: "isApproved",
	client: "client",
	usp: "usp",
	orderCode: "orderCode",
	area: "area",
	reportRequestCategory: "reportRequestCategory",
	plannedCompletionDate: "plannedCompletionDate",
	actualCompletionDate: "actualCompletionDate",
	agreedAmount: "agreedAmount",
	penaltyAmount: "penaltyAmount",
	finalAmount: "finalAmount",
	penaltyReason: "penaltyReason",
};

const hotSettings = {
	rowHeights: 40,
	afterSelection: () => {
		document.querySelectorAll('[aria-hidden="true"]').forEach((element) => {
			element.removeAttribute("aria-hidden");
		});
	},
	// При изменении ячейки
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

				const newData = hotTableLoadData();
				const dataTable = hotTableComponentRef.value.hotInstance.getSourceData();
				const idItem = newData.find((item) => item.id === dataTable[index].id)?.id;
				console.log({
					idItem,
					dataTable,
					dataTableIndex: dataTable[index],
				});

				data.value[index][name] = value;
				// isLoadingUpdateValue.value = true;
				const selectNames = ["reportRequestCategory", "area", "client"];
				const elem = changedParams.value.find((item) => item.idItem == idItem);
				if (selectNames.includes(name)) {
					// If the value is from a dropdown list
					const column = hotSettings.columns.find((c) => c.id === name);
					const valueExists = column.source.includes(value);
					if (!valueExists) {
						// data.value[index][name] = "";
						hotTableLoadData("", idItem, name);
						return;
					}
					const selectMap = {
						reportRequestCategory: dataSelectCategories.value,
						area: dataSelectAreas.value,
						client: dataSelectClients.value,
					};
					const selectData = selectMap[name];
					const selectedOption = selectData.find((item) => item.name === value);
					// console.log(elem);
					if (selectedOption) {
						if (name == "client") {
							if (elem) {
								console.log(elem, "client");
								elem[`${name}Id`] = selectedOption.id;
							} else {
								changedParams.value.push({ idItem, [`${name}Id`]: selectedOption.id });
							}
						} else {
							if (elem) {
								console.log(elem, "no client");
								elem[`${name}Id`] = selectedOption.intra_id;
							} else {
								changedParams.value.push({ idItem, [`${name}Id`]: selectedOption.intra_id });
							}
						}
					}
				} else {
					// If the value is not from a dropdown list
					if (elem) {
						elem[name] = value;
					} else {
						changedParams.value.push({ idItem, [name]: value });
					}
				}
			}
		} catch (e) {
			console.error(e);
			toastStore.show("Ошибка!", e?.message, "error", 10000);
		}
	},
	afterGetColHeader: (col, TH) => {
		removeFilters([4, 16, 17])(col, TH);
		const idColumn = hotTableComponentRef.value.hotInstance.getCellMeta(0, col)?.id;
		const filterKey = filterColumns[idColumn];
		if (filterKey) {
			const stdBtn = TH.querySelector(".changeType");
			if (!stdBtn) return;
			stdBtn.onclick = async (e) => {
				e.stopPropagation();
				mapFilters[filterKey].activator.value = null;
				await nextTick();
				mapFilters[filterKey].activator.value = stdBtn;
				mapFilters[filterKey].refElement.value.openFilterMenu();
			};
		}
	},
	columns: [
		{
			id: "isApproved",
			type: "text",
			data: "isApproved",
			width: 100,
			title: "Утверждён",
			renderer: (instance, td, row, col, prop, value) => {
				deleteTippy(td);

				if (value === null || value === "") {
					td.innerHTML = "";
				}
				if (value === 1) {
					td.innerHTML = "Утверждён";
				}
				if (value === 0) {
					td.innerHTML = "Не утверждён";
				}
				return td;
			},
		},
		{
			type: "text",
			data: "comment",
			title: "Комментарий",
			editor: "textareaEditor",
			readOnly: true,
		},
		{
			id: "user",
			type: "text",
			data: "user",
			width: 120,
			title: "Подрядчики",
			renderer: (instance, td, row, col, prop, value) => {
				deleteTippy(td);

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const errorsData = ["executor_not_found", "executor_not_specified", "multiple_executors_specified"];
				// Обработка ошибок
				searchErrors({ errorsData, rowData, td, tippy });

				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "usp",
			type: "text",
			data: "usp",
			width: 140,
			title: "Сотрудник УСП",
			renderer: (instance, td, row, col, prop, value) => {
				deleteTippy(td);

				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "orderCode",
			type: "text",
			data: "orderCode",
			title: "Номер",
			width: 70,
			value: 2,
			renderer: (instance, td, row, col, prop, value) => {
				deleteTippy(td);

				td.innerHTML = value;
				return td;
			},
		},
		// {
		// 	type: "text",
		// 	data: "status",
		// 	title: "Статус",
		// 	renderer: (instance, td, row, col, prop, value) => {
		// 		deleteTippy(td);

		// 		td.innerHTML = value;
		// 		return td;
		// 	},
		// },
		{
			id: "client",
			type: "dropdown",
			data: "client",
			width: 80,
			title: "Клиент",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				deleteTippy(td);

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const errorsData = ["legal_entity_not_found"];
				// Обработка ошибок
				searchErrors({ errorsData, rowData, td, tippy, cellProperties });

				td.innerHTML = value;
				return td;
			},
		},
		// {
		// 	type: "text",
		// 	data: "name",
		// 	title: "Наименование</br>заявки",
		// 	renderer: (instance, td, row, col, prop, value) => {
		// 		deleteTippy(td);

		// 		td.innerHTML = value;
		// 		return td;
		// 	},
		// },
		{
			id: "href",
			type: "text",
			data: "href",
			title: "Ссылка",
			width: 100,
			renderer: (instance, td, row, col, prop, value) => {
				deleteTippy(td);
				td.className = "htMiddle";

				td.innerHTML = "";
				const div = document.createElement("div");
				div.className = "d-flex align-center justify-center";

				const a = document.createElement("a");
				a.href = value;
				a.className = "text-white text-decoration-none";
				a.target = "_blank";
				a.textContent = "Перейти";

				const button = document.createElement("button");
				button.className = "table_primary_button";

				button.appendChild(a);
				div.appendChild(button);
				td.appendChild(div);
				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
		{
			id: "area",
			type: "dropdown",
			data: "area",
			width: 120,
			title: "Регион",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				deleteTippy(td);

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const errorsData = ["region_not_found"];
				// Обработка ошибок
				searchErrors({ errorsData, rowData, td, tippy, cellProperties });

				td.innerHTML = value;
				return td;
			},
		},
		{
			type: "text",
			data: "address",
			width: 140,
			title: "Адрес",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				deleteTippy(td);
				cellProperties.readOnly = false;

				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "reportRequestCategory",
			title: "Категория</br>заявки",
			type: "dropdown",
			width: 100,
			strict: false,
			data: "reportRequestCategory",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				deleteTippy(td);

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const errorsData = ["category_not_specified", "invalid_amount", "missing_amount"];
				// Обработка ошибок
				searchErrors({ errorsData, rowData, td, tippy, cellProperties });

				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "plannedCompletionDate",
			type: "text",
			data: "plannedCompletionDate",
			dateFormat: "DD/MM/YYYY",
			width: 100,
			title: "Срок</br>факт",
			renderer: (instance, td, row, col, prop, value) => {
				deleteTippy(td);

				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "actualCompletionDate",
			type: "text",
			data: "actualCompletionDate",
			dateFormat: "DD/MM/YYYY",
			width: 100,
			title: "Срок</br>план",
			renderer: (instance, td, row, col, prop, value) => {
				deleteTippy(td);

				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "agreedAmount",
			type: "text",
			data: "agreedAmount",
			editor: "onlyDigitsEditor",
			width: 80,
			title: "Сумма</br>по заявке",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				deleteTippy(td);

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const errorsData = ["invalid_amount", "missing_amount", "incorrect_amount"];
				// Обработка ошибок
				searchErrors({ errorsData, rowData, td, tippy, cellProperties });

				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "penaltyAmount",
			type: "text",
			data: "penaltyAmount",
			editor: "onlyDigitsEditor",
			width: 80,
			title: "Сумма</br>штрафа",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				deleteTippy(td);

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const errorsData = ["invalid_amount", "missing_amount", "incorrect_amount"];
				// Обработка ошибок
				searchErrors({ errorsData, rowData, td, tippy, cellProperties });

				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "finalAmount",
			type: "text",
			data: "finalAmount",
			editor: "onlyDigitsEditor",
			width: 80,
			title: "Сумма</br>итого",
			readOnly: true,
			renderer: (instance, td, row, col, prop, value) => {
				deleteTippy(td);

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const errorsData = ["incorrect_amount"];
				// Обработка ошибок
				searchErrors({ errorsData, rowData, td, tippy });
				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "penaltyReason",
			type: "text",
			data: "penaltyReason",
			width: 80,
			title: "Причина</br>штрафа",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				deleteTippy(td);

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const errorsData = ["penalty_without_reason"];
				// Обработка ошибок
				searchErrors({ errorsData, rowData, td, tippy, cellProperties });

				td.innerHTML = value;
				return td;
			},
		},
		{
			type: "text",
			width: 75,
			title: "Сохранить",
			columnSorting: {
				headerAction: false,
			},
			renderer: (instance, td, row) => {
				td.innerHTML = "";

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				td.className = "htMiddle";

				const div = document.createElement("div");
				div.className = "d-flex align-center justify-center";

				const button = document.createElement("button");
				button.className = "table_primary_button bg-green";
				button.innerHTML = `<i class="mdi mdi-check-circle"></i>`;

				const updateButtonUI = (elem) => {
					button.innerHTML = elem.isLoadingUpdateValue
						? `<span class="mdi mdi-loading mdi-spin"></span>`
						: `<i class="mdi mdi-check-circle"></i>`;
				};
				// button.disabled = rowData?.errors?.find((item) => item.name !== "executor_not_found") ? false : true;
				button.disabled = !(rowData.isApproved === 0 || rowData.errors?.length > 0);

				updateButtonUI(rowData); // отрисовать текущий статус
				button.addEventListener("click", async () => {
					try {
						if (rowData.isLoadingUpdateValue) return;

						const idItem = rowData.id;
						const ind = data.value.findIndex((item) => item.id === idItem);

						// показать лоадер на кнопке
						data.value[ind].isLoadingUpdateValue = true;
						updateButtonUI(data.value[ind]);

						console.log(changedParams.value);

						// получаем существующие параметры и дополняем их нужными полями
						const params = {
							...(changedParams.value.find((item) => item.idItem === idItem) || {}),
							agreedAmount: rowData.agreedAmount,
							penaltyAmount: rowData.penaltyAmount,
							penaltyReason: rowData.penaltyReason,
							comment: rowData.comment,
						};

						const response = await api.put(`/report-requests/${idItem}`, params);
						const newItem = response.data.reportRequestItem;

						// удаляем отправленные параметры из changedParams
						const indexParams = changedParams.value.findIndex((item) => item.idItem === idItem);
						if (indexParams !== -1) {
							changedParams.value.splice(indexParams, 1);
						}

						console.log({ idItem, newItem });

						// обновляем данные таблицы
						hotTableLoadData(newItem, newItem.id);

						data.value[ind].isLoadingUpdateValue = false;
						updateButtonUI(data.value[ind]);
					} catch (e) {
						toastStore.show("Ошибка!", e.message, "error", 10000);
						console.error(e);
					}
				});

				div.appendChild(button);
				td.appendChild(div);
				return td;
			},
		},
		{
			type: "text",
			width: 75,
			title: "Удалить",
			columnSorting: {
				headerAction: false,
			},
			renderer: (instance, td, row) => {
				td.innerHTML = "";

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				td.className = "htMiddle";

				const div = document.createElement("div");
				div.className = "d-flex align-center justify-center";

				const button = document.createElement("button");
				button.className = "table_primary_button bg-red";
				button.innerHTML = `<i class="mdi mdi-close"></i>`;

				button.disabled = rowData.isApproved === 1;

				const updateButtonUI = (elem) => {
					button.innerHTML = elem.isLoadingDeletingValue
						? `<span class="mdi mdi-loading mdi-spin"></span>`
						: `<i class="mdi mdi-close"></i>`;
				};

				updateButtonUI(rowData);
				button.addEventListener("click", async () => {
					try {
						if (rowData.isLoadingDeletingValue) return;
						const idItem = rowData.id;

						const ind = data.value.findIndex((item) => item.id === idItem);

						data.value[ind].isLoadingDeletingValue = true;
						console.log(data.value[ind]);
						updateButtonUI(data.value[ind]);

						const idRequest = router.currentRoute.value.params.id;
						const response = await api.delete(
							`/report-requests/${idRequest}/report-request-items/${idItem}`,
						);
						console.log(response.data);

						const index = data.value.findIndex((item) => item.id === idItem);
						if (index !== -1) {
							data.value.splice(index, 1); // реактивное удаление
						}
						hotTableLoadData();

						data.value[ind].isLoadingDeletingValue = false;
						updateButtonUI(data.value[ind]);

						toastStore.show("Успех!", response.data.message, "success", 10000);
					} catch (e) {
						toastStore.show("Ошибка!", e.message, "error", 10000);
						console.error(e);
					}
				});

				div.appendChild(button);
				td.appendChild(div);
				return td;
			},
		},
	],
	cells: function (row, col) {
		const cellProperties = {};

		const colProp = this.instance.colToProp(col);
		const rowData = this.instance.getSourceDataAtRow(row);

		const editableColumns = ["agreedAmount", "penaltyAmount", "penaltyReason"];

		if (editableColumns.includes(colProp)) {
			cellProperties.readOnly = !(rowData && rowData.isApproved === 0);
		}

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

		const savedOrder = JSON.parse(localStorage.getItem("columnsOrderRequestsPeriod"));

		// Если порядок совпадает с сохранённым — это инициализация, не сохраняем
		if (isSameOrder(Array.from(currentOrder), savedOrder)) return;
		// console.log({ currentOrder: Array.from(currentOrder), savedOrder });

		setColumnsOrder("RequestsPeriod", hot);
		setColumnsWidth("RequestsPeriod", hot);
		// console.log("afterColumnMove");
	},
	// Сохранение размеров после перемещения
	manualColumnResize: true,
	afterColumnResize: (newSize, column, isDoubleClick) => {
		if (newSize) {
			setColumnsOrder("RequestsPeriod", hotTableComponentRef.value.hotInstance);
			setColumnsWidth("RequestsPeriod", hotTableComponentRef.value.hotInstance);
			// console.log("afterColumnResize");
		}
	},
	viewportRowRenderingOffset: "auto",
	renderAllRows: false,
	filters: true,
	dropdownMenu: ["filter_by_condition", "filter_by_value", "filter_action_bar"],
	columnSorting: true,
	width: "100%",
	height: "89vh",
	stretchH: "all",
	readOnly: true,
	preventOverflow: "horizontal",
	licenseKey: "non-commercial-and-evaluation",
};
const getDataSelect = async () => {
	try {
		const response = await api.get("/report-requests/search/search-columns");
		dataSelectAreas.value = response.data.areas;
		dataSelectClients.value = response.data.clients;
		dataSelectCategories.value = response.data.categories;

		const columns = hotTableComponentRef?.value?.hotInstance?.getSettings().columns;

		if (!columns) return;
		columns.forEach((col) => {
			switch (col.id) {
				case "area":
					col.source = dataSelectAreas.value.map((area) => area.name);
					break;
				case "client":
					col.source = dataSelectClients.value.map((client) => client.name);
					break;
				case "reportRequestCategory":
					col.source = dataSelectCategories.value.map((category) => category.name);
					break;
			}
		});
		hotTableComponentRef.value.hotInstance.updateSettings({
			columns,
		});
	} catch (e) {
		console.error(e);
	}
};
const getData = async () => {
	try {
		const id = route.params.id;
		const responseData = await api.get(`/report-requests/${id}/report-request-items`);

		data.value = responseData.data.reportRequestItems.flat().map((item) => {
			item.isLoadingUpdateValue = false;
			item.isLoadingDeletingValue = false;
			return item;
		});

		// data.value[0].errors = [];
		// data.value[3].errors.push({ name: "incorrect_amount", slug: "qweqweq" });
		// for (let i = 0; i < 150; i++) {
		// 	data.value.push({ name: "", amount: "", finalAmount: "", penaltyReason: "", comment: "" });

		totalItems.value = data.value.length;
		loading.value = false;
		await nextTick();

		const hot = hotTableComponentRef?.value?.hotInstance;
		if (hot) {
			hot.loadData(data.value.slice((pager.value - 1) * itemsOnPage.value, pager.value * itemsOnPage.value));

			loadColumnsData("RequestsPeriod", hot);
		}
		await getDataSelect();
	} catch (e) {
		console.error(e);
	}
};
onMounted(async () => {
	await getData();

	loadFiltersFromURL();

	await nextTick();

	if (hotTableComponentRef?.value?.hotInstance) {
		const newData = filteredData();

		totalItems.value = newData.length;
		hotTableComponentRef.value.hotInstance.loadData(
			newData.slice((pager.value - 1) * itemsOnPage.value, pager.value * itemsOnPage.value),
		);
	}
});
</script>
