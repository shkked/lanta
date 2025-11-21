<template>
	<v-container fluid class="primary d-flex flex-column ga-4">
		<div class="d-flex justify-space-between align-center bg-grey-lighten-2 w-100 pa-5 rounded">
			<div class="d-flex ga-5">
				<v-chip variant="outlined" color="primary" label>СП/487</v-chip>
				<v-chip variant="outlined" color="primary" label>СЦ/13</v-chip>
				<v-chip variant="outlined" color="primary" label>ОТС/1</v-chip>
			</div>
			<v-dialog v-model="editUserDialog" max-width="800">
				<template #activator="{ props: activatorProps }">
					<v-btn
						v-bind="activatorProps"
						color="primary"
						text="Добавить СП"
						variant="flat"
						prepend-icon="mdi mdi-plus"
						@click="openDialog('add')"
					></v-btn>
				</template>

				<template #default="{ isActive }">
					<v-card>
						<v-card-title class="py-2 pt-4 pb-0">
							<div class="d-flex justify-space-between align-center">
								<div class="d-flex">
									<v-icon
										:icon="
											dialogActionMode === 'add'
												? 'mdi mdi-account-multiple-plus-outline'
												: 'mdi mdi-file-edit-outline'
										"
									></v-icon>
									<p class="text-h6 ml-2">
										{{
											dialogActionMode === "add"
												? "Форма добавления сервисного партнера"
												: "Форма редактирования сервисного партнера"
										}}
									</p>
								</div>
								<v-btn icon="mdi-close" variant="flat" @click="isActive.value = false" />
							</div>
						</v-card-title>

						<v-card-text>
							<v-form v-model="valid" class="pt-5" @submit.prevent="submit">
								<v-row>
									<v-col cols="12" class="pa-1">
										<v-text-field
											v-model="formData.inn"
											name="inn"
											:rules="rules"
											label="ИНН"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" class="pa-1">
										<v-text-field
											v-model="formData.name"
											name="name"
											:rules="rules"
											label="Наименование в Intraservice"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" class="pa-1">
										<v-text-field
											v-model="formData.director"
											name="director"
											:rules="rules"
											label="Руководитель"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" sm="6" class="pa-1">
										<v-text-field
											v-model="formData.director_phone"
											name="director_phone"
											:rules="rules"
											label="Номер телефона руководителя"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" sm="6" class="pa-1">
										<v-text-field
											v-model="formData.director_email"
											name="director_email"
											:rules="rules"
											label="Email руководителя"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" class="pa-1">
										<v-text-field
											v-model="formData.manager"
											name="manager"
											label="Менеджер"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" sm="6" class="pa-1">
										<v-text-field
											v-model="formData.manager_phone"
											name="manager_phone"
											label="Номер телефона менеджера"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" sm="6" class="pa-1">
										<v-text-field
											v-model="formData.manager_email"
											name="manager_email"
											label="Email менеджера"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" class="pa-1">
										<v-text-field
											v-model="formData.accountant"
											name="accountant"
											label="Бухгалтер"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" sm="6" class="pa-1">
										<v-text-field
											v-model="formData.accountant_phone"
											name="accountant_phone"
											label="Номер телефона бухгалтера"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" sm="6" class="pa-1">
										<v-text-field
											v-model="formData.accountant_email"
											name="accountant_email"
											label="Email бухгалтера"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" class="pa-1">
										<v-text-field
											v-model="formData.additional_contact"
											name="additional_contact"
											:rules="rules"
											label="Дополнительный контакт"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" class="pa-1">
										<v-text-field
											v-model="formData.requests_contact"
											name="requests_contact"
											label="Контакт для заявок"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" class="pa-1">
										<v-text-field
											v-model="formData.juridical_address"
											name="juridical_address"
											:rules="rules"
											label="Юридический адрес"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" class="pa-1">
										<v-text-field
											v-model="formData.postal_address"
											name="postal_address"
											:rules="rules"
											label="Почтовый адрес"
											variant="outlined"
											color="primary"
											density="compact"
										></v-text-field>
									</v-col>
									<v-col cols="12" class="pa-1">
										<v-select
											v-model="formData.category"
											label="Категория"
											:items="['СП', 'СЦ', 'ОТС']"
											:rules="rules"
											variant="outlined"
											color="primary"
											density="compact"
										></v-select>
									</v-col>
									<v-col cols="12" class="pa-1">
										<v-textarea
											v-model="formData.note"
											name="note"
											label="Примечание"
											variant="outlined"
											color="primary"
										></v-textarea>
									</v-col>
									<v-col cols="12" sm="6" class="pa-1 d-flex">
										<p class="mr-2 text-no-wrap">Работа в ЭДО:</p>
										<v-radio-group v-model="formData.edo" :rules="rules" inline>
											<v-radio
												label="Да"
												value="true"
												color="primary"
												density="compact"
												class="mr-2"
											></v-radio>
											<v-radio
												label="Нет"
												value="false"
												color="primary"
												density="compact"
											></v-radio>
										</v-radio-group>
									</v-col>
									<v-col cols="12" sm="6" class="pa-1 d-flex">
										<p class="mr-2">C НДС:</p>
										<v-radio-group v-model="formData.nds" :rules="rules" inline>
											<v-radio
												label="Да"
												value="true"
												color="primary"
												density="compact"
												class="mr-2"
											></v-radio>
											<v-radio
												label="Нет"
												value="false"
												color="primary"
												density="compact"
											></v-radio>
										</v-radio-group>
									</v-col>
									<v-col cols="12" sm="6" class="pa-0">
										<v-checkbox
											v-model="formData.special_conditions"
											label="Специальные условия"
											color="primary"
											hide-details
										></v-checkbox>
									</v-col>
									<v-col cols="12" sm="6" class="pa-0">
										<v-checkbox
											v-model="formData.archived"
											label="В архиве"
											color="primary"
											hide-details
										></v-checkbox>
									</v-col>
								</v-row>
								<v-divider class="mt-3"></v-divider>

								<v-card-actions class="py-5">
									<v-spacer></v-spacer>
									<v-btn color="primary" class="px-4" @click="isActive.value = false">Отмена</v-btn>
									<v-btn
										class="bg-primary px-4"
										type="submit"
										:disabled="!valid"
										@click="isActive.value = false"
									>
										{{ dialogActionMode === "add" ? "Добавить СП" : "Редактировать" }}
									</v-btn>
								</v-card-actions>
							</v-form>
						</v-card-text>
					</v-card>
				</template>
			</v-dialog>
		</div>
		<div class="w-100">
			<hot-table :settings="hotSettings" :language="language"></hot-table>
		</div>
	</v-container>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { HotTable } from "@handsontable/vue3";
