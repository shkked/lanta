<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<div class="d-flex flex-column w-100 ga-5">
			<h3 class="text-h6 w-100">Выгрузка позиций биллинга</h3>
			<div class="d-flex">
				<div class="w-25">
					<!-- {{ selectedUserFilter }}
					<br />
					{{ queryParams }} -->
					<v-skeleton-loader v-if="loading" class="custom-loader__input" type="text"></v-skeleton-loader>
					<v-select
						v-else
						v-model="selectedTypeId"
						variant="outlined"
						:items="typesUploading.map((type) => type.name)"
						item-text="name"
						item-value="id"
						label="Выберите тип загрузки"
						hide-details
						density="compact"
						color="primary"
					/>
				</div>
			</div>
			<div class="d-flex w-100 align-center flex-nowrap ga-5 border-sm rounded pa-5">
				<div v-if="selectedTypeUploading == 1" class="w-25">
					<v-skeleton-loader v-if="loading" class="custom-loader__input" type="text"></v-skeleton-loader>
					<v-select
						v-else
						v-model="clientId"
						variant="outlined"
						:items="dataClients.map((client) => client.name)"
						label="Выберите клиента"
						hide-details
						density="compact"
						color="primary"
					></v-select>
				</div>
				<div class="w-25">
					<v-skeleton-loader v-if="loading" class="custom-loader__input" type="text"></v-skeleton-loader>
					<vue-date-picker
						v-else
						v-model="date"
						locale="ru"
						cancel-text="Отмена"
						select-text="Выбрать"
						month-picker
						input-class-name="picker_input"
						menu-class-name="picker_menu"
					/>
				</div>
				<v-checkbox
					v-if="selectedTypeUploading == 1"
					v-model="isAgreedUploading"
					label="Только утверждённые"
					color="primary"
					hide-details
					class="w-25"
					density="compact"
				></v-checkbox>
				<div class="w-25 d-flex justify-end">
					<v-btn
						:disabled="isEmptyDataUploading"
						color="primary"
						prepend-icon="mdi mdi-tray-arrow-down"
						size="large"
						variant="flat"
						@click="uploadingToExcel"
						>Выгрузить в excel</v-btn
					>
				</div>
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
		<!-- Кастомный фильтр по СП -->
		<customFilter
			ref="userFilter"
			v-model="selectedUserFilter"
			:items="customUsers.map((item) => item.name)"
			:activator="filterActivatorEl"
			@clear="fetchFilters('user', $event)"
			@apply="fetchFilters('user', $event)"
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
			<v-skeleton-loader v-if="loading" class="border" type="table"></v-skeleton-loader>
			<h3 v-if="!loading && !data.length" class="text-h6 no-data">Нет биллингов</h3>
			<hot-table
				v-if="!loading && data.length"
				ref="hotTableComponentRef"
				:settings="hotSettings"
				:language="language"
			>
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
import { api } from "@/axios/index.js";
import customFilter from "@/components/customFilter.vue";
import {
	arrayFromSet,
	filtersToQueryParams,
	isSameOrder,
	loadColumnsData,
	mapStatusToColor,
	paintRow,
	queryParamsToFilters,
	removeFilters,
	setColumnsOrder,
	setColumnsWidth,
} from "@/helpers";
import { HotTable } from "@handsontable/vue3";
import VueDatePicker from "@vuepic/vue-datepicker";
import { debounce } from "lodash";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const clientFilter = ref(null);
const userFilter = ref(null);
const areaFilter = ref(null);
const statusFilter = ref(null);
const dateFilter = ref(null);

const selectedClientFilter = ref([]);
const selectedAreaFilter = ref([]);
const selectedStatusFilter = ref([]);
const selectedUserFilter = ref([]);
const selectedDateFilter = ref([]);

const customClients = ref([]);
const customAreas = ref([]);
const customStatuses = ref([]);
const customUsers = ref([]);
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
const typesUploading = ref([
	{ id: 1, name: "По клиенту", query: "by-client" },
	{ id: 2, name: "Количество позиций по клиентам", query: "billings-counts" },
	{ id: 3, name: "Позиции по периоду", query: "billing-items" },
]);
const isAgreedUploading = ref(false);

