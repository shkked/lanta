<template>
	<v-container fluid class="primary d-flex">
		<div class="w-100">
			<v-skeleton-loader v-show="loading" class="border" type="table" />
			<hot-table v-show="!loading" ref="hotTableRef" :settings="hotSettings" :language="language" />
		</div>
	</v-container>
</template>

<script setup>
import { HotTable } from "@handsontable/vue3";
import { removeFilters } from "@/helpers/index.js";
import { api } from "@/axios/index.js";
import { useRoute } from "vue-router";
import { nextTick, onMounted, ref } from "vue";

const route = useRoute();
const language = "ru-RU";
const reports_requests = ref([]);
const loading = ref(true);

const hotTableRef = ref(null);

const hotSettings = {
	data: [],
	columns: [
		{ type: "text", data: "orderCode", title: "№ заявки в<br/>IntraService" },
		{ type: "text", data: "reportRequestCategory", title: "Тип<br/>заявки" },
		{
			type: "text",
			data: "href",
			title: "Ссылка на<br/>заявку",
			renderer: (instance, td, row, col, prop, value) => {
				td.innerHTML = `<a href=${value}>Перейти</a>`;

				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
		{ type: "text", data: "client", title: "Клиент" },
		{ type: "text", data: "address", title: "Адрес" },
		{ type: "text", data: "area", title: "Субъект РФ" },
		{
			type: "text",
			data: "plannedCompletionDate",
			dateFormat: "DD-MM-YYYY",
			title: "Контрольная</br>дата согласования</br>Intraservice",
		},
		{
			type: "text",
			data: "actualCompletionDate",
			dateFormat: "DD-MM-YYYY",
			title: "Фактическая</br>дата выполнения</br>заявки",
		},
		{ type: "text", data: "overdueHours", title: "Кол-во</br>часов</br>просрочки" },
		{ type: "text", data: "agreedAmount", title: "Сумма</br>по заявке" },
		{ type: "text", data: "penaltyAmount", title: "Сумма</br>штрафа" },
		{ type: "text", data: "finalAmount", title: "Сумма</br>итого" },
		{ type: "text", data: "penaltyReason", title: "Причина</br>штрафа" },
	],
	filters: true,
	rowHeights: 40,
	autoWrapRow: true,
	autoWrapCol: true,
	dropdownMenu: ["filter_by_condition", "filter_by_value", "filter_action_bar"],
	columnSorting: true,
	manualColumnResize: true,
	manualColumnMove: true,
	width: "100%",
	height: "89vh",
	stretchH: "all",
	readOnly: true,
	licenseKey: "non-commercial-and-evaluation",
	afterGetColHeader: removeFilters([2]),
};

async function loadReportRequests() {
	try {
		loading.value = true;
		const response = await api.get(`/reports/${route.query.reportId}/report-items/${route.query.itemId}/founded`);
		reports_requests.value = response.data["report-items"];

		await nextTick();
		const hot = hotTableRef.value?.hotInstance;
		if (hot) {
			hot.loadData(reports_requests.value);
		}
	} catch (e) {
		console.error("Ошибка при загрузке отчётов:", e);
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	await loadReportRequests();
});
</script>
