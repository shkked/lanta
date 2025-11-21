<template>
	<v-container fluid class="primary d-flex">
		<div class="w-100">
			<v-skeleton-loader v-show="loading" class="border" type="table" />
			<hot-table v-show="!loading" ref="hotTableRef" :settings="hotSettings" :language="language" />
		</div>
	</v-container>
</template>

<script setup>
import { removeFilters, ROLES } from "@/helpers/index.js";
import roleRouteResolver from "@/helpers/roleRouteResolver.js";
import router from "@/router/index.js";
import { HotTable } from "@handsontable/vue3";
import { api } from "@/axios/index.js";
import { nextTick, onMounted, ref } from "vue";
import { useUserStore } from "@/stores/user.store.js";
import { useToastStore } from "@/stores/toast.store.js";

const language = "ru-RU";
const reports = ref([]);
const hotTableRef = ref(null);
const loading = ref(true);

const store = useUserStore();
const toastStore = useToastStore();

const hotSettings = {
	data: [],
	columns: [
		{ type: "text", data: "id", title: "Идентификатор" },
		{ type: "text", data: "acceptedMonth", title: "Отчётный месяц" },
		{ type: "text", data: "acceptedYear", title: "Отчётный год" },
		{
			renderer: (instance, td, row) => {
				const rowData = instance.getSourceDataAtRow(instance.toPhysicalRow(row));
				if (!rowData) return td;

				const isSP = store.User?.role === "СП";
				const id = rowData.id;
				const path = `${rowData.acceptedMonth} ${rowData.acceptedYear}`;

				td.innerHTML = "";
				td.className = "htMiddle";

				const div = document.createElement("div");
				div.className = "d-flex align-center justify-center";

				const button = document.createElement("button");
				button.className = "table_primary_button";
				button.textContent = isSP
					? rowData.isGenerated
						? "Перейти в отчёт"
						: "Сформировать отчёт"
					: "Перейти в отчёт";

				button.addEventListener("click", async () => {
					if (isSP && !rowData.isGenerated) {
						try {
							button.classList.add("loading");
							button.disabled = true;

							await api.post(`/reports/${id}/report-items`);

							rowData.isGenerated = true;
							button.textContent = "Перейти в отчёт";
						} catch (error) {
							console.error("Ошибка формирования отчёта", error);

							if (error.response?.status === 500) {
								rowData.isGenerated = false;
								button.textContent = "Сформировать отчёт";
								const message = error.response?.data?.message || "Неизвестная ошибка";
								toastStore.show("Ошибка!", message, "error", 10000);
							}
						} finally {
							button.classList.remove("loading");
							button.disabled = false;
						}
					} else {
						const route = roleRouteResolver({
							ReportsPeriod: "СП",
							"ReportsPeriod (USP)": [ROLES.USP, ROLES.ANALYST],
						});
						await router.push({
							name: route.name,
							params: { period: path },
							query: { id },
						});
					}
				});

				div.appendChild(button);
				td.appendChild(div);
				return td;
			},
		},
	],
	filters: true,
	readOnly: true,
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
	licenseKey: "non-commercial-and-evaluation",
	afterGetColHeader: removeFilters([3]),
};

async function getReports() {
	try {
		loading.value = true;
		const response = await api.get("/reports");
		reports.value = response.data?.reports;

		await nextTick();
		const hot = hotTableRef.value?.hotInstance;
		if (hot) {
			hot.loadData(reports.value);
		}
	} catch (error) {
		console.error(error);
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	await getReports();
});
</script>