const selectedTypeUploading = ref(1);
const isEmptyDataUploading = computed(() => {
	if (selectedTypeUploading.value == 1) {
		return !selectedClient.value || !date.value;
	}
	if (selectedTypeUploading.value == 2) {
		return !date.value;
	}
	if (selectedTypeUploading.value == 3) {
		return !date.value;
	}
	return true;
});
const selectedTypeId = computed({
	get() {
		const id = selectedTypeUploading.value;
		return typesUploading.value.find((item) => item.id == id)?.name;
	},
	set(value) {
		const index = typesUploading.value.findIndex((item) => item.name == value);
		selectedTypeUploading.value = typesUploading.value[index].id;
	},
});

const uploadingToExcel = async () => {
	try {
		const type = typesUploading.value.find((item) => item.id == selectedTypeUploading.value).query;
		const params = {
			month: date.value.month + 1,
			year: date.value.year,
		};
		if (selectedTypeUploading.value == 1) {
			params.clientId = selectedClient.value;
			params.isAgreed = isAgreedUploading.value;
		}
		const response = await api.get(`/billings/export/${type}`, {
			params,
			responseType: "blob",
		});
		// Создаем ссылку на файл
		const url = window.URL.createObjectURL(new Blob([response.data]));
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", "uploading.xlsx"); // Название файла для скачивания
		document.body.appendChild(link);
		link.click();

		// Очистка
		link.remove();
		window.URL.revokeObjectURL(url);
	} catch (e) {
		console.log(e);
	}
};
const filterActivatorEl = ref(null);
const queryParams = ref({
	filter: {
		"userClient.client_id": [],
		"userClient.area_id": [],
		"userClient.user_id": [],
		billing_status_id: [],
		accepted_month: [],
		accepted_year: [],
	},
});
const isQueryParamsNonEmpty = computed(() => {
	return queryParams.value?.filter && Object.values(queryParams.value.filter).some((item) => item.length);
});
// const { permittedFor } = useUserStore();
const dataClients = ref([]);
const loading = ref(true);
const selectedClient = ref(null);
const date = ref({
	month: new Date().getMonth(),
	year: new Date().getFullYear(),
});
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

const router = useRouter();
const route = useRoute();

const data = ref([]);

const clientId = computed({
	get() {
		const id = selectedClient.value;
		return dataClients.value.find((item) => item.id == id)?.name;
	},
	set(value) {
		const index = dataClients.value.findIndex((item) => item.name == value);
		selectedClient.value = dataClients.value[index].id;
	},
});

const hotTableComponentRef = ref(null);

