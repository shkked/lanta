<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<div class="d-flex flex-column w-100 ga-5">
			<v-form
				ref="form"
				class="d-flex w-100 flex-column flex-nowrap ga-5 border-sm rounded pa-5"
				@submit.prevent="putData"
			>
				<v-file-input
					ref="fileInput"
					v-model="formData.excel"
					:rules="[(v) => (v && v.length ? true : 'Необходимо загрузить файл')]"
					required
					accept=".xlsx"
					label="Выберите файл"
					variant="outlined"
					density="compact"
					color="primary"
					class="w-50"
				></v-file-input>
				<div class="w-50">
					<h3 class="text-h6 w-100 mb-5">Отчетный месяц:</h3>
					<vue-date-picker
						v-model="formData.date"
						:format="'yyyy-MM'"
						:enable-timezone="'local'"
						required
						locale="ru"
						cancel-text="Отмена"
						select-text="Выбрать"
						month-picker
						input-class-name="picker_input"
						menu-class-name="picker_menu"
						:class="{ 'error-border': errorsDate.date }"
					/>
					<transition name="fade">
						<div v-if="errorsDate.date" class="v-input__details px-4">
							<div class="v-messages__message v-messages errorDate">{{ errorsDate.date }}</div>
						</div>
					</transition>
				</div>
				<div class="w-25">
					<v-btn type="submit" color="primary" size="large" variant="flat"> Отправить </v-btn>
				</div>
			</v-form>
		</div>
		<div class="w-100 mt-5">
			<h3 class="text-h6 mb-5">Последние загруженные SLA</h3>
			<v-skeleton-loader v-if="loading" class="border" type="table"> </v-skeleton-loader>
			<hot-table
				v-show="!loading"
				ref="hotTableComponentRef"
				class="border"
				:settings="hotSettings"
				:language="language"
			>
			</hot-table>
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
import { isSameOrder, loadColumnsData, paintRow, removeFilters, setColumnsOrder, setColumnsWidth } from "@/helpers";
import router from "@/router";
import { HotTable } from "@handsontable/vue3";
import VueDatePicker from "@vuepic/vue-datepicker";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";

const form = ref(null);
const language = "ru-RU";
const loading = ref(true);

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

const formData = reactive({
	excel: [],
	date: {
		month: new Date().getMonth(),
		year: new Date().getFullYear(),
	},
});
const data = ref([]);
const fileInput = ref(null);
const hotTableComponentRef = ref(null);

const hotSettings = {
	data: data.value,
	rowHeights: 40,
	columns: [
		{ type: "text", data: "userName", title: "СП" },
		{ type: "text", data: "month", title: "Отчётный<br/>месяц" },
		{ type: "text", data: "year", title: "Отчётный<br/>год" },
		{ type: "text", data: "completedOnTime", title: "В срок", columnSorting: { headerAction: false } },
		{ type: "text", data: "totalCompleted", title: "Всего", columnSorting: { headerAction: false } },
		{ type: "text", data: "overdueInProgress", title: "Просроченных", columnSorting: { headerAction: false } },
		{ type: "text", data: "serviceQuality", title: "Качество", columnSorting: { headerAction: false } },
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

		const savedOrder = JSON.parse(localStorage.getItem("columnsOrderCheckSLA"));

		// Если порядок совпадает с сохранённым — это инициализация, не сохраняем
		if (isSameOrder(Array.from(currentOrder), savedOrder)) return;
		// console.log({ currentOrder: Array.from(currentOrder), savedOrder });

		setColumnsOrder("CheckSLA", hot);
		setColumnsWidth("CheckSLA", hot);
	},
	// Сохранение размеров после перемещения
	manualColumnResize: true,
	afterColumnResize: (newSize, column, isDoubleClick) => {
		if (newSize) {
			setColumnsOrder("CheckSLA", hotTableComponentRef.value.hotInstance);
			setColumnsWidth("CheckSLA", hotTableComponentRef.value.hotInstance);
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
	afterGetColHeader: removeFilters(9),
};
const rules = reactive({
	requiredDate: (v) => (v && v.month ? true : false),
});

const errorsDate = computed(() => {
	if (!rules.requiredDate(formData.date)) return { date: "Дата обязательна" };
	return { date: null };
});
const getData = async (page) => {
	try {
		let link;
		if (page) {
			link = `/slas?page=${page}`;
		} else {
			link = `/slas`;
		}

		const responseData = await api.get(link);
		data.value = responseData.data.data.slas;
		pageLinks.value = responseData.data.links;
		itemsOnPage.value = responseData.data.meta.per_page;
		totalItems.value = responseData.data.meta.total;
		pager.value = responseData.data.meta.current_page;

		loading.value = false;
		await nextTick();

		const hot = hotTableComponentRef?.value?.hotInstance;
		if (hot) {
			hot.loadData(data.value);
			// Загрузка данных из локального хранилища
			loadColumnsData("CheckSLA", hot);
		}
	} catch (error) {
		console.log(error);
	}
};
const putData = async () => {
	try {
		const valid = ref(false);
		await form.value.validate().then((res) => {
			if (formData?.date?.month) {
				valid.value = res.valid;
			} else {
				valid.value = false;
			}
		});
		if (!valid.value) return;

		const dataInput = fileInput.value.files;
		const validDate = `${formData.date.year}-${formData.date.month + 1}`;
		const responseData = await api.post(
			"/slas",
			{
				excel: dataInput[0],
				date: validDate,
			},
			{
				headers: {
					"Content-Type": "multipart/form-data",
				},
			},
		);
		console.log(responseData);

		// hotTableComponentRef.value.hotInstance.loadData(data.value);
	} catch (error) {
		console.log(error);
	}
};
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

<style>
.error-border {
	border: 1px solid rgb(176, 0, 32) !important;
	border-radius: 4px;
	.picker_input {
		border: unset !important;
	}
	.dp__icon {
		fill: rgb(176, 0, 32);
	}
}
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease-in-out;
}
.fade-enter,
.fade-leave-to {
	opacity: 0;
}

.errorDate {
	color: rgb(176, 0, 32);
	font-size: 12px;
	opacity: 1 !important;
	margin-top: 4px;
}
</style>
