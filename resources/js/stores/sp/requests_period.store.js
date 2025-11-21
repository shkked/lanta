import { api } from "@/axios/index.js";
import { createFilter, loadColumnsData } from "@/helpers";
import { defineStore } from "pinia";
import { computed, nextTick, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

export const useRequestsPeriodStore = defineStore("requests-period", () => {
	const route = useRoute();
	const router = useRouter();

	const language = "ru-RU";
	const hotTableComponentRefIncident = ref(null);
	const hotTableComponentRefPaged = ref(null);
	const hotTableComponentRefSubscriber = ref(null);

	const tabValue = ref("incident");
	const loading = ref(true);
	const dataIncident = ref([]);
	const dataPaged = ref([]);
	const dataSubscriber = ref([]);

	const isFiltersReady = ref(false);

	// Текущие данные для отображения
	const actualDataTable = computed(() => {
		switch (tabValue.value) {
			case "incident":
				return dataIncident.value;
			case "paged":
				return dataPaged.value;
			case "subscriber":
				return dataSubscriber.value;
		}
		return dataIncident.value;
	});
	// Текущая активная таблица
	const actualHotTable = computed(() => {
		switch (tabValue.value) {
			case "incident":
				return hotTableComponentRefIncident.value;
			case "paged":
				return hotTableComponentRefPaged.value;
			case "subscriber":
				return hotTableComponentRefSubscriber.value;
		}

		return hotTableComponentRefIncident.value;
	});

	// Фильтры для каждой таблицы
	const filtersByTab = {
		incident: {
			selectedColumn: ref("orderCode"),
			filterValue: ref(""),
			mapFilters: {
				isApproved: createFilter(() => setOptionsFilter("isApproved")),
				penaltyReason: createFilter(() => setOptionsFilter("penaltyReason")),
				finalAmount: createFilter(() => setOptionsFilter("finalAmount")),
				penaltyAmount: createFilter(() => setOptionsFilter("penaltyAmount")),
				agreedAmount: createFilter(() => setOptionsFilter("agreedAmount")),
				actualCompletionDate: createFilter(() => setOptionsFilter("actualCompletionDate")),
				plannedCompletionDate: createFilter(() => setOptionsFilter("plannedCompletionDate")),
				reportRequestCategory: createFilter(() => setOptionsFilter("reportRequestCategory")),
				area: createFilter(() => setOptionsFilter("area")),
				orderCode: createFilter(() => setOptionsFilter("orderCode")),
				usp: createFilter(() => setOptionsFilter("usp")),
				user: createFilter(() => setOptionsFilter("user")),
				client: createFilter(() => setOptionsFilter("client")),
			},
		},
		paged: {
			selectedColumn: ref("orderCode"),
			filterValue: ref(""),
			mapFilters: {
				isApproved: createFilter(() => setOptionsFilter("isApproved")),
				penaltyReason: createFilter(() => setOptionsFilter("penaltyReason")),
				finalAmount: createFilter(() => setOptionsFilter("finalAmount")),
				penaltyAmount: createFilter(() => setOptionsFilter("penaltyAmount")),
				agreedAmount: createFilter(() => setOptionsFilter("agreedAmount")),
				actualCompletionDate: createFilter(() => setOptionsFilter("actualCompletionDate")),
				plannedCompletionDate: createFilter(() => setOptionsFilter("plannedCompletionDate")),
				reportRequestCategory: createFilter(() => setOptionsFilter("reportRequestCategory")),
				area: createFilter(() => setOptionsFilter("area")),
				orderCode: createFilter(() => setOptionsFilter("orderCode")),
				usp: createFilter(() => setOptionsFilter("usp")),
				user: createFilter(() => setOptionsFilter("user")),
				client: createFilter(() => setOptionsFilter("client")),
			},
		},
		subscriber: {
			selectedColumn: ref("orderCode"),
			filterValue: ref(""),
			mapFilters: {
				isApproved: createFilter(() => setOptionsFilter("isApproved")),
				penaltyReason: createFilter(() => setOptionsFilter("penaltyReason")),
				finalAmount: createFilter(() => setOptionsFilter("finalAmount")),
				penaltyAmount: createFilter(() => setOptionsFilter("penaltyAmount")),
				agreedAmount: createFilter(() => setOptionsFilter("agreedAmount")),
				actualCompletionDate: createFilter(() => setOptionsFilter("actualCompletionDate")),
				plannedCompletionDate: createFilter(() => setOptionsFilter("plannedCompletionDate")),
				reportRequestCategory: createFilter(() => setOptionsFilter("reportRequestCategory")),
				area: createFilter(() => setOptionsFilter("area")),
				orderCode: createFilter(() => setOptionsFilter("orderCode")),
				usp: createFilter(() => setOptionsFilter("usp")),
				user: createFilter(() => setOptionsFilter("user")),
				client: createFilter(() => setOptionsFilter("client")),
			},
		},
	};
	// Текущие фильтры
	const currentFilters = computed(() => filtersByTab[tabValue.value]);
	// Фильтры для шаблона
	const mapFiltersForTemplate = computed(() => {
		const obj = {};
		for (const [key, filter] of Object.entries(currentFilters.value.mapFilters)) {
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
	// Проверка на пустые фильтры
	const isQueryParamsNonEmpty = computed(() => {
		return Object.values(currentFilters.value.mapFilters).some((filter) => filter.valueModel.value.length > 0);
	});
	// Загрузка фильтров из URL
	function loadFiltersFromURL() {
		const params = route.query;
		tabValue.value = params.tabValue || "incident";

		for (const [tabName, tabFilters] of Object.entries(filtersByTab)) {
			// mapFilters
			for (const [key, filter] of Object.entries(tabFilters.mapFilters)) {
				const raw = params[`${tabName}_${key}`];
				if (raw || raw === "") {
					filter.valueModel.value = raw.split(",").map((v) => {
						if (v === "") return v;
						const num = Number(v);
						return isNaN(num) ? v : num;
					});
				} else {
					filter.valueModel.value = [];
				}
			}
		}
	}

	// Значения для фильтров
	function setOptionsFilter(key) {
		const filtered = isFiltersReady.value ? filteredData() : actualDataTable.value;
		const source = filtered;

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
	// Фильтрация
	const filteredData = () => {
		let baseData = actualDataTable.value;
		return baseData.filter((row) => {
			return Object.entries(currentFilters.value.mapFilters).every(([key, filter]) => {
				return filter.filterFn(row[key]);
			});
		});
	};
	// Обновление URL
	function updateURLFilters() {
		const query = { tabValue: tabValue.value };

		for (const [tabName, tabFilters] of Object.entries(filtersByTab)) {
			for (const [key, filter] of Object.entries(tabFilters.mapFilters)) {
				if (filter.valueModel.value.length > 0) {
					// ключ делаем уникальным с префиксом вкладки
					query[`${tabName}_${key}`] = filter.valueModel.value.join(",");
				}
			}
		}

		router.replace({ query });
	}
	// Применение фильтров
	async function fetchFilters({ value, key } = {}) {
		isFiltersReady.value = false;

		if (key && currentFilters.value.mapFilters[key]) {
			currentFilters.value.mapFilters[key].valueModel.value = value;
		}

		updateURLFilters();

		await nextTick();

		if (actualHotTable?.value?.hotInstance) {
			const newData = filteredData();
			actualHotTable.value.hotInstance.loadData(newData);
		}
		isFiltersReady.value = true;
	}
	// Сброс фильтров
	function resetFilters() {
		for (const filter of Object.values(currentFilters.value.mapFilters)) {
			filter.valueModel.value = [];
		}

		fetchFilters();
	}
	// Обновление данных таблицы
	const hotTableLoadData = (newVal = null, idItem, name = "") => {
		// Update value
		if (newVal !== null) {
			const itemIndex = actualDataTable.value.findIndex((item) => item.id === idItem);
			if (name) {
				actualDataTable.value[itemIndex][name] = newVal;
			} else {
				actualDataTable.value[itemIndex] = newVal;
			}
		}

		if (isQueryParamsNonEmpty.value) {
			const filtered = filteredData();
			actualHotTable.value.hotInstance.loadData(filtered);
			return filtered;
		} else {
			actualHotTable.value.hotInstance.loadData(actualDataTable.value);
			return actualDataTable.value;
		}
	};
	// Колонки
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
	// Получение данных
	const getApplicationsTable = async () => {
		try {
			const id = route.params.id;
			const responseData = (await api.get(`/report-requests/${id}/report-request-items`)).data;

			const itemWithPaged = responseData.find((item) => item.hasOwnProperty("copy-by-copyApplications"));
			const itemWithIncident = responseData.find((item) => item.hasOwnProperty("incidentApplications"));
			const itemWithSubscriber = responseData.find((item) => item.hasOwnProperty("subscriptionService"));

			dataPaged.value = itemWithPaged?.["copy-by-copyApplications"] || [];
			dataIncident.value = itemWithIncident?.incidentApplications || [];
			dataSubscriber.value = itemWithSubscriber?.subscriptionService || [];

			loading.value = false;
			await nextTick();

			const currentTab = tabValue.value;
			const currentData =
				currentTab === "paged"
					? dataPaged.value
					: currentTab === "incident"
						? dataIncident.value
						: dataSubscriber.value;

			const hot = actualHotTable?.value?.hotInstance;
			if (hot) {
				hot.loadData(currentData);
				loadColumnsData("RequestsPeriod", hot);
			}
		} catch (e) {
			console.error("Ошибка при загрузке данных:", e);
		}
	};

	async function changeRequestStatus(id, isApproved) {
		try {
			await api.put(`/report-requests/${id}`, { isApproved });
		} catch (e) {
			console.error("Ошибка при смене статуса:", e);
		}
	}

	return {
		hotTableComponentRefIncident,
		hotTableComponentRefPaged,
		hotTableComponentRefSubscriber,
		tabValue,
		loading,
		dataIncident,
		dataPaged,
		dataSubscriber,
		actualDataTable,
		actualHotTable,
		isFiltersReady,
		currentFilters,
		filtersByTab,
		mapFiltersForTemplate,
		hotTableLoadData,
		filterColumns,
		fetchFilters,
		resetFilters,
		isQueryParamsNonEmpty,
		filteredData,
		getApplicationsTable,
		changeRequestStatus,
		loadFiltersFromURL,
		updateURLFilters,
		language,
	};
});