const hotSettings = {
	data: data.value,
	rowHeights: 40,
	columns: [
		{
			id: "user",
			type: "text",
			data: "user",
			title: "СП",
			filters: false,
			renderer: (instance, td, row, col, prop, value) => {
				const link = document.createElement("a");
				link.className = "text-decoration-underline cursor-pointer";
				link.textContent = value;
				link.addEventListener("click", () => {
					router.push({
						name: "ClientBilling (USP)",
						params: { client: value },
						query: { id: data.value[row].id },
					});
				});
				td.innerHTML = "";
				td.appendChild(link);
				return td;
			},
		},
		{
			id: "client",
			type: "text",
			data: "client",
			title: "Клиент",
			filters: false,
		},
		{ id: "area", type: "text", data: "area", title: "Регион", filters: false },
		{ id: "date", type: "date", dateFormat: "MM/YYYY", data: "date", title: "Отчётный<br/>период", filters: false },
		{
			id: "status",
			type: "text",
			data: "status",
			title: "Статус",
			filters: false,
			renderer: (instance, td, row, col, prop, value) => {
				td.className = "htMiddle";
				const colorClass = mapStatusToColor(value?.status_text, true, value?.color);
				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const color = rowData.statusColor;
				td.innerHTML = `<div style="color: ${color}" class="${colorClass}">${value}</div>`;
				return td;
			},
		},
		{
			type: "date",
			dateFormat: "MM/YYYY",
			// data: "month.year",
			title: "Дата загрузки",
			renderer: (instance, td, row, col, prop, value) => {
				td.className = "htMiddle";
				// const date = new Date(value);
				// const day = date.getDate().toString().padStart(2, "0");
				// const month = (date.getMonth() + 1).toString().padStart(2, "0");
				// const year = date.getFullYear();

				td.innerHTML = value;
				return td;
			},
		},
		{ type: "text", data: "analyst", title: "Ответственный" },
		{ type: "text", data: "comment", title: "Комментарий" },
		{
			type: "text",
			title: "Диск",

			renderer: (instance, td, row, col, prop, value) => {
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
			setColumnsOrder("Billings", hotTableComponentRef.value.hotInstance);
			setColumnsWidth("Billings", hotTableComponentRef.value.hotInstance);
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
	afterGetColHeader: (col, TH) => {
		// Удаление фильтра на последней колонке
		removeFilters(8)(col, TH);
		const idColumn = hotTableComponentRef.value.hotInstance.getCellMeta(0, col)?.id;
		if (idColumn == "user") {
			const stdBtn = TH.querySelector(".changeType");

			stdBtn.onclick = async (e) => {
				e.stopPropagation();
				filterActivatorEl.value = null;
				await nextTick(); // Ждём, чтобы DOM обновился
				filterActivatorEl.value = stdBtn; // сохраняем ссылку
				userFilter?.value?.openFilterMenu();
			};
		}
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
	let paramsUser = filtersToQueryParams(selectedUserFilter.value, customUsers.value);

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
			"userClient.user_id": arrayFromSet(paramsUser),
			billing_status_id: arrayFromSet(paramsStatus),
			accepted_month: arrayFromSet(paramsPeriodMonths),
			accepted_year: arrayFromSet(paramsPeriodYears),
		},
	};
};
const updateColFilters = (idColumn, value) => {
	if (idColumn == "user") {
		selectedUserFilter.value = value;
	}
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
		queryParams.value = params;
		router.replace({ query: { filter: JSON.stringify(queryParams.value) } });
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
const getData = async ({ page, params = {} } = {}) => {
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

		loading.value = false;
		await nextTick();

		const hot = hotTableComponentRef?.value?.hotInstance;
		if (hot) {
			// Загрузка данных из локального хранилища
			loadColumnsData("Billings", hot);
			hot.loadData(data.value);
		}
	} catch (e) {
		console.error(e);
	}
};
const resetFilters = async () => {
	queryParams.value = {
		filter: {
			"userClient.client_id": [],
			"userClient.area_id": [],
			"userClient.user_id": [],
			billing_status_id: [],
			accepted_month: [],
			accepted_year: [],
		},
	};
	pager.value = 1;

	selectedAreaFilter.value = [];
	selectedClientFilter.value = [];
	selectedStatusFilter.value = [];
	selectedUserFilter.value = [];
	selectedDateFilter.value = [];

	await router.replace({ query: {} });
};
const addCustomFilters = async () => {
	try {
		const responseFiltersClients = await api.get("/billings/filter-info/clients");
		const responseFiltersAreas = await api.get("/billings/filter-info/areas");
		const responseFiltersStatuses = await api.get("/billings/filter-info/statuses");
		const responseFiltersUsers = await api.get("/billings/filter-info/sps");
		customClients.value = responseFiltersClients.data.data?.clients;
		dataClients.value = customClients.value;
		customAreas.value = responseFiltersAreas.data.data?.areas;
		customStatuses.value = responseFiltersStatuses.data.data?.billingStatuses;
		customUsers.value = responseFiltersUsers.data.data?.users;
	} catch (e) {
		console.error(e);
	}
};
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
		selectedUserFilter.value = queryParamsToFilters(
			queryParams.value.filter["userClient.user_id"],
			customUsers.value,
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