import { VBtn } from "vuetify/components";
import { api } from "@/axios";
import { useToastStore } from "@/stores/toast.store.js";

const valid = ref(false);
const rules = [(v) => !!v || "Поле обязательно для заполнения"];
const editUserDialog = ref(false);
const dialogActionMode = ref("");
const formData = ref({
	inn: "",
	name: "",
	director: "",
	director_phone: "",
	director_email: "",
	manager: "",
	manager_phone: "",
	manager_email: "",
	accountant: "",
	accountant_phone: "",
	accountant_email: "",
	additional_contact: "",
	requests_contact: "",
	juridical_address: "",
	postal_address: "",
	category: "",
	note: "",
	edo: "",
	nds: "",
	special_conditions: false,
	archived: false,
});
const language = "ru-RU";
const toastStore = useToastStore();

const data = [
	{ id: 1, name: "Абак OOO", inn: "123456789", role: "СП" },
	{ id: 2, name: "Агафонов Алексей Сергеевич ИП", inn: "987654321", role: "СП" },
	{ id: 3, name: "АИБ Сервис ООО", inn: "456789123", role: "СП" },
	{ id: 4, name: "Айти Вершина ООО", inn: "123456789", role: "Аналитик" },
	{ id: 5, name: "АйТи Экспресс ООО", inn: "987654321", role: "СП" },
	{ id: 6, name: "Айтимс ООО", inn: "456789123", role: "СП" },
	{ id: 7, name: "Алеон ООО", inn: "123456789", role: "СП" },
	{ id: 8, name: "Алеф Студио ООО", inn: "987654321", role: "УСП" },
	{ id: 9, name: "Алиф ООО", inn: "456789123", role: "СП" },
	{ id: 10, name: "Алта-Профи ООО", inn: "123456789", role: "Аналитик" },
	{ id: 11, name: "Алыков Рустам Чафарович ИП", inn: "987654321", role: "УСП" },
	{ id: 12, name: "Альком Сервис ООО", inn: "456789123", role: "Аналитик" },
	{ id: 13, name: "Баккон ООО", inn: "123456789", role: "СП" },
	{ id: 14, name: "Балакшей Владимир Павлович ИП", inn: "987654321", role: "СП" },
	{ id: 15, name: "Балухин Сергей Анатольевич (ГПХ)", inn: "456789123", role: "СП" },
	{ id: 16, name: "Бардин Анатолий Константинович ИП", inn: "123456789", role: "Аналитик" },
	{ id: 17, name: "Батченко Анастасия Гаптулгалимовна (ОТС)", inn: "987654321", role: "СП" },
	{ id: 18, name: "Берсенев Александр Валерьевич ИП", inn: "456789123", role: "СП" },
	{ id: 19, name: "БИС ООО", inn: "123456789", role: "СП" },
	{ id: 20, name: "Битрум ООО", inn: "987654321", role: "УСП" },
	{ id: 21, name: "Боталов Денис Леонидович (ОТС)", inn: "456789123", role: "СП" },
	{ id: 22, name: "Браудо Евгений Игоревич (ОТС)", inn: "123456789", role: "Аналитик" },
	{ id: 23, name: "Брянцев Игорь Юрьевич ИП", inn: "987654321", role: "УСП" },
	{ id: 24, name: "Будников Вадим Александрович ИП", inn: "456789123", role: "Аналитик" },
];

