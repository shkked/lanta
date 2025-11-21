<template>
	<div class="d-flex align-center" style="display: none !important">
		<v-menu
			ref="menuRef"
			v-model="isMenu"
			attach="body"
			max-height="300px"
			class="overflow-auto"
			:close-on-content-click="false"
			offset-y
			:activator="props.activator"
			location="bottom"
			origin="top"
			transition="scale-transition"
		>
			<v-card max-width="300px" min-width="250px" color="white">
				<v-combobox
					ref="comboElem"
					v-model="localValue"
					:items="itemsData"
					:no-filter="true"
					:hide-no-data="false"
					item-title="name"
					item-value="id"
					variant="outlined"
					placeholder="Введите название модели"
					no-data-text="Не найдено"
					required
					@keydown.enter="fetchData(localValue.value)"
					@blur="onUpdateData"
				>
					<template #append-inner>
						<v-progress-circular
							v-if="isSearchLoading"
							indeterminate
							size="24"
							color="primary"
						></v-progress-circular>
					</template>
				</v-combobox>
				<v-card-actions class="justify-end">
					<!-- <v-btn :disabled="!localValue" text @click="reset">Сбросить</v-btn> -->
					<v-btn :disabled="!localValue" text @click="apply">Применить</v-btn>
				</v-card-actions>
			</v-card>
		</v-menu>
	</div>
</template>

<script setup>
import { api } from "@/axios";
import { debounce } from "lodash";
import { ref, watch } from "vue";

const props = defineProps({
	activator: {
		type: Object,
		default: null,
	},
	billingItemId: {
		type: Number,
		default: null,
	},
});
const itemsData = ref([]);
const localValue = ref(null);
const isMenu = ref(false);
const menuRef = ref(null);
const emit = defineEmits(["apply", "clear"]);
const isSearchLoading = ref(false);
const comboElem = ref(null);
const openMenu = () => {
	isMenu.value = true;
};
const closeMenu = () => {
	isMenu.value = false;
};

const apply = () => {
	emit("apply", { value: localValue.value, id: props.billingItemId });
	isMenu.value = false;
};
watch(
	() => isMenu.value,
	(val) => {
		if (!val) {
			localValue.value = null;
		}
	},
);
// watch(
// 	() => props.activator,
// 	() => {
// 		console.log(props.activator);
// 	},
// );

// const uniqueItems = computed(() => {
// 	const seen = new Set();
// 	return itemsData.value.filter((item) => {
// 		if (seen.has(item.Id)) return false;
// 		seen.add(item.Id);
// 		return true;
// 	});
// });

const onUpdateData = (e) => {
	const value = e.target.value;

	if (value && typeof value == "object") {
		if (!itemsData.value.some((e) => e.id === value.id)) {
			localValue.value = null;
			return;
		}
	} else {
		if (value && !itemsData.value.some((e) => e.name === value)) {
			localValue.value = null;
			return;
		}
	}
};
const fetchData = debounce(async (val) => {
	try {
		// console.log(val);
		if (val == null) {
			itemsData.value = [];
			return;
		}
		const params = {};
		if (typeof val == "string") {
			if (!val || val.trim() === "") {
				itemsData.value = [];
				return;
			}
			params.search = val;
		} else {
			return;
		}
		isSearchLoading.value = true;
		const response = await api.get("/billings/search/printer-models", { params });
		itemsData.value = response.data.data.printerModels;
		comboElem.value.menu = true;
	} catch (e) {
		console.error(e);
	} finally {
		isSearchLoading.value = false;
	}
}, 1000);

watch(
	() => localValue.value,
	(val) => fetchData(val),
);

defineExpose({ openMenu, closeMenu });
</script>
