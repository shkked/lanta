<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<div class="d-flex flex-column w-100 border-sm rounded pa-5">
			<v-form
				v-model="valid"
				name="requestsForm"
				class="d-flex w-100 flex-column ga-5"
				@submit.prevent="submitData"
			>
				<div class="d-flex align-center">
					<div class="d-flex w-50 ga-5 align-start">
						<!-- Start Date Picker -->
						<v-menu
							v-model="datePickerStartDate"
							:close-on-content-click="false"
							transition="scale-transition"
							offset-y
							min-width="290px"
						>
							<template #activator="{ props: activatorProps }">
								<v-text-field
									v-model="formData.beginReportingPeriod"
									:value="formatDate(formData.beginReportingPeriod)"
									:rules="[(v) => !!v || 'Поле обязательно для заполнения']"
									prepend-icon="mdi mdi-calendar-month-outline"
									class="w-25"
									v-bind="activatorProps"
									readonly
									variant="outlined"
									label="Начало периода:"
									clearable
									density="compact"
								></v-text-field>
							</template>
							<template #default>
								<v-locale-provider locale="ru">
									<v-date-picker
										v-model="formData.beginReportingPeriod"
										no-title
										scrollable
										color="primary"
										:max="formData.endReportingPeriod"
										:allowed-dates="allowedStartDates"
										@update:model-value="datePickerStartDate = false"
									/>
								</v-locale-provider>
							</template>
						</v-menu>

						<!-- End Date Picker -->
						<v-menu
							v-model="datePickerEndDate"
							:close-on-content-click="false"
							transition="scale-transition"
							offset-y
							min-width="290px"
						>
							<template #activator="{ props: activatorProps }">
								<v-text-field
									v-model="formData.endReportingPeriod"
									:rules="[(v) => !!v || 'Поле обязательно для заполнения']"
									:value="formatDate(formData.endReportingPeriod)"
									prepend-icon="mdi mdi-calendar-month-outline"
									class="w-25"
									v-bind="activatorProps"
									readonly
									clearable
									variant="outlined"
									label="Конец периода:"
									density="compact"
								></v-text-field>
							</template>
							<template #default>
								<v-locale-provider locale="ru">
									<v-date-picker
										v-model="displayedEndDate"
										no-title
										scrollable
										color="primary"
										:min="minEndDate"
										:max="maxEndDate"
										:allowed-dates="allowedEndDates"
										@update:model-value="onSelectEndDate"
									/>
								</v-locale-provider>
							</template>
						</v-menu>
					</div>
					<v-checkbox
						v-model="formData.isCompleted"
						class="ms-3"
						label="Дать доступ сформировать отчёты для СП"
						color="primary"
					/>
				</div>
				<div class="w-100 d-flex justify-start">
					<v-btn
						:disabled="!valid || centrifugeStore.isLoadingApplications"
						type="submit"
						color="primary"
						variant="flat"
						prepend-icon="mdi mdi-send-check-outline"
						:loading="centrifugeStore.isLoadingApplications"
					>
						Загрузить
					</v-btn>
				</div>
			</v-form>
		</div>
		<div class="w-100 mt-5">
			<h3 class="text-h6 mb-5">Последние загруженные заявки</h3>
			<v-skeleton-loader v-if="loading" class="border" type="table"> </v-skeleton-loader>
			<h3 v-if="!loading && !data.length" class="text-h6 no-data">Нет заявок</h3>
			<hot-table
				v-if="!loading && data.length"
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
import { formatDate, isSameOrder, loadColumnsData, paintRow, setColumnsOrder, setColumnsWidth } from "@/helpers";
import { useCentrifugeStore } from "@/stores/centrifuge.store.js";
import { useToastStore } from "@/stores/toast.store.js";
import { HotTable } from "@handsontable/vue3";
import dayjs from "dayjs";
import Handsontable from "handsontable";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

const hotTableComponentRef = ref(null);
const language = "ru-RU";
const router = useRouter();

const centrifugeStore = useCentrifugeStore();

const toastStore = useToastStore();

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
const valid = ref(false);
const loading = ref(true);

const datePickerStartDate = ref(false);
const datePickerEndDate = ref(false);
const displayedEndDate = ref(null);

const data = ref([]);

const formData = ref({
	beginReportingPeriod: null,
	endReportingPeriod: null,
	isCompleted: false,
});

const minEndDate = computed(() => {
	if (!formData.value.beginReportingPeriod) return null;
	return dayjs(formData.value.beginReportingPeriod).format("YYYY-MM-DD");
});

const maxEndDate = computed(() => {
	if (!formData.value.beginReportingPeriod) return null;
	return dayjs(formData.value.beginReportingPeriod).add(7, "day").format("YYYY-MM-DD");
});

const allowedStartDates = (date) => {
	if (!formData.value.endReportingPeriod) return true;
	const end = dayjs(formData.value.endReportingPeriod);
	const d = dayjs(date);

	if (!d.isValid()) return false;

	return d.isBefore(end) && d.isAfter(end.subtract(7, "day"));
};

