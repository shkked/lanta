<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<v-tabs v-model="tabValue" bg-color="grey-lighten-3" align-tabs="start">
			<v-tab value="incident" class="text-primary">Инцидентные заявки</v-tab>
			<v-tab value="paged" class="text-primary">Покопийные заявки</v-tab>
			<v-tab value="subscriber" class="text-primary">Абонентские заявки</v-tab>
		</v-tabs>

		<!-- Кастомные фильтры -->
		<div v-for="(filter, key) in mapFiltersForTemplate" :key="key" class="d-none">
			<customFilter
				:ref="(el) => (currentFilters.mapFilters[key].refElement.value = el)"
				:model-value="filter.selected"
				:items="filter.options"
				:activator="filter.activator"
				@update:model-value="filter.updateSelected"
				@clear="fetchFilters({ value: $event, key })"
				@apply="fetchFilters({ value: $event, key })"
			/>
		</div>

		<!-- {{ [currentFilters.mapFilters.isApproved] }} -->
		<div v-if="!loading && actualDataTable.length" class="d-flex w-100 ga-5">
			<div class="d-flex w-50 align-center">
				<v-select
					id="columns"
					v-model="currentFilters.selectedColumn.value"
					:items="
						hotSettings.columns
							.filter((col) => col.id === 'orderCode')
							.map((col) => ({
								title: col.title?.replace(/<[^>]*>/g, ' '),
								value: col.id,
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
				v-model="currentFilters.filterValue.value"
				type="text"
				variant="outlined"
				color="primary"
				density="compact"
				label="Введите значение"
				hide-details
				class="w-50"
			/>
		</div>
		<div class="w-100 d-flex align-center justify-end">
			<v-btn
				v-if="!loading && actualDataTable.length"
				:disabled="!isQueryParamsNonEmpty"
				color="primary"
				prepend-icon="mdi mdi-trash-can"
				variant="flat"
				@click="resetFilters"
			>
				Сбросить фильтры
			</v-btn>
		</div>
		<v-window v-model="tabValue">
			<v-window-item value="incident">
				<div class="w-100">
					<v-skeleton-loader v-if="loading" class="border" type="table"></v-skeleton-loader>
					<h3 v-if="!loading && !actualDataTable.length" class="text-h6 no-data">Нет инцидентных заявок</h3>
					<hot-table
						v-if="!loading && actualDataTable.length"
						ref="hotTableComponentRefIncident"
						:settings="hotSettings"
						:language="language"
					/>
				</div>
			</v-window-item>
			<v-window-item value="paged">
				<div class="w-100">
					<v-skeleton-loader v-if="loading" class="border" type="table"></v-skeleton-loader>
					<h3 v-if="!loading && !actualDataTable.length" class="text-h6 no-data">Нет покопийных заявок</h3>
					<hot-table
						v-if="!loading && actualDataTable.length"
						ref="hotTableComponentRefPaged"
						:settings="hotSettings"
						:language="language"
					/>
				</div>
			</v-window-item>
			<v-window-item value="subscriber">
				<div class="w-100">
					<v-skeleton-loader v-if="loading" class="border" type="table"></v-skeleton-loader>
					<h3 v-if="!loading && !actualDataTable.length" class="text-h6 no-data">Нет абонентских заявок</h3>
					<hot-table
						v-if="!loading && actualDataTable.length"
						ref="hotTableComponentRefSubscriber"
						:settings="hotSettings"
						:language="language"
					/>
				</div>
			</v-window-item>
		</v-window>
	</v-container>
</template>
<script setup>
import { api } from "@/axios/index.js";
import customFilter from "@/components/customFilter.vue";
import {
	deleteTippy,
	isSameOrder,
	loadColumnsData,
	removeFilters,
	searchErrors,
	setColumnsOrder,
	setColumnsWidth,
} from "@/helpers";
import { useRequestsPeriodStore } from "@/stores/sp/requests_period.store.js";
import { HotTable } from "@handsontable/vue3";
import { storeToRefs } from "pinia";
import { nextTick, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { tippy } from "vue-tippy";

const route = useRoute();
const requestsPeriodStore = useRequestsPeriodStore();
const {
	filteredData,
	resetFilters,
	fetchFilters,
	getApplicationsTable,
	updateURLFilters,
	loadFiltersFromURL,
	changeRequestStatus,
	hotTableLoadData,
	language,
	filterColumns,
} = requestsPeriodStore;

const {
	isQueryParamsNonEmpty,
	hotTableComponentRefIncident,
	hotTableComponentRefPaged,
	hotTableComponentRefSubscriber,
	tabValue,
	loading,
	actualDataTable,
	actualHotTable,
	currentFilters,
	mapFiltersForTemplate,
} = storeToRefs(requestsPeriodStore);

// Загрузка актуальных данных при перемещении по табам
watch(
	() => tabValue.value,
	async () => {
		await nextTick();
		currentFilters.value.filterValue.value = "";
		const hot = actualHotTable?.value?.hotInstance;
		if (hot) {
			updateURLFilters();

			loadColumnsData("RequestsPeriod", hot);
			hot.loadData(actualDataTable.value);
		}
	},
);
// Фильтрация после каждого изменения URL
watch(
	() => route.query,
	() => {
		loadFiltersFromURL();
		fetchFilters();
	},
	{
		deep: true,
	},
);

// Решение проблемы с v-show, когда в таблице не отображаются данные, хотя они загружены
watch(
	() => !loading.value,
	(visible) => {
		if (visible) {
			nextTick(() => {
				actualHotTable.value?.hotInstance?.render();
			});
		}
	},
);
// Фильтрация по поиску
watch(
	[() => currentFilters.value.selectedColumn.value, () => currentFilters.value.filterValue.value],
	([newSelectedColumn, newFilterValue]) => {
		const handsontableInstance = actualHotTable?.value?.hotInstance;
		if (!handsontableInstance) return;

		const actualData = hotTableLoadData();
		const newData = actualData.filter((row) => {
			const text = String(row.orderCode ?? "").toLowerCase();
			const query = String(newFilterValue ?? "").toLowerCase();
			return text.includes(query);
		});

		handsontableInstance.loadData(newData);
		handsontableInstance.render();
	},
);
const hotSettings = {
	data: actualDataTable.value,
	rowHeights: 40,
	afterSelection: () => {
		document.querySelectorAll('[aria-hidden="true"]').forEach((element) => {
			element.removeAttribute("aria-hidden");
		});
	},
	afterGetColHeader: (col, TH) => {
		removeFilters([0, 4, 16, 17])(col, TH);

		const hotTable = actualHotTable.value;
		const hotInstance = hotTable && hotTable.hotInstance;

		if (!hotInstance) return;
		const idColumn = hotInstance.getCellMeta(0, col)?.id;
		const filterKey = filterColumns[idColumn];
		if (filterKey) {
			const stdBtn = TH.querySelector(".changeType");
			if (!stdBtn) return;
			stdBtn.onclick = async (e) => {
				e.stopPropagation();
				currentFilters.value.mapFilters[filterKey].activator.value = null;
				await nextTick();
				currentFilters.value.mapFilters[filterKey].activator.value = stdBtn;
				currentFilters.value.mapFilters[filterKey].refElement.value.openFilterMenu();
			};
		}
	},
	columns: [
		{
			editor: false,
			readOnly: true,
			width: 70,
			minWidth: 60,
			columnSorting: {
				headerAction: false,
			},
			renderer: (instance, td, row) => {
				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData || !rowData.id) return td;

				td.innerHTML = "";
				td.className = "htMiddle";

				const id = rowData.id;

				const buttonSuccess = document.createElement("button");
				buttonSuccess.className = "table_success_button mr-2";
				buttonSuccess.type = "button";
				buttonSuccess.addEventListener("click", () => {
					changeRequestStatus(id, 1);
					instance.setDataAtCell(row, instance.propToCol("isApproved"), 1);
				});

				const buttonError = document.createElement("button");
				buttonError.className = "table_error_button";
				buttonError.type = "button";
				buttonError.addEventListener("click", () => {
					if (rowData.comment) {
						changeRequestStatus(id, 0);
						instance.setDataAtCell(row, instance.propToCol("isApproved"), 0);
					} else {
						tippy(buttonError, {
							content: "Необходимо заполнить комментарий",
							theme: "error",
							placement: "top",
							trigger: "manual",
						}).show();

						setTimeout(() => {
							buttonError._tippy?.destroy();
						}, 3000);
					}
				});

				td.appendChild(buttonSuccess);
				td.appendChild(buttonError);

				return td;
			},
		},
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
			editor: "text",
			width: 150,
			readOnly: false,
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);

				if (Number(rowData.isApproved) === 1) {
					td.innerHTML = value || "";
					cellProperties.readOnly = true;
				} else {
					td.innerHTML = value || "";
					cellProperties.readOnly = false;
				}

				td.innerText = value ?? "";
				td.style.whiteSpace = "pre-wrap";
				td.style.wordBreak = "break-word";

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
			width: 70,
			title: "Номер<br/>заявки",
			value: 2,
			renderer: (instance, td, row, col, prop, value) => {
				deleteTippy(td);

				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "client",
			type: "text",
			data: "client",
			width: 120,
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
		{
			id: "href",
			type: "text",
			data: "href",
			title: "Ссылка",
			width: 75,
			renderer: (instance, td, row, col, prop, value) => {
				deleteTippy(td);

				td.innerHTML = `<a target="_blank" href=${value}>Перейти</a>`;
				td.className = "htMiddle";
				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
		{
			id: "area",
			type: "text",
			data: "area",
			width: 160,
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
			title: "Адрес",
			width: 160,
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
			strict: false,
			source: ["Покопийщик - инцидент", "Покопийщик - нерегламент", "Покопийщик", "Инцидент"],
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
			width: 120,
			title: "Срок факт",
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
			width: 120,
			title: "Срок план",
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

				const errorsData = ["invalid_amount", "missing_amount"];
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

				const errorsData = ["invalid_amount", "missing_amount"];
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
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				deleteTippy(td);

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const errorsData = ["incorrect_amount"];
				// Обработка ошибок
				searchErrors({ errorsData, rowData, td, tippy, cellProperties });

				td.innerHTML = value;
				return td;
			},
		},
		{
			id: "penaltyReason",
			type: "text",
			data: "penaltyReason",
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
	],
	// Сохранение порядка после перемещения
	manualColumnMove: true, // Устанавливаем порядок колонок
	afterColumnMove: (movedColumns, finalIndex, dropIndex, movePossible, orderChanged) => {
		if (!orderChanged) return;

		const hot = actualHotTable.value.hotInstance;
		const currentOrder = hot
			.getPlugin("manualColumnMove")
			.hot.columnIndexMapper.fromPhysicalToVisualIndexesCache.keys();

		const savedOrder = JSON.parse(localStorage.getItem("columnsOrderRequestsPeriod"));

		// Если порядок совпадает с сохранённым — это инициализация, не сохраняем
		if (isSameOrder(Array.from(currentOrder), savedOrder)) return;

		setColumnsOrder("RequestsPeriod", hot);
		setColumnsWidth("RequestsPeriod", hot);
		// console.log("afterColumnMove");
	},
	// Сохранение размеров после перемещения
	manualColumnResize: true,
	afterColumnResize: (newSize, column, isDoubleClick) => {
		if (newSize) {
			setColumnsOrder("RequestsPeriod", actualHotTable.value.hotInstance);
			setColumnsWidth("RequestsPeriod", actualHotTable.value.hotInstance);
			console.log("afterColumnResize");
		}
	},
	afterChange: async (changes, source) => {
		if (source !== "edit") return;

		for (const [row, prop, oldValue, newValue] of changes) {
			if (prop === "comment" && oldValue !== newValue) {
				const hot = actualHotTable.value.hotInstance;
				const rowData = hot.getSourceDataAtRow(row);
				const id = rowData.id;

				try {
					await api.put(`/report-requests/${id}`, { comment: newValue });
				} catch (error) {
					console.error("Ошибка при сохранении комментария", error);
				}
			}
		}
	},
	filters: true,
	readOnly: true,
	dropdownMenu: ["filter_by_condition", "filter_by_value", "filter_action_bar"],
	columnSorting: true,
	width: "100%",
	height: "89vh",
	stretchH: "all",
	licenseKey: "non-commercial-and-evaluation",
};

onMounted(async () => {
	await getApplicationsTable();

	loadFiltersFromURL();

	await nextTick();

	setTimeout(() => {
		if (actualHotTable?.value?.hotInstance) {
			const newData = filteredData();
			actualHotTable.value.hotInstance.loadData(newData);
		}
	}, 0);
});
</script>
