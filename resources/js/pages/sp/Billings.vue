<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<h3 class="text-h6 w-100">Загрузка биллинга по клиенту</h3>
		<div class="d-flex flex-column w-100 ga-5 border-sm rounded pa-5">
			<p>Текущий отчётный месяц: {{ thisMonth }}</p>
			<v-form
				v-model="valid"
				name="billingForm"
				class="d-flex w-100 align-content-start flex-nowrap ga-5 form-excel"
				@submit.prevent="submit"
			>
				<div class="w-25">
					<v-skeleton-loader v-if="loading" class="custom-loader__input" type="text"></v-skeleton-loader>
					<v-select
						v-else
						v-model="clientId"
						name="clientId"
						variant="outlined"
						:items="dataClients.map((client) => client.name)"
						:rules="rules"
						label="Выберите клиента"
						density="compact"
						class="w-100"
						color="primary"
					>
						<template #no-data>
							<v-list-item>
								<v-list-item-title>Нет данных</v-list-item-title>
							</v-list-item>
						</template>
					</v-select>
				</div>

				<div class="w-25">
					<v-skeleton-loader v-if="loading" class="custom-loader__input" type="text"></v-skeleton-loader>
					<v-select
						v-else
						v-model="areaId"
						name="areaId"
						variant="outlined"
						:items="dataAreas.map((client) => client.name)"
						:rules="rules"
						label="Выберите регион"
						density="compact"
						class="w-100"
						color="primary"
					>
						<template #no-data>
							<v-list-item>
								<v-list-item-title>Нет данных</v-list-item-title>
							</v-list-item>
						</template>
					</v-select>
				</div>

				<div class="w-25 flex-shrink-0">
					<v-file-input
						v-model="formData.excel"
						name="excel"
						accept=".xlsx"
						:rules="rules"
						label="Выберите Excel файл"
						variant="outlined"
						class="w-100"
						density="compact"
						color="primary"
					></v-file-input>
				</div>
				<div class="w-15 d-flex justify-end">
					<v-btn
						:disabled="!valid"
						type="submit"
						color="primary"
						variant="flat"
						prepend-icon="mdi mdi-send-check-outline"
						style="height: 40px"
						>Отправить</v-btn
					>
				</div>
			</v-form>
			<div class="d-flex w-100 ga-5">
				<v-btn
					variant="outlined"
					prepend-icon="mdi mdi-tray-arrow-down"
					color="primary"
					@click="downloadTemplate"
				>
					Скачать шаблон файла
				</v-btn>
				<v-btn
					variant="outlined"
					prepend-icon="mdi mdi-tray-arrow-down"
					color="primary"
					@click="downloadManual"
				>
					Скачать инструкцию
				</v-btn>
			</div>
		</div>
		<!-- Кастомный фильтр по периоду -->
		<customFilter
			ref="dateFilter"
			v-model="selectedDateFilter"
			:items="customDates"
			:activator="filterActivatorEl"
			@clear="fetchFilters('date', $event)"
			@apply="fetchFilters('date', $event)"
		/>
		<!-- Кастомный фильтр по клиентам -->
		<customFilter
			ref="clientFilter"
			v-model="selectedClientFilter"
			:items="customClients.map((item) => item.name)"
			:activator="filterActivatorEl"
			@clear="fetchFilters('client', $event)"
			@apply="fetchFilters('client', $event)"
		/>

		<!-- Кастомный фильтр по региону -->
		<customFilter
			ref="areaFilter"
			v-model="selectedAreaFilter"
			:items="customAreas.map((item) => item.name)"
			:activator="filterActivatorEl"
			@clear="fetchFilters('area', $event)"
			@apply="fetchFilters('area', $event)"
		/>

		<!-- Кастомный фильтр по статусу -->
		<customFilter
			ref="statusFilter"
			v-model="selectedStatusFilter"
			:items="customStatuses.map((item) => item.slug)"
			:activator="filterActivatorEl"
			@clear="fetchFilters('status', $event)"
			@apply="fetchFilters('status', $event)"
		/>

		<div class="w-100 mt-5">
			<div class="d-flex align-center justify-space-between mb-4">
				<h3 class="text-h6 mb-5">Последние загруженные биллинги</h3>
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
			<div></div>
			<v-skeleton-loader v-if="loading" class="border" type="table"></v-skeleton-loader>
			<h3 v-if="!loading && !data.length" class="text-h6 no-data">Нет биллингов</h3>
			<hot-table v-if="!loading && data.length" ref="billingTable" :settings="hotSettings" :language="language">
			</hot-table>
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
import { api } from "@/axios";
import customFilter from "@/components/customFilter.vue";
import {
	arrayFromSet,
	filtersToQueryParams,
	isSameOrder,
	loadColumnsData,
	mapStatusToColor,
	queryParamsToFilters,
	removeFilters,
	setColumnsOrder,
	setColumnsWidth,
} from "@/helpers";
import { useCentrifugeStore } from "@/stores/centrifuge.store.js";
import { useToastStore } from "@/stores/toast.store.js";
import { HotTable } from "@handsontable/vue3";
import { debounce } from "lodash";
import { storeToRefs } from "pinia";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const loading = ref(true);
const thisMonth = new Date().toLocaleString("ru-RU", { month: "long" });
const language = "ru-RU";

