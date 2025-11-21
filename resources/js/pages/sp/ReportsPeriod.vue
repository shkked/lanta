<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<v-tabs v-model="store.tab" bg-color="grey-lighten-3" align-tabs="start">
			<v-tab value="incident" class="text-primary">Инцидентные отчёты</v-tab>
			<v-tab value="paged" class="text-primary">Покопийные отчёты</v-tab>
			<v-tab value="subscriber" class="text-primary">Абонентские отчёты</v-tab>
		</v-tabs>

		<v-window v-model="store.tab" class="mt-4">
			<v-window-item value="incident">
				<div class="w-100">
					<hot-table
						v-if="!store.loading && store.tab === 'incident'"
						ref="hotIncidentRef"
						:settings="hotSettings"
						:language="language"
					/>
					<v-skeleton-loader v-else class="border" type="table" />
				</div>
			</v-window-item>

			<v-window-item value="paged">
				<div class="w-100">
					<hot-table
						v-if="!store.loading && store.tab === 'paged'"
						ref="hotPagedRef"
						:settings="hotSettings"
						:language="language"
					/>
					<v-skeleton-loader v-else class="border" type="table" />
				</div>
			</v-window-item>

			<v-window-item value="subscriber">
				<div class="w-100">
					<hot-table
						v-if="!store.loading && store.tab === 'subscriber'"
						ref="hotSubscriberRef"
						:settings="hotSettings"
						:language="language"
					/>
					<v-skeleton-loader v-else class="border" type="table" />
				</div>
			</v-window-item>
		</v-window>
	</v-container>
</template>

<script setup>
import { CalendarRussian, removeFilters } from "@/helpers";
import router from "@/router/index.js";
import { HotTable } from "@handsontable/vue3";
import { computed, nextTick, onMounted, ref } from "vue";
import { useReportsStore } from "@/stores/reports_period.store.js";
import { useRoute } from "vue-router";

const language = "ru-RU";

const store = useReportsStore();
const route = useRoute();

const hotIncidentRef = ref(null);
const hotPagedRef = ref(null);
const hotSubscriberRef = ref(null);

const hotSettings = computed(() => ({
	data: store.currentTabData,
	rowHeights: 50,
	columns: [
		{ type: "text", data: "id", title: "ID" },
		{
			title: "Отправить на</br>проверку",
			renderer: (instance, td, row) => {
				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				td.className = "htMiddle";
				td.innerHTML = "";

				const button = document.createElement("button");
				button.className = "table_send_button";
				button.innerHTML = "Отправить";
				button.disabled = rowData.rules?.file === false;

				button.addEventListener("click", async () => {
					if (button.disabled) return;

					button.classList.add("loading");
					button.disabled = true;
					const fileInput = instance.rootElement.querySelectorAll(".table_input_file")[row];
					await store.sendReport(rowData, fileInput);

					button.classList.remove("loading");
					button.disabled = rowData.rules?.file === false;

					instance.render();
				});

				td.appendChild(button);

				td.appendChild(button);
				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
		{
			title: "Загрузка документов",
			renderer: (instance, td, row) => {
				const physicalRowIndex = instance.toPhysicalRow(row);
				const rowData = instance.getSourceData()[physicalRowIndex];
				if (!rowData) return td;

				const isDisabled = rowData.rules?.file === false;
				const containerClass = !isDisabled
					? "table_input_container_not_loaded"
					: "table_input_container_loaded";

				td.className = "htMiddle";

				if (td.__fileInput) return td;

				td.innerHTML = "";

				const wrapper = document.createElement("div");
				wrapper.className = containerClass;

				const input = document.createElement("input");
				input.type = "file";
				input.className = "table_input_file";
				input.multiple = true;
				input.disabled = isDisabled;

				input.addEventListener("change", (e) => {
					rowData.files = Array.from(e.target.files);
				});

				wrapper.appendChild(input);
				td.appendChild(wrapper);

				td.__fileInput = input;

				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
		{
			type: "text",
			data: "orderCode",
			title: "Номер</br>счёта",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);
				td.innerHTML = value || "";
				cellProperties.readOnly = rowData.rules?.orderCode === false;

				return td;
			},
		},
		{
			type: "text",
			data: "finalAmount",
			title: "Сумма</br>счёта",
			validator: (value, callback) => {
				const normalized = String(value).replace(",", ".");
				const isValid = normalized === "" || !isNaN(Number(normalized));
				callback(isValid);
			},
			allowInvalid: false,
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);
				td.innerHTML = value || "";
				cellProperties.readOnly = rowData.rules?.finalAmount === false;
				return td;
			},
		},

		{
			type: "date",
			data: "dateReport",
			title: "Дата</br>счёта",
			dateFormat: "DD-MM-YYYY",
			correctFormat: true,
			datePickerConfig: {
				i18n: CalendarRussian.i18n,
				firstDay: CalendarRussian.i18n.firstDay,
			},
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);
				td.innerHTML = value || "";
				cellProperties.readOnly = rowData.rules?.dateReport === false;

				return td;
			},
		},
		{ type: "text", data: "client", title: "Клиент" },
		{ type: "text", data: "area", title: "Регион" },
		{ type: "date", data: "dateFact", title: "Дата офор. отчета<br/>на портале", dateFormat: "DD-MM-YYYY" },
		{
			type: "date",
			data: "datePay",
			title: "План. дата<br/>оплаты",
			dateFormat: "DD-MM-YYYY",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);
				td.innerHTML = value || "";
				cellProperties.readOnly = rowData.rules?.datePay === false;

				return td;
			},
		},
		{ type: "text", data: "reportStatus", title: "Статус" },
		{
			title: "Основан",
			renderer: (instance, td, row) => {
				const rowData = instance.getSourceDataAtRow(row);
				const id = rowData.id;
				const link = document.createElement("a");
				link.className = "text-decoration-underline cursor-pointer";
				link.textContent = "Перейти";
				link.addEventListener("click", () => {
					router.push({ name: "ReportRequests", query: { itemId: id, reportId: route.query.id } });
				});
				td.innerHTML = "";
				td.appendChild(link);
				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
		{ type: "text", data: "usp", title: "Ответственный" },
		{
			type: "text",
			data: "comment",
			title: "Комментарий",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);
				td.innerHTML = value || "";
				cellProperties.readOnly = rowData.rules?.comment === false;

				return td;
			},
		},
	],
	filters: true,
	dropdownMenu: ["filter_by_condition", "filter_by_value", "filter_action_bar"],
	columnSorting: true,
	manualColumnResize: true,
	manualColumnMove: true,
	width: "100%",
	height: "83vh",
	stretchH: "all",
	readOnly: true,
	licenseKey: "non-commercial-and-evaluation",
	afterGetColHeader: removeFilters([1, 2, 12]),
	afterChange: async (changes, source) => {
		if (source !== "edit") return;

		for (const [row, prop, oldValue, newValue] of changes) {
			if (oldValue === newValue) continue;

			if (prop === "orderCode") {
				await store.updateOrderCode(row, newValue);
			}

			if (prop === "finalAmount") {
				await store.updateFinalAmount(row, newValue);
			}

			if (prop === "dateReport") {
				await store.updateDateReport(row, newValue);
			}

			if (prop === "datePay") {
				await store.updateDatePay(row, newValue);
			}
		}
	},
}));

onMounted(async () => {
	await store.loadReports(route.query.id);
	await nextTick();
});
</script>
