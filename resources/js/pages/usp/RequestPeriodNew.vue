<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<div v-if="!request_store.loading" class="d-flex w-100 ga-5">
			<div class="d-flex w-50 align-center">
				<v-select
					id="columns"
					v-model="request_store.selectedColumn"
					:items="request_store.filterableColumns"
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
				v-model="request_store.filterValue"
				type="text"
				variant="outlined"
				color="primary"
				density="compact"
				label="Введите значение"
				hide-details
				class="w-50"
			/>
		</div>
		<CustomFilter
			v-for="key in Object.keys(request_store.columnFilters)"
			:key="key"
			:ref="(el) => setFilterRef(el, key)"
			:items="request_store.dataSelects[key] || []"
			:model-value="request_store.columnFilters[key]"
			:activator="filterActivator[key] || null"
			@apply="(values) => request_store.setColumnFilter(key, values)"
			@clear="() => request_store.setColumnFilter(key, [])"
		/>
		<div class="w-100">
			<div class="d-flex justify-end mb-5">
				<v-btn
					color="primary"
					prepend-icon="mdi mdi-trash-can"
					variant="flat"
					@click="request_store.clearAllColumnFilters()"
				>
					Сбросить фильтры
				</v-btn>
			</div>
			<hot-table v-if="!request_store.loading" ref="hotTableComponentRef" :settings="hotSettings"></hot-table>
			<v-skeleton-loader v-if="request_store.loading" class="border" type="table"></v-skeleton-loader>
			<h3 v-if="!request_store.loading && !request_store.filteredRequests.length" class="text-h6 no-data">
				Нет заявок
			</h3>
			<v-pagination
				v-if="!request_store.loading && request_store.totalItems"
				v-model="page"
				:total-visible="5"
				:length="Math.ceil(request_store.totalItems / itemsPerPage)"
				color="primary"
				class="mt-5"
			/>
		</div>
	</v-container>
</template>
<script setup>
import { api } from "@/axios/index.js";
import CustomFilter from "@/components/customFilter.vue";
import {
	deleteTippy,
	loadColumnsData,
	removeFilters,
	searchErrors,
	setColumnsOrder,
	setColumnsWidth,
} from "@/helpers/index.js";
import { useRequestStore } from "@/stores/request_period.store.js";
import { HotTable } from "@handsontable/vue3";
import { nextTick, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute } from "vue-router";
import { tippy } from "vue-tippy";

const route = useRoute();
const request_store = useRequestStore();
const page = ref(1);
const itemsPerPage = 20;
const tableData = ref([]);
const filterRefs = ref({});
const filterActivator = reactive({});

const hotTableComponentRef = ref(null);
const setFilterRef = (el, col) => {
	if (el) filterRefs.value[col] = el;
};

const updateTableData = () => {
	const start = (page.value - 1) * itemsPerPage;
	tableData.value = request_store.filteredRequests.slice(start, start + itemsPerPage);

	if (hotTableComponentRef.value?.hotInstance) {
		hotTableComponentRef.value.hotInstance.loadData(tableData.value);
	}
};

const hotSettings = {
	rowHeights: 40,
	data: tableData.value,
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
					td.innerHTML = "Отклонён";
				}
				return td;
			},
		},
		{
			type: "text",
			data: "comment",
			title: "Комментарий",
			editor: "textareaEditor",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);

				if (rowData.isApproved === 1) {
					td.innerHTML = value || "";
					cellProperties.readOnly = false;
				} else {
					td.innerHTML = value || "";
					cellProperties.readOnly = true;
				}

				return td;
			},
		},
		{
			id: "user",
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
		{
			id: "client",
			data: "client",
			width: 80,
			title: "Клиент",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				deleteTippy(td);

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const errorsData = ["legal_entity_not_found"];

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
			data: "area",
			type: "dropdown",
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
			data: "reportRequestCategory",
			title: "Категория</br>заявки",
			type: "text",
			width: 100,
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
	manualColumnMove: true,
	manualColumnResize: true,
	licenseKey: "non-commercial-and-evaluation",
	afterGetColHeader: (col, TH) => {
		removeFilters([6, 16, 17])(col, TH);

		const hot = hotTableComponentRef.value.hotInstance;
		const columnId = hot.getCellMeta(0, col)?.id;
		if (!columnId) return;

		const filterKey = columnId;
		if (!(filterKey in request_store.columnFilters)) return;

		const stdBtn = TH.querySelector(".changeType");
		if (!stdBtn) return;

		stdBtn.onclick = async (e) => {
			e.stopPropagation();
			await nextTick();
			filterActivator[filterKey] = stdBtn;
			await nextTick();

			const filterComponent = filterRefs.value[filterKey];
			if (!filterComponent || !stdBtn.isConnected) return;

			setTimeout(() => {
				filterComponent.openFilterMenu?.();
			}, 0);
		};
	},
	afterColumnMove: (movedColumns, finalIndex, dropIndex, movePossible, orderChanged) => {
		if (orderChanged) {
			const hot = hotTableComponentRef.value.hotInstance;
			setColumnsOrder("RequestsPeriod", hot);
		}
	},
	afterColumnResize: (newSize, column, isDoubleClick) => {
		if (newSize) {
			const hot = hotTableComponentRef.value.hotInstance;
			setColumnsWidth("RequestsPeriod", hot);
		}
	},
};

watchEffect(() => {
	updateTableData();
});

onMounted(async () => {
	await request_store.loadRequests(route.params.id);
	const hot = hotTableComponentRef.value.hotInstance;
	loadColumnsData("RequestsPeriod", hot);
	await nextTick();
	updateTableData();
});
</script>
