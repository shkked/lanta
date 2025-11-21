import { defineStore } from "pinia";
import { computed, reactive, ref, watch } from "vue";

export const useChatStore = defineStore("chat", () => {
	// state
	const isOpen = ref(false);
	const isOpenAllMessages = ref(true);
	const isFilesChecking = ref(false);
	const data = reactive({
		message: "",
		files: [],
	});
	const dataMessages = ref([
		{
			id: 1,
			user: "John Doe",
			text: "Hello, world! qwlejnqwjlhewqheouwqheouqwheouwqhoewhqoeuqwhuhaoudhasjdnaskjdhsakgfkhvfijvlkcxvjoirfeouqr",
			files: ["files2.txt", "file1.txt"],
			time: "12:00",
		},
		{
			id: 2,
			user: "me",
			text: "Hello, world!",
			files: ["file1.txt"],
			time: "12:00",
		},
		{
			id: 3,
			user: "John Doe",
			text: "Hello, world!",
			time: "12:00",
		},
		{
			id: 4,
			user: "John Doe",
			text: "Hello, world!",
			time: "12:00",
		},
	]);

	// getters
	const getDataMessagesChat = computed(() => dataMessages.value);
	const isFilesCheckingChat = computed({
		get() {
			return isFilesChecking.value;
		},
		set(val) {
			isFilesChecking.value = val;
		},
	});
	const isOpenChat = computed({
		get() {
			return isOpen.value;
		},
		set(val) {
			isOpen.value = val;
		},
	});
	const isOpenAllMessagesChat = computed({
		get() {
			return isOpenAllMessages.value;
		},
		set(val) {
			isOpenAllMessages.value = val;
		},
	});
	const messageChat = computed({
		get() {
			return data.message;
		},
		set(val) {
			data.message = val;
		},
	});
	const filesChat = computed({
		get() {
			return data.files;
		},
		set(val) {
			data.files = val;
		},
	});
	// actions
	const openChat = () => {
		isOpen.value = !isOpen.value;
	};
	const openAllMessages = () => {
		isOpenAllMessages.value = !isOpenAllMessages.value;
	};

	const sendMessage = async () => {
		try {
			if (!messageChat.value && !filesChat.value.length) return;
			const hours = new Date().getHours();
			const min = new Date().getMinutes();
			dataMessages.value.push({
				id: dataMessages.value.length + 1,
				user: "me",
				text: messageChat.value,
				files: filesChat.value.map((file) => file.name),
				time: `${hours}:${min}`,
			});
			// messageChat.value = "";
			// filesChat.value = [];
			isFilesCheckingChat.value = false;
		} catch (e) {
			console.error(e);
		}
	};
	watch(
		() => filesChat.value,
		() => {
			if (filesChat.value.length) {
				isFilesCheckingChat.value = true;
			}
		},
	);

	return {
		isFilesCheckingChat,
		openChat,
		isOpenChat,
		openAllMessages,
		isOpenAllMessagesChat,
		messageChat,
		filesChat,
		sendMessage,
		getDataMessagesChat,
	};
});