const allowedEndDates = (date) => {
	if (!formData.value.beginReportingPeriod) return true;
	const start = dayjs(formData.value.beginReportingPeriod);
	const d = dayjs(date);

	if (!d.isValid()) return false;

	return d.isAfter(start) && d.isBefore(start.add(7, "day"));
};

function onSelectEndDate(val) {
	formData.value.endReportingPeriod = val;
	datePickerEndDate.value = false;
}

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
					router.push({ name: "RequestsPeriod (USP)", params: { id: rowData.id } });
				});
				td.innerHTML = "";
				td.appendChild(div);
				div.appendChild(button);
				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
		{
			type: "text",
			title: "Отправить в СП",
			renderer: (instance, td, row) => {
				td.innerHTML = "";

				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				td.className = "htMiddle";

				const div = document.createElement("div");
				div.className = "d-flex align-center justify-center";

				const button = document.createElement("button");
				button.className = "table_primary_button";
				button.textContent = "Утвердить";
				button.disabled = !rowData?.canApprove;

				button.addEventListener("click", async () => {
					button.disabled = true;
					button.classList.add("loading");
					try {
						const id = rowData.id;
						const response = await api.post(`/report-requests/${id}/accept`);
						toastStore.show("Успех!", response.data.message, "success", 10000);
					} catch (e) {
						toastStore.show("Ошибка!", e.message, "error", 10000);
						console.error(e);
					} finally {
						button.classList.remove("loading");
					}
				});

				div.appendChild(button);
				td.appendChild(div);
				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
		{
			type: "text",
			title: "Комментарий",
			readOnly: false,
			columnSorting: {
				headerAction: false,
			},
		},
		{
			type: "text",
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
				button.textContent = "Удалить";
				button.disabled = !rowData?.canDelete;

				button.addEventListener("click", async () => {
					button.disabled = true;
					button.classList.add("loading");
					try {
						const id = rowData.id;
						const response = await api.delete(`/report-requests/${id}`);
						console.log(response.data);

						const index = data.value.findIndex((item) => item.id === id);
						if (index !== -1) {
							data.value.splice(index, 1); // реактивное удаление
						}
						instance.loadData(data.value);
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
	cells: (row, col) => {
		const cellProperties = {};
		const rowData = data.value[row];
		const column = hotTableComponentRef.value.hotInstance.getSettings().columns[col];

		// if (column.data === "openRequests") {
		// 	// Пропускаем кастомный рендер для кнопок
		// 	return cellProperties;
		// }

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

		const savedOrder = JSON.parse(localStorage.getItem("columnsOrderRequests"));

		// Если порядок совпадает с сохранённым — это инициализация, не сохраняем
		if (isSameOrder(Array.from(currentOrder), savedOrder)) return;
		// console.log({ currentOrder: Array.from(currentOrder), savedOrder });

		setColumnsOrder("Requests", hot);
		setColumnsWidth("Requests", hot);
	},
	// Сохранение размеров после перемещения
	manualColumnResize: true,
	afterColumnResize: (newSize, column, isDoubleClick) => {
		if (newSize) {
			setColumnsOrder("Requests", hotTableComponentRef.value.hotInstance);
			setColumnsWidth("Requests", hotTableComponentRef.value.hotInstance);
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

async function submitData() {
	try {
		centrifugeStore.isLoadingApplications = true;
		const formattedData = {
			beginReportingPeriod: formatDate(formData.value.beginReportingPeriod),
			endReportingPeriod: formatDate(formData.value.endReportingPeriod),
			isCompleted: formData.value.isCompleted,
		};
		const response = await api.post("/report-requests", formattedData);
		console.log(response?.data?.data);
	} catch (error) {
		console.error("Error adding partner:", error.message);
	}
}

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
		// data.value[0].isCompleted = true;
		// pageLinks.value = responseData.data.links;
		// itemsOnPage.value = responseData.data.meta.per_page;
		// totalItems.value = responseData.data.meta.total;
		// pager.value = responseData.data.meta.current_page;

		loading.value = false;
		await nextTick();

		const hot = hotTableComponentRef?.value?.hotInstance;
		if (hot) {
			hot.loadData(data.value);
			// Загрузка данных из локального хранилища
			loadColumnsData("Requests", hot);
		}
	} catch (e) {
		console.error(e);
	}
};

watch(datePickerEndDate, (opened) => {
	if (opened) {
		// При открытии: ставим в отображаемую дату — начало периода, если конец ещё не выбран
		if (!formData.value.endReportingPeriod && formData.value.beginReportingPeriod) {
			displayedEndDate.value = formData.value.beginReportingPeriod;
		} else {
			displayedEndDate.value = formData.value.endReportingPeriod;
		}
	}
});

watch(
	() => centrifugeStore.getDataCentrifuge,
	(val) => {
		if (val) {
			getData();
			centrifugeStore.clearDataCentrifuge();
		}
	},
);

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

onMounted(() => {
	getData();
});
</script>
