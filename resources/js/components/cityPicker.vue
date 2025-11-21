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
				<v-select
					v-model="localValue"
					:items="itemsData"
					:no-filter="true"
					:hide-no-data="false"
					item-title="name"
					item-value="id"
					variant="outlined"
					placeholder="Введите название города"
					required
				>
				</v-select>
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
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const props = defineProps({
	activator: {
		type: Object,
		default: null,
	},
	billingItemId: {
		type: Number,
		default: null,
	},
	menuPosition: {
		type: Object,
		default: () => {},
	},
});
const itemsData = ref([]);
const localValue = ref(null);
const isMenu = ref(false);
const menuRef = ref(null);
const emit = defineEmits(["apply", "clear"]);

const openMenu = () => {
	isMenu.value = true;
};
const closeMenu = () => {
	isMenu.value = false;
};
const apply = () => {
	emit("apply", { value: localValue.value, id: props.billingItemId });
};
watch(
	() => isMenu.value,
	(val) => {
		if (!val) {
			localValue.value = null;
		}
	},
);
watch(
	() => props.activator,
	() => {
		console.log(props.activator);
	},
);
const fetchData = async () => {
	try {
		const billingId = route.query.id;
		const response = await api.get(`/billings/${billingId}/cities`);
		itemsData.value = response.data.data.userClientCities;
	} catch (e) {
		console.error(e);
	}
};
defineExpose({ openMenu, closeMenu });
onMounted(() => {
	fetchData();
});
</script>
