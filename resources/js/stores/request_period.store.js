import { defineStore } from "pinia";
import { api } from "@/axios/index.js";
import { ref, watch } from "vue";

export const useRequestStore = defineStore("requests", () => {
	const requests = ref([]); // Все заявки
	const filteredRequests = ref([]); // Отфильтрованные заявки
	const totalItems = ref(0);
	const loading = ref(false);
	const filterValue = ref("");
	const selectedColumn = ref("orderCode");

	//данные - опции для кастом фильтра по колонкам
	const dataSelects = ref({
		isApproved: [],
		penaltyReason: [],
		finalAmount: [],
		penaltyAmount: [],
		agreedAmount: [],
		actualCompletionDate: [],
		plannedCompletionDate: [],
		reportRequestCategory: [],
		area: [],
		orderCode: [],
		usp: [],
		user: [],
		client: [],
	});

	// выбранные пользователем значения кастом фильтра для каждой колонки
	const columnFilters = ref({
		isApproved: [],
		penaltyReason: [],
		finalAmount: [],
		penaltyAmount: [],
		agreedAmount: [],
		actualCompletionDate: [],
		plannedCompletionDate: [],
		reportRequestCategory: [],
		area: [],
		orderCode: [],
		usp: [],
		user: [],
		client: [],
	});

	// Фильтрация для всей таблицы по номеру заявки
	const filterableColumns = [{ title: "Номер", value: "orderCode" }];

	// Вспомогательная функция для уникальных значений по ключу
	function getUniqueValues(arr, key) {
		return [...new Set(arr.map((item) => item[key]).filter((val) => val !== null && val !== undefined))];
	}

	async function updateDataSelects(sourceArray) {
		dataSelects.value = {
			area: getUniqueValues(sourceArray, "area"),
			client: getUniqueValues(sourceArray, "client"),
			reportRequestCategory: getUniqueValues(sourceArray, "reportRequestCategory"),
			user: getUniqueValues(sourceArray, "user"),
			penaltyReason: getUniqueValues(sourceArray, "penaltyReason"),
			penaltyAmount: getUniqueValues(sourceArray, "penaltyAmount"),
			finalAmount: getUniqueValues(sourceArray, "finalAmount"),
			agreedAmount: getUniqueValues(sourceArray, "agreedAmount"),
			actualCompletionDate: getUniqueValues(sourceArray, "actualCompletionDate"),
			plannedCompletionDate: getUniqueValues(sourceArray, "plannedCompletionDate"),
			orderCode: getUniqueValues(sourceArray, "orderCode"),
			usp: getUniqueValues(sourceArray, "usp"),
			isApproved: getUniqueValues(sourceArray, "isApproved", { keepFalsy: true }),
		};
	}

	// Загрузка всех заявок
	async function loadRequests(id) {
		loading.value = true;
		try {
			const response = await api.get(`/report-requests/${id}/report-request-items`);
			requests.value = response.data.reportRequestItems || [];

			filteredRequests.value = [...requests.value];
			totalItems.value = filteredRequests.value.length;

			await updateDataSelects(requests.value);

			clearAllColumnFilters();
		} catch (error) {
			console.error("Ошибка при загрузке заявок", error);
		} finally {
			loading.value = false;
		}
	}

	async function filterData() {
		let result = [...requests.value];

		// Фильтры по номеру заявки в таблице
		if (filterValue.value.trim()) {
			const filterText = filterValue.value.toLowerCase();
			const column = selectedColumn.value;

			result = result.filter((item) => {
				const val = item[column]?.toString().toLowerCase() || "";
				return val.includes(filterText);
			});
		}

		// Фильтрация по значениям в колонках
		Object.entries(columnFilters.value).forEach(([col, selectedValues]) => {
			if (selectedValues.length) {
				result = result.filter((item) => selectedValues.includes(item[col]));
			}
		});

		filteredRequests.value = result;
		totalItems.value = result.length;

		// Обновляем опции фильтров колонок исходя из текущих отфильтрованных данных
		await updateDataSelects(result);
	}

	// Сброс всех фильтров (колоночных)
	function clearAllColumnFilters() {
		Object.keys(columnFilters.value).forEach((key) => {
			columnFilters.value[key] = [];
		});
	}

	// Установка фильтра по колонке и запуск фильтрации
	async function setColumnFilter(column, values) {
		columnFilters.value[column] = values;
		await filterData();
	}

	// Следим за изменениями в тексте поиска, выбранной колонке и колонках фильтров (глубокий watch)
	watch([filterValue, selectedColumn, columnFilters], filterData, { deep: true });

	return {
		// State
		requests,
		filteredRequests,
		totalItems,
		loading,
		dataSelects,

		// Фильтры
		filterValue,
		selectedColumn,
		columnFilters,
		filterableColumns,

		// Actions
		loadRequests,
		filterData,
		clearAllColumnFilters,
		setColumnFilter,
	};
});