const clientFilter = ref(null);
const areaFilter = ref(null);
const statusFilter = ref(null);
const dateFilter = ref(null);

const selectedClientFilter = ref([]);
const selectedAreaFilter = ref([]);
const selectedStatusFilter = ref([]);
const selectedDateFilter = ref([]);

const customClients = ref([]);
const customAreas = ref([]);
const customStatuses = ref([]);
const customDates = ref([
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
	2022,
	2023,
	2024,
	2025,
]);

const monthNames = [
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
];

const filterActivatorEl = ref(null);
const queryParams = ref({
	filter: {
		"userClient.client_id": [],
		"userClient.area_id": [],
		billing_status_id: [],
		accepted_month: [],
		accepted_year: [],
	},
});
const isQueryParamsNonEmpty = computed(() => {
	return queryParams.value?.filter && Object.values(queryParams.value.filter).some((item) => item.length);
});

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

const router = useRouter();
const route = useRoute();

const toastStore = useToastStore();
const { clearDataCentrifuge } = useCentrifugeStore();
const { getDataCentrifuge } = storeToRefs(useCentrifugeStore());

const clientId = computed({
	get() {
		const id = formData.value.clientId;
		return dataClients.value.find((item) => item.id == id)?.name;
	},
	set(value) {
		const index = dataClients.value.findIndex((item) => item.name == value);
		formData.value.clientId = dataClients.value[index].id;
	},
});

const areaId = computed({
	get() {
		const id = formData.value.areaId;
		return dataAreas.value.find((item) => item.id == id)?.name;
	},
	set(value) {
		const index = dataAreas.value.findIndex((item) => item.name == value);
		formData.value.areaId = dataAreas.value[index].id;
	},
});

const valid = ref(false);
const rules = [
	(v) => !!v || "Поле обязательно для заполнения",
	(v) => (v && v.length > 0) || "Необходимо загрузить файл",
];
const formData = ref({
	clientId: "",
	areaId: "",
	excel: [],
});

const billingTable = ref(null);
const data = ref([]);
const dataClients = ref([]);
const dataAreas = ref([]);
const dataInputs = reactive({});