const hotSettings = ref({
	data,
	rowHeights: 40,
	columns: [
		{ type: "numeric", data: "id", title: "ID" },
		{ type: "text", data: "name", title: "Имя" },
		{ type: "text", data: "inn", title: "ИНН" },
		{ type: "text", data: "role", title: "Роль" },
		{
			title: "Редактировать",
			renderer: (instance, td) => {
				td.className = "htMiddle";
				td.innerHTML = "";

				const button = document.createElement("button");
				button.textContent = "Редактировать";
				button.classList.add("table_outlined_button");
				button.addEventListener("click", () => {
					editUserDialog.value = true;
					openDialog("edit");
				});
				td.appendChild(button);
				return td;
			},
			columnSorting: {
				headerAction: false,
			},
		},
	],
	filters: true,
	dropdownMenu: ["filter_by_condition", "filter_by_value", "filter_action_bar"],
	manualColumnResize: true,
	manualColumnMove: true,
	columnSorting: true,
	width: "100%",
	height: "80vh",
	stretchH: "all",
	className: "htLeft",
	readOnly: true,
	licenseKey: "non-commercial-and-evaluation",
	afterGetColHeader(col, TH) {
		if (col === this.countCols() - 1) {
			const button = TH.querySelector(".changeType");
			if (button) {
				button.parentElement.removeChild(button);
			}
		}
	},
});

async function getUsers() {
	const response = await api.get("/users");
	console.log(response);
}

async function submit() {
	try {
		// await axios.post("http://lantaservice/profile", formData.value);
		console.log("Form data:", formData.value);
		toastStore.show("Успех", "Сервисный партнер добавлен", "success");
	} catch (error) {
		console.error("Error adding partner:", error.message);
		toastStore.show("Ошибка", "Попробуйте позже", "error");
		throw error;
	}
}
function openDialog(mode) {
	dialogActionMode.value = mode;
}

onMounted(() => {
	getUsers();
});
</script>
