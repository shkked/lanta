<template>
	<component :is="route.meta.layoutComponent">
		<slot />
		<!-- Кнопка для чатов -->
		<div v-if="Auth" class="position-fixed chat-btn bottom-0 right-0">
			<v-btn color="primary" variant="flat" prepend-icon="mdi mdi-chat" @click="openChat">
				<!-- {{ getCentrifugeRef.state}} -->
				Чаты
			</v-btn>
		</div>
		<!-- Чат  -->
		<ChatDialog />
	</component>
</template>

<script setup>
import ChatDialog from "@/components/chatDialog.vue";
import { useCentrifugeStore } from "@/stores/centrifuge.store.js";
import { useChatStore } from "@/stores/chat.store.js";
import { useUserStore } from "@/stores/user.store.js";
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const { useCentrifuge } = useCentrifugeStore();
// const { getCentrifugeRef } = storeToRefs(useCentrifugeStore());
const { Auth } = storeToRefs(useUserStore());
const { openChat } = useChatStore();

onMounted(async () => {
	try {
		useCentrifuge();
	} catch (e) {
		console.error(e);
	}
});
</script>
