<template>
	<div class="d-flex align-center" style="display: none !important">
		<v-menu
			v-model="isFilterMenu"
			max-height="300"
			max-width="250"
			:close-on-content-click="false"
			offset-y
			:activator="props.activator"
			location="bottom"
			origin="top"
			transition="scale-transition"
		>
			<v-card class="w-100" @keydown.enter="localValue.length ? applyFilter() : null">
				<div class="d-flex flex-column pa-2 align-end ga-2">
					<v-btn icon="mdi-close" variant="text" density="compact" size="x-small" @click="closeFilter" />
					<v-text-field
						v-model="search"
						placeholder="Поиск..."
						density="compact"
						variant="outlined"
						hide-details
						prepend-inner-icon="mdi-magnify"
						class="w-100"
					/>
				</div>

				<v-divider></v-divider>
				<v-list class="pa-2" density="compact" max-height="160px">
					<v-list-item
						v-for="item in filteredItems"
						:key="itemKey(item)"
						ripple
						class="pa-0 ma-0"
						select-strategy="leaf"
						@click="toggleItem(item.value)"
					>
						<template #prepend>
							<v-checkbox
								:model-value="isItemSelected(item.value)"
								color="primary"
								hide-details
								density="compact"
								class="ma-0"
								@click.stop="toggleItem(item.value)"
							/>
						</template>
						<v-list-item-title class="text-caption">{{ item.label }}</v-list-item-title>
					</v-list-item>

					<v-list-item v-if="!filteredItems.length" disabled>
						<v-list-item-title class="text-caption text-disabled">Ничего не найдено</v-list-item-title>
					</v-list-item>
				</v-list>

				<v-card-actions class="justify-end pa-2" @keydown.enter="localValue.length ? applyFilter() : null">
					<v-btn :disabled="!localValue.length" color="primary" @click="applyFilter">Применить</v-btn>
					<v-btn :disabled="!localValue.length" @click="resetFilter">Сбросить</v-btn>
				</v-card-actions>
			</v-card>
		</v-menu>
	</div>
</template>

<script setup>
import { ref, computed, watch } from "vue";

const props = defineProps({
	items: {
		type: Array,
		default: () => [],
	},
	modelValue: {
		type: Array,
		default: () => [],
	},
	activator: {
		type: Object,
		default: null,
	},
});

const emit = defineEmits(["update:modelValue", "apply", "clear"]);

const isFilterMenu = ref(false);
const localValue = ref([...props.modelValue]);
const search = ref("");

const normalizedItems = computed(() =>
	props.items.map((item) => {
		if (item && typeof item === "object") {
			const labelKey = Object.keys(item).find((k) => typeof item[k] === "string" || typeof item[k] === "number");
			const valueKey = Object.keys(item).find((k) => k !== labelKey);

			let rawLabel = labelKey ? item[labelKey] : JSON.stringify(item);
			const label = rawLabel === "" ? "Пустое значение" : String(rawLabel);

			return {
				label,
				value: valueKey ? item[valueKey] : item,
			};
		}

		const label = item === "" ? "Пустое значение" : String(item);
		return {
			label,
			value: item,
		};
	}),
);

const itemKey = (item) => {
	if (typeof item.value === "string" || typeof item.value === "number") return item.value;
	return JSON.stringify(item.value);
};

const filteredItems = computed(() => {
	if (!search.value.trim()) return normalizedItems.value;
	const q = search.value.toLowerCase();
	return normalizedItems.value.filter((item) => item.label.toLowerCase().startsWith(q));
});

// Проверяем, выбран ли элемент (сравниваем строковое представление)
const isItemSelected = (val) => localValue.value.some((v) => String(v) === String(val));

const toggleItem = (val) => {
	const index = localValue.value.findIndex((v) => String(v) === String(val));
	if (index === -1) {
		localValue.value.push(val);
	} else {
		localValue.value.splice(index, 1);
	}
};

const applyFilter = () => {
	emit("apply", localValue.value);
	isFilterMenu.value = false;
};

const resetFilter = () => {
	localValue.value = [];
	search.value = "";
	emit("clear", []);
};

const closeFilter = () => {
	isFilterMenu.value = false;
};

watch(
	() => props.modelValue,
	(val) => {
		localValue.value = [...val];
	},
);

defineExpose({
	openFilterMenu: () => (isFilterMenu.value = true),
});
</script>
