<template>
	<div style="position: fixed; top: 0; right: 0; z-index: 1005" class="d-flex flex-column align-end ga-5 pa-4">
		<TransitionGroup name="list">
			<v-card
				v-for="notification in notifications.slice(0, 3)"
				:key="notification.id"
				:color="notification.color"
				max-width="350"
				min-width="250"
				class="pa-2"
				@click="toastStore.hide(notification.id)"
			>
				<div class="d-flex justify-space-between">
					<div class="d-flex ga-3 align-center">
						<v-icon size="large" class="d-flex text-h3">{{ notification.icon }}</v-icon>
						<div class="d-flex flex-column">
							<div class="text-h6">{{ notification.title }}</div>
							<div v-html="notification.message"></div>
						</div>
					</div>
					<v-btn
						icon="mdi-window-close"
						variant="text"
						color="white"
						density="compact"
						class="text-overline align-self-start"
					/>
				</div>
			</v-card>
		</TransitionGroup>
	</div>
</template>

<script setup>
import { useToastStore } from "@/stores/toast.store.js";
import { computed } from "vue";

const toastStore = useToastStore();

const notifications = computed(() => toastStore.notifications);
</script>
<style scoped>
.list-enter-active,
.list-leave-active {
	transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
	opacity: 0;
	transform: translateX(30px);
}
</style>
