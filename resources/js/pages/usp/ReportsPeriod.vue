<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<v-tabs v-model="store.tab" bg-color="grey-lighten-3" align-tabs="start">
			<v-tab value="incident" class="text-primary">Инцидентные отчёты</v-tab>
			<v-tab value="paged" class="text-primary">Покопийные отчёты</v-tab>
			<v-tab value="subscriber" class="text-primary">Абонентские отчёты</v-tab>
		</v-tabs>
		<div style="position: relative; height: 100%">
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
		</div>
	</v-container>
	<v-overlay :model-value="store.isUpdatingTable" contained class="align-center justify-center">
		<v-progress-circular indeterminate size="64" color="primary" />
	</v-overlay>
</template>

<script setup>
import { removeFilters } from "@/helpers";
import router from "@/router/index.js";
import { useReportsStore } from "@/stores/reports_period.store.js";
import { HotTable } from "@handsontable/vue3";
import { computed, nextTick, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

const language = "ru-RU";
const route = useRoute();

const hotIncidentRef = ref(null);
const hotPagedRef = ref(null);
const hotSubscriberRef = ref(null);

const store = useReportsStore();

const hotSettings = computed(() => ({
	data: store.currentTabData,
	rowHeights: 50,
	columns: [
		{ type: "text", data: "id", title: "ID", width: "60" },
		{
			title: "Скачать</br>документы",
			renderer: (instance, td, row) => {
				td.className = "htMiddle";
				td.innerHTML = "";

				const rowData = instance.getSourceDataAtRow(row);
				const itemId = rowData.id;

				const button = document.createElement("button");
				button.className = "table_download_button";
				button.textContent = "Скачать";

				if (rowData.rules?.downloadFiles === false) {
					button.disabled = true;
				} else {
					button.addEventListener("click", async () => {
						button.disabled = true;
						button.classList.add("loading");
						await store.downloadDocuments(itemId);
						button.classList.remove("loading");
						button.disabled = false;
					});
				}
				td.appendChild(button);
				return td;
			},
			columnSorting: {
				headerAction: false,
			},
			className: "htLeft htMiddle",
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
			type: "date",
			data: "dateReport",
			title: "Дата</br>счёта",
			dateFormat: "DD-MM-YYYY",
			width: "100",
			strict: false,
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);
				td.innerHTML = value || "";
				cellProperties.readOnly = rowData.rules?.dateReport === false;

				return td;
			},
		},
		{
			data: "finalAmount",
			title: "Сумма</br>счёта",
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);
				td.innerHTML = value || "";
				cellProperties.readOnly = rowData.rules?.finalAmount === false;

				return td;
			},
		},

		{ type: "text", data: "user", title: "Наименование</br>СП" },
		{ type: "text", data: "client", title: "Клиент" },
		{ type: "text", data: "area", title: "Регион" },
		{
			type: "date",
			data: "dateFact",
			title: "Дата офор.<br/>отчета<br/>на портале",
			dateFormat: "DD-MM-YYYY",
			width: "120",
		},
		{
			type: "date",
			data: "datePay",
			title: "План. дата<br/>оплаты",
			dateFormat: "DD-MM-YYYY",
			width: "100",
			strict: false,
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);
				td.innerHTML = value || "";
				cellProperties.readOnly = rowData.rules?.datePay === false;

				return td;
			},
		},
		// { type: "text", data: "reportStatus", title: "Статус" },
		{
			title: "Основан",
			width: "80",
			renderer: (instance, td, row) => {
				const rowData = instance.getSourceDataAtRow(row);
				const id = rowData.id;

				const link = document.createElement("a");
				link.className = "text-decoration-underline cursor-pointer";
				link.textContent = "Перейти";
				link.addEventListener("click", () => {
					router.push({ name: "ReportRequests (USP)", query: { itemId: id, reportId: route.query.id } });
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
			title: "Выбор<br/>статуса",
			data: "reportStatus",
			type: "dropdown",
			allowInvalid: false,
			source: function (query, process) {
				const rowIndex = this.row;
				const rowData = store.currentTabData[rowIndex];
				process(rowData.statusOptions || []);
			},
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);
				cellProperties.readOnly = rowData.rules?.reportStatus === false;

				td.innerHTML = "";

				const span = document.createElement("span");
				span.textContent = value || "";
				td.appendChild(span);

				if (rowData.rules?.reportStatus === false) {
					cellProperties.readOnly = true;
					return td;
				}

				const btn = document.createElement("button");
				btn.textContent = "▼";
				btn.classList.add("selectStatus");

				td.appendChild(btn);

				return td;
			},
		},
		{
			title: "Выбор<br/>ответственного",
			type: "dropdown",
			data: "usp",
			allowInvalid: false,
			source: (_, process) => {
				process(store.uspList.map((u) => u.name));
			},
			strict: false,
			renderer: (instance, td, row, col, prop, value, cellProperties) => {
				const rowData = instance.getSourceDataAtRow(row);
				td.innerHTML = value || "";
				cellProperties.readOnly = rowData.rules?.uspList === false;

				return td;
			},
		},
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
	height: "75vh",
	stretchH: "all",
	readOnly: true,
	licenseKey: "non-commercial-and-evaluation",
	afterGetColHeader: removeFilters([1, 11]),
	afterOnCellMouseDown: function (event, coords, td) {
		const col = coords.col;
		const row = coords.row;
		const prop = this.getSettings().columns?.[col]?.data;

		if (prop !== "reportStatus") return;

		const options = store.currentTabData[row]?.statusOptions || [];
		const optionHeight = 35;
		const calculatedHeight = Math.min(options.length * optionHeight, 210);

		const observer = new MutationObserver(() => {
			const dropdown = document.querySelector(".handsontableEditor.autocompleteEditor.listbox");

			if (dropdown) {
				observer.disconnect();

				setTimeout(() => {
					dropdown.style.height = `${calculatedHeight}px`;
					dropdown.style.maxHeight = `${calculatedHeight}px`;
				}, 50);
			}
		});

		observer.observe(document.body, { childList: true, subtree: true });
	},
	afterChange: async (changes, source) => {
		if (source !== "edit" || !changes) return;

		const cells = document.querySelectorAll(".htInvalid");
		cells.forEach((cell) => cell.classList.remove("htInvalid"));

		for (const [row, prop, oldValue, newValue] of changes) {
			if (oldValue === newValue) continue;

			if (prop === "reportStatus") {
				const result = await store.updateStatus(row, newValue, oldValue);

				if (!result) {
					store.currentTabData[row].reportStatus = oldValue;
				}
			}

			if (prop === "usp") {
				await store.updateUsp(row, newValue);
			}

			if (prop === "orderCode") {
				await store.updateOrderCode(row, newValue);
			}

			if (prop === "dateReport") {
				await store.updateDateReport(row, newValue);
			}

			if (prop === "datePay") {
				await store.updateDatePay(row, newValue);
			}

			if (prop === "finalAmount") {
				await store.updateFinalAmount(row, newValue);
			}

			if (prop === "comment") {
				await store.sendComment(row, newValue);
			}
		}
	},
}));

onMounted(async () => {
	await store.loadReports(route.query.id);
	await nextTick();
});
</script>
