<template>
	<v-dialog
		v-model="isOpenChat"
		persistent
		:close-on-back="false"
		:retain-focus="false"
		:style="{ top: `${position.top}px`, left: `${position.left}px` }"
		min-height="500"
		max-width="400"
		height="500"
		scrollable
		transition="slide-y-reverse-transition"
		class="chat-dialog"
	>
		<v-card ref="dialogCard" class="position-relative" color="#D9D9D9">
			<!-- Тулбар -->
			<v-toolbar class="cursor-move" height="50" color="primary" @mousedown="startDragging">
				<v-spacer></v-spacer>
				<v-btn icon="mdi-close" @click="openChat"></v-btn>
			</v-toolbar>

			<!-- Шапка чата -->
			<div class="chat-dialog__header d-flex align-center">
				<v-col v-if="isOpenAllMessagesChat" class="px-4">
					<h4 class="header__title">Все чаты</h4>
				</v-col>
				<div v-else class="d-flex align-center justify-space-between w-100">
					<v-col class="header__btn">
						<v-btn
							class="header__btn-elem d-flex pa-0 ma-0"
							color="primary"
							variant="text"
							@click="openAllMessages"
						>
							<img src="@/assets/icons/list.svg" alt="list-svg" />
						</v-btn>
					</v-col>
					<v-col class="header__user d-flex align-center justify-end">
						<div class="d-flex align-end flex-column mr-5">
							<p class="header__user-name">{{ "userName" }}</p>
							<p class="header__user-status">{{ "userStatus" }}</p>
						</div>
						<div class="header__user-avatar"></div>
					</v-col>
				</div>
			</div>
			<!-- Все чаты -->
			<div v-if="isOpenAllMessagesChat" class="chat-dialog__allChats d-flex flex-column">
				<chatElem v-for="(chat, i) in chats" :key="i" :chat="chat" @click="openAllMessages"></chatElem>
			</div>
			<!-- Область сообщений -->
			<v-card-text v-if="!isOpenAllMessagesChat" class="chat-dialog__messages pa-4">
				<div v-for="(msg, i) in getDataMessagesChat" :key="i" class="mb-2 d-flex flex-column">
					<messageElem :msg="msg" />
				</div>
			</v-card-text>
			<!-- Отображение файлов -->
			<transition name="fade">
				<div
					v-if="isFilesCheckingChat"
					class="chat-dialog__files bg-white position-absolute d-flex flex-column"
				>
					<p class="font-weight-bold pl-4 pt-4 mb-5">Прикрепленные файлы</p>
					<div class="d-flex flex-column overflow-y-auto py-0">
						<v-col
							v-for="(file, i) in filesChat"
							:key="i"
							class="d-flex align-center justify-space-between"
						>
							<p class="text-truncate">
								{{ file.name }}
							</p>
							<v-btn size="small" icon="mdi-close" color="error" @click="removeFile(i)"></v-btn>
						</v-col>
					</div>
					<v-spacer></v-spacer>
					<v-col class="d-flex justify-end">
						<v-btn class="mr-4" color="error" @click="isFilesCheckingChat = false">Закрыть</v-btn>
						<v-btn color="primary" @click="sendMessage">Отправить</v-btn>
					</v-col>
				</div>
			</transition>

			<!-- Поле ввода -->
			<v-card-actions v-if="!isOpenAllMessagesChat" class="pa-0">
				<v-textarea
					v-model="messageChat"
					class="rounded-0 chat-dialog__textfield"
					variant="solo"
					hide-details
					rows="1"
					auto-grow
					placeholder="Введите сообщение..."
				>
					<template #prepend-inner>
						<v-btn icon="mdi-paperclip" variant="text" color="primary" @click="handleFileChange"></v-btn>
						<v-file-input ref="fileInput" v-model="filesChat" type="file" class="d-none" multiple />
					</template>
					<template #append-inner>
						<v-btn icon="mdi-send" variant="text" color="primary" @click="sendMessage"></v-btn>
					</template>
				</v-textarea>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup>
import chatElem from "@/components/chatElem.vue";
import messageElem from "@/components/messageElem.vue";
import { useChatStore } from "@/stores/chat.store.js";
import { storeToRefs } from "pinia";
import { reactive, ref } from "vue";

const { openChat, openAllMessages, sendMessage } = useChatStore();
const { isOpenChat, messageChat, getDataMessagesChat, isOpenAllMessagesChat, filesChat, isFilesCheckingChat } =
	storeToRefs(useChatStore());

const fileInput = ref(null);
const chats = ref([
	{
		id: 1,
		user: "John WWW",
		status: "online",
		message: "qweqwewqewqe",
	},
	{
		id: 2,
		user: "John DEEoe",
		status: "online",
		message: "asdsadsadasdasd",
	},
	{
		id: 3,
		user: "John RRR",
		status: "online",
		message: "xzczxvxzvxzvxzv",
	},
]);

const dialogCard = ref(null);
const dragging = ref(false);
const startPosition = reactive({ x: 0, y: 0 });

const position = reactive({
	top: 0,
	left: 0,
});

const startDragging = (event) => {
	dragging.value = true;
	startPosition.x = event.clientX - position.left;
	startPosition.y = event.clientY - position.top;
	document.addEventListener("mousemove", onDrag);
	document.addEventListener("mouseup", stopDragging);
};

const onDrag = (event) => {
	if (!dragging.value) return;
	position.left = event.clientX - startPosition.x;
	position.top = event.clientY - startPosition.y;
};

const stopDragging = () => {
	dragging.value = false;
	document.removeEventListener("mousemove", onDrag);
	document.removeEventListener("mouseup", stopDragging);
};

const handleFileChange = () => {
	fileInput.value?.click();
};
const removeFile = (index) => {
	filesChat.value = filesChat.value.filter((_, i) => i !== index);
};
</script>

<style lang="scss" scoped>
.chat-dialog {
	.chat-dialog__header {
		height: 76px;
		background-color: white;
		border-bottom: 1px solid black;
		.header__title {
		}
		.header__user-name {
			font-size: 20px;
		}
		.header__user-status {
			font-size: 15px;
		}
		.header__btn-elem {
			.v-btn__content {
			}
			img {
				aspect-ratio: 1/1;
				width: 46px;
			}
		}
	}
	.chat-dialog__textfield {
		.v-input__control {
			display: none !important;
			border-radius: 0 !important;
			.v-field {
			}
		}
	}
	.chat-dialog__files {
		bottom: 0;
		z-index: 1;
		left: 0;
		right: 0;
		max-height: 250px;
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
	}
	.chat-dialog__messages {
	}
	.header__user-avatar {
		aspect-ratio: 1/1;
		width: 46px;
		height: 46px;
		background-color: black;
		border-radius: 50%;
	}
}
</style>