const hotSettings = {
	rowHeights: 50,
	columns: [
		{
			id: "client",
			type: "text",
			data: "client",
			title: "Клиент",
			filters: false,
			renderer: (instance, td, row, col, prop, value) => {
				const link = document.createElement("a");
				link.className = "text-decoration-underline cursor-pointer";
				link.textContent = value;
				link.addEventListener("click", () => {
					router.push({
						name: "ClientBilling",
						params: { client: value },
						query: { id: data.value[row].id },
					});
				});
				td.innerHTML = "";
				td.appendChild(link);
				return td;
			},
		},
		{ id: "area", type: "text", data: "area", title: "Регион", filters: false },
		{ id: "date", type: "date", data: "date", title: "Отчётный<br/>период", dateFormat: "MM/YYYY", filters: false },
		{
			id: "status",
			type: "text",
			data: "status",
			title: "Статус",
			filters: false,
			renderer: (instance, td, row, col, prop, value) => {
				td.className = "htMiddle";
				// console.log(value);
				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				// TODO: сделать чтобы с бэка приходило словом
				const color = rowData.statusColor;
				const colorClass = mapStatusToColor(value, true, color);
				// console.log({color, colorClass});
				td.innerHTML = `<div style="color: ${color}" class="${colorClass}">${value}</div>`;
				return td;
			},
		},
		{
			type: "text",
			data: "canUpload",
			title: 'Загрузка тест. листов <br/><span class="mdi mdi-paperclip text-green-darken-3 d-flex align-center text-h6"><p class="text-grey-darken-4 text-caption">- загружены;<p/></span> <span class="mdi mdi-paperclip text-grey d-flex align-center text-h6"><p class="text-grey-darken-4 text-caption">- не загружены<p/></span>',
			renderer: (instance, td, row, col, prop, value) => {
				td.className = "htMiddle";
				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const isLoadedClass = rowData.uploadedSpecs
					? "table_input_container_loaded"
					: "table_input_container_not_loaded";
				const disabledAttr = value ? "" : "disabled";

				const formElem = document.createElement("form");
				formElem.className = isLoadedClass + " d-flex align-center justify-center";
				formElem.method = "POST";
				formElem.enctype = "multipart/form-data";
				formElem.addEventListener("submit", sendData);

				const input = document.createElement("input");
				input.name = "files";
				input.type = "file";
				input.className = "table_input_file";
				input.accept = ".pdf,.xlsx,.zip,.docx";
				input.multiple = true;
				input.disabled = disabledAttr;

				input.files = null;

				input.addEventListener("change", () => {
					dataInputs[rowData.id] = input.files;
				});
				if (dataInputs[rowData.id]) {
					input.files = dataInputs[rowData.id];
				}
				const button = document.createElement("button");
				button.className = "table_upload_button";
				button.textContent = "Загрузить";
				button.disabled = disabledAttr;
				button.type = "submit";

				formElem.appendChild(input);
				formElem.appendChild(button);
				td.innerHTML = "";
				td.appendChild(formElem);
				async function sendData(e) {
					try {
						e.preventDefault();
						const physicalRowIndex = instance.toPhysicalRow(row);
						const rowData = instance.getSourceData()[physicalRowIndex];
						if (!rowData) return td;

						const idBilling = rowData.id;
						// console.log(idBilling);
						const dataInput = Array.from(input.files);
						const response = await api.post(
							`/billings/${idBilling}/specs`,
							{ files: dataInput },
							{
								headers: { "Content-Type": "multipart/form-data" },
							},
						);
						console.log(response);
						const dataResponse = response.data;
						// TODO везде ли убирать всплывашки?
						toastStore.show("Успех!", dataResponse.message, "success", 10000);

						delete dataInputs[rowData.id];

						updateDataBilling(idBilling);
					} catch (error) {
						console.error(error);
						const dataError = error.response.data;
						toastStore.show("Ошибка!", dataError.message, "error", 10000);
					}
				}

				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
		{
			type: "text",
			data: "canApproveSp",
			title: "Согласовать",
			renderer: (instance, td, row, col, prop, value) => {
				td.className = "htMiddle";
				const disabledAttr = value ? "" : "disabled";

				const div = document.createElement("div");
				div.className = "d-flex align-center justify-center";

				const button = document.createElement("button");
				button.className = "table_primary_button";
				button.textContent = "Согласовать";
				button.disabled = disabledAttr;
				button.addEventListener("click", sendData);
				td.innerHTML = "";
				div.appendChild(button);
				td.appendChild(div);

				async function sendData() {
					try {
						const physicalRowIndex = instance.toPhysicalRow(row);
						const rowData = instance.getSourceData()[physicalRowIndex];
						if (!rowData) return td;

						const idBilling = rowData.id;
						const response = await api.post(`/billings/${idBilling}/sp-approve`);
						console.log(response);
						const dataResponse = response.data;
						toastStore.show("Успех!", dataResponse.message, "success", 10000);

						updateDataBilling(idBilling);
					} catch (error) {
						console.error(error);
						const dataError = error.response.data;
						toastStore.show("Ошибка!", dataError.message, "error", 10000);
					}
				}

				return td;
			},
			columnSorting: {
				headerAction: false,
			},
			className: "htLeft htMiddle",
		},
	],
	// Сохранение порядка после перемещения
	manualColumnMove: true, // Устанавливаем порядок колонок
	afterColumnMove: (movedColumns, finalIndex, dropIndex, movePossible, orderChanged) => {
		// console.log({ movedColumns }, finalIndex, dropIndex, movePossible, orderChanged);
		if (!orderChanged) return;

		const hot = billingTable.value.hotInstance;
		const currentOrder = hot
			.getPlugin("manualColumnMove")
			.hot.columnIndexMapper.fromPhysicalToVisualIndexesCache.keys();

		const savedOrder = JSON.parse(localStorage.getItem("columnsOrderBillings"));

		// Если порядок совпадает с сохранённым — это инициализация, не сохраняем
		if (isSameOrder(Array.from(currentOrder), savedOrder)) return;
		// console.log({ currentOrder: Array.from(currentOrder), savedOrder });

		setColumnsOrder("Billings", hot);
		setColumnsWidth("Billings", hot);
	},
	// Сохранение размеров после перемещения
	manualColumnResize: true,
	afterColumnResize: (newSize, column, isDoubleClick) => {
		if (newSize) {
			setColumnsOrder("Billings", billingTable.value.hotInstance);
			setColumnsWidth("Billings", billingTable.value.hotInstance);
		}
	},
	filters: true,
	dropdownMenu: ["filter_by_condition", "filter_by_value", "filter_action_bar"],
	columnSorting: true,
	width: "100%",
	height: "54vh",
	stretchH: "all",
	readOnly: true,
	licenseKey: "non-commercial-and-evaluation",
	afterGetColHeader: (col, TH) => {
		// Удаление фильтра на последней колонке
		removeFilters(4, 5)(col, TH);
		const idColumn = billingTable.value.hotInstance.getCellMeta(0, col)?.id;
		if (idColumn == "client") {
			const stdBtn = TH.querySelector(".changeType");

			stdBtn.onclick = async (e) => {
				e.stopPropagation();
				filterActivatorEl.value = null;
				await nextTick(); // Ждём, чтобы DOM обновился
				filterActivatorEl.value = stdBtn; // сохраняем ссылку
				clientFilter?.value?.openFilterMenu();
			};
		}
		if (idColumn === "area") {
			const stdBtn = TH.querySelector(".changeType");

			stdBtn.onclick = async (e) => {
				e.stopPropagation();
				filterActivatorEl.value = null;
				await nextTick(); // Ждём, чтобы DOM обновился
				filterActivatorEl.value = stdBtn; // сохраняем ссылку
				areaFilter?.value?.openFilterMenu();
			};
		}
		if (idColumn == "status") {
			const stdBtn = TH.querySelector(".changeType");
			stdBtn.onclick = async (e) => {
				e.stopPropagation();
				filterActivatorEl.value = null;
				await nextTick(); // Ждём, чтобы DOM обновился
				filterActivatorEl.value = stdBtn; // сохраняем ссылку
				statusFilter?.value?.openFilterMenu();
			};
		}
		if (idColumn == "date") {
			const stdBtn = TH.querySelector(".changeType");

			stdBtn.onclick = async (e) => {
				e.stopPropagation();
				filterActivatorEl.value = null;
				await nextTick(); // Ждём, чтобы DOM обновился
				filterActivatorEl.value = stdBtn; // сохраняем ссылку
				dateFilter?.value?.openFilterMenu();
			};
		}
	},
};
const collectFilters = () => {
	let paramsClients = filtersToQueryParams(selectedClientFilter.value, customClients.value);
	let paramsArea = filtersToQueryParams(selectedAreaFilter.value, customAreas.value);
	let paramsStatus = filtersToQueryParams(selectedStatusFilter.value, customStatuses.value, "slug");

	let paramsPeriodMonths = [];
	let paramsPeriodYears = [];
	selectedDateFilter.value.forEach((el) => {
		if (typeof el == "string") {
			const index = +monthNames.indexOf(el);
			const value = +index + 1;
			if (value) paramsPeriodMonths.push(value);
			return;
		} else if (typeof el == "number") {
			paramsPeriodYears.push(el);
			return;
		}
	});

	return {
		filter: {
			"userClient.client_id": arrayFromSet(paramsClients),
			"userClient.area_id": arrayFromSet(paramsArea),
			billing_status_id: arrayFromSet(paramsStatus),
			accepted_month: arrayFromSet(paramsPeriodMonths),
			accepted_year: arrayFromSet(paramsPeriodYears),
		},
	};
};
const updateColFilters = (idColumn, value) => {
	if (idColumn == "client") {
		selectedClientFilter.value = value;
	}
	if (idColumn == "area") {
		selectedAreaFilter.value = value;
	}
	if (idColumn == "status") {
		selectedStatusFilter.value = value;
	}
	if (idColumn == "date") {
		selectedDateFilter.value = value;
	}
};

const fetchFilters = async (key = null, value) => {
	try {
		if (key) updateColFilters(key, value);
		const params = collectFilters();

		// console.log(params);
		queryParams.value = params;
		router.replace({ query: { filter: JSON.stringify(queryParams.value) } });
	} catch (e) {
		console.error(e);
	}
};
async function updateDataBilling(id) {
	try {
		const response = await api.get(`/billings/${id}`);
		const dataResponse = response.data;
		const index = data.value.findIndex((item) => item.id == id);
		data.value[index] = dataResponse.data;

		billingTable.value.hotInstance.loadData(data.value);
	} catch (error) {
		console.error(error);
	}
}

async function submit() {
	try {
		const billingFormData = new FormData(document.forms.billingForm);
		billingFormData.delete("clientId");
		billingFormData.delete("areaId");
		billingFormData.append("clientId", formData.value.clientId);
		billingFormData.append("areaId", formData.value.areaId);

		const response = await api.post("/billings", billingFormData);

		await getClientsAreas();

		const message = response.data.message;
		// console.log(message);
		toastStore.show("Отчёт отправлен", message, "success", 10000);
	} catch (error) {
		console.error("Error adding partner:", error.message);
		const dataError = error.response.data;
		toastStore.show("Ошибка", dataError.message, "error", 10000);
		// throw error;
	}
}

async function getClientsAreas() {
	try {
		const responseClients = await api.get("/active-clients");
		const responseAreas = await api.get("/active-areas");

		dataClients.value = responseClients.data.data.clients;
		dataAreas.value = responseAreas.data.data.areas;
	} catch (e) {
		console.error(e);
	}
}
const downloadTemplate = async () => {
	try {
		const response = await api.get(`/billings/downloads/billing-template`, {
			responseType: "blob",
		});
		// Создаем ссылку на файл
		const url = window.URL.createObjectURL(new Blob([response.data]));
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", "template.xlsx"); // Название файла для скачивания
		document.body.appendChild(link);
		link.click();

		// Очистка
		link.remove();
		window.URL.revokeObjectURL(url);
	} catch (e) {
		console.error(e);
	}
};
const downloadManual = async () => {
	try {
		const response = await api.get(`/billings/downloads/billing-manual`, {
			responseType: "blob",
		});
		// Создаем ссылку на файл
		const url = window.URL.createObjectURL(new Blob([response.data]));
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", "manual.pdf"); // Название файла для скачивания
		document.body.appendChild(link);
		link.click();

		// Очистка
		link.remove();
		window.URL.revokeObjectURL(url);
	} catch (e) {
		console.error(e);
	}
};
const getDataPager = (responseData) => {
	pageLinks.value = responseData.data.links;
	itemsOnPage.value = responseData.data.meta.per_page;
	totalItems.value = responseData.data.meta.total;

	const newPage = responseData.data.meta.current_page;
	if (pager.value !== newPage) {
		pager.value = newPage;
	}
};

const debouncedGetData = debounce(async ({ page, params }) => {
	try {
		await getData({ page, params });
	} catch (e) {
		console.error(e);
	}
}, 300);
const resetFilters = async () => {
	queryParams.value = {
		filter: {
			"userClient.client_id": [],
			"userClient.area_id": [],
			billing_status_id: [],
			accepted_month: [],
			accepted_year: [],
		},
	};
	pager.value = 1;

	selectedAreaFilter.value = [];
	selectedClientFilter.value = [];
	selectedStatusFilter.value = [];
	selectedDateFilter.value = [];

	await router.replace({ query: {} });
};

const addCustomFilters = async () => {
	try {
		const responseFiltersClients = await api.get("/billings/filter-info/clients");
		const responseFiltersAreas = await api.get("/billings/filter-info/areas");
		const responseFiltersStatuses = await api.get("/billings/filter-info/statuses");
		customClients.value = responseFiltersClients.data.data?.clients;
		customAreas.value = responseFiltersAreas.data.data?.areas;
		customStatuses.value = responseFiltersStatuses.data.data?.billingStatuses;
		// console.log({ dataClients, dataAreas, dataStatuses });
	} catch (e) {
		console.error(e);
	}
};
async function getData({ page, params = {} } = {}) {
	try {
		let link = `/billings`;
		if (page) link += `?page=${page}`;
		const hasParams = params && Object.keys(params).length > 0;
		const config = hasParams ? { params: { ...params, ...(page ? { page } : {}) } } : {};
		const responseData = hasParams ? await api.get("/billings", config) : await api.get(link);
		data.value = responseData.data.data.billings;
		// Загрузка пагинации
		getDataPager(responseData);
		// Добавление своих фильтров
		await addCustomFilters();

		if (!dataClients.value.length || !dataAreas.value.length) {
			await getClientsAreas();
		}
		loading.value = false;
		await nextTick();

		const hot = billingTable?.value?.hotInstance;
		if (hot) {
			//  Загрузка порядка колонок
			loadColumnsData("Billings", billingTable.value?.hotInstance);
			billingTable.value?.hotInstance.loadData(data.value);
		}
	} catch (e) {
		console.error(e);

		loading.value = false;
	}
}

watch(
	() => getDataCentrifuge.value,
	() => {
		if (getDataCentrifuge.value) {
			const billingId = getDataCentrifuge.value.payload?.billingId;
			if (billingId) {
				updateDataBilling(billingId);
				getClientsAreas();
				clearDataCentrifuge();
			}
		}
	},
);

const isSyncing = ref(false);
watch(
	() => route.query,
	(query) => {
		const newPage = Number(query.page || 1);
		if (!isSyncing.value) debouncedGetData({ page: newPage, params: queryParams.value });
	},
	{ deep: true },
);
watch(
	() => pager.value,
	(newVal) => {
		const currentPage = Number(route.query.page || 1);
		if (currentPage !== newVal) {
			isSyncing.value = true;
			// console.log("🟡 pager changed: pushing new page to route");
			router
				.replace({
					query: {
						...route.query,
						page: newVal.toString(),
					},
				})
				.finally(() => {
					// Отложенный сброс, чтобы успел отработать watch на route.query
					debouncedGetData({ page: pager.value, params: queryParams.value });
					nextTick(() => {
						isSyncing.value = false;
						// console.log("🟢 syncing complete");
					});
				});
		}
	},
);
const loadFiltersData = async () => {
	const filter = router?.currentRoute?.value?.query?.filter && JSON.parse(router?.currentRoute?.value?.query?.filter);
	if (filter && Object.values(filter.filter).some((item) => item.length)) {
		// console.log(filter);
		queryParams.value.filter = filter.filter;
	}
	const page = router?.currentRoute?.value?.query?.page;
	pager.value = page ? JSON.parse(page) : 1;
	await getData({ page: pager.value, params: queryParams.value });
	// console.log(isQueryParamsNonEmpty.value);
	if (isQueryParamsNonEmpty.value) {
		// console.log(queryParams.value);
		selectedAreaFilter.value = queryParamsToFilters(
			queryParams.value.filter["userClient.area_id"],
			customAreas.value,
		);
		selectedClientFilter.value = queryParamsToFilters(
			queryParams.value.filter["userClient.client_id"],
			customClients.value,
		);
		selectedStatusFilter.value = queryParamsToFilters(
			queryParams.value.filter["billing_status_id"],
			customStatuses.value,
			"slug",
		);
		selectedDateFilter.value = queryParams.value.filter["accepted_month"].reduce((acc, el) => {
			const elem = monthNames[+el - 1];
			if (elem) acc.push(elem);
			return acc;
		}, []);
		queryParams.value.filter["accepted_year"].forEach((el) => {
			selectedDateFilter.value.push(el);
		});
	}
};
onMounted(() => {
	loadFiltersData();
});
</script>
