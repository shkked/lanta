import { api } from "@/axios";
import { Centrifuge } from "centrifuge";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useToastStore } from "./toast.store.js";
import { useUserStore } from "./user.store.js";

export const useCentrifugeStore = defineStore("socket", () => {
	const centrifugeRef = ref(null);
	const subscriptionRef = ref(null);
	const dataCentrifugeRef = ref(null);
	const isLoadingApplications = ref(false);
	const toastStore = useToastStore();

	const getDataCentrifuge = computed(() => {
		return dataCentrifugeRef.value;
	});

	const getCentrifugeRef = computed(() => {
		return centrifugeRef.value;
	});

	const getSubscriptionRef = computed(() => {
		return subscriptionRef.value;
	});

	const useCentrifuge = async () => {
		try {
			if (!centrifugeRef.value) {
				const dataWebSocket = JSON.parse(localStorage.getItem("dataCentrifuge"));
				const tokenData = dataWebSocket?.["ws-token"];
				const channelData = dataWebSocket?.["channel"];

				if (!tokenData || !channelData) {
					console.warn("Отсутствует токен или канал:", { tokenData, channelData });
					return;
				}

				const response = await api.get("ws-url");
				const wsURL = response.data;

				const centrifuge = new Centrifuge(`ws://${wsURL}:8000/connection/websocket`, {
					token: tokenData,
				});

				centrifuge
					.on("connecting", (ctx) => {
						console.log(`connecting: ${ctx.code}, ${ctx.reason}`);
					})
					.on("connected", (ctx) => {
						console.log(`connected over ${ctx.transport}`);
					})
					.on("disconnected", (ctx) => {
						console.log(`disconnected: ${ctx.code}, ${ctx.reason}`);
					})
					.on("error", async (ctx) => {
						console.error("WebSocket Error:", ctx);
						if (ctx.error.code === 109) {
							await handleTokenRefresh();
						}
					})

					.connect();

				const sub = centrifuge.newSubscription(channelData);

				sub.on("publication", (ctx) => {
					console.log("Получены данные из канала:", ctx.data);
					dataCentrifugeRef.value = ctx.data;

					const message = ctx.data?.message;
					let textMessage = "";

					for (let key in message) {
						const value = message[key];

						if (typeof value === "string" && value.includes("выгруженны")) {
							isLoadingApplications.value = false;
						}

						textMessage += `${key}: <span>${value}</span><br/>`;
					}

					toastStore.show("Уведомление от портала!", textMessage, "info", 10000);
				}).on("error", (ctx) => {
					console.error("Ошибка подписки:", ctx);
					isLoadingApplications.value = false;
				});

				sub.subscribe();

				subscriptionRef.value = sub;
				centrifugeRef.value = centrifuge;
			}
		} catch (error) {
			console.error("Ошибка при инициализации Centrifuge:", error);
		}
	};

	const handleTokenRefresh = async () => {
		try {
			const refreshResponse = await api.get("/refresh-websocket");
			const wsData = refreshResponse.data.message;
			const newToken = wsData["ws-token"];
			const newChannel = wsData["channel"];

			localStorage.setItem("dataCentrifuge", JSON.stringify({ "ws-token": newToken, channel: newChannel }));

			if (newToken && newChannel) {
				disconnectCentrifuge(false);
				await useCentrifuge();
			}
		} catch (error) {
			console.error("Ошибка при обновлении токена:", error);
			const userStore = useUserStore();
			await userStore.logout(true);
		}
	};

	const disconnectCentrifuge = (clearLocalStorage = true) => {
		if (!centrifugeRef.value) return;

		if (subscriptionRef.value) {
			try {
				subscriptionRef.value.unsubscribe();
			} catch (err) {
				console.warn("Ошибка при отписке от канала:", err);
			}
			subscriptionRef.value = null;
		}

		try {
			centrifugeRef.value.removeAllListeners();
			centrifugeRef.value.disconnect();
		} catch (err) {
			console.warn("Ошибка при отключении Centrifuge:", err);
		}

		centrifugeRef.value = null;
		clearDataCentrifuge();

		if (clearLocalStorage) {
			localStorage.removeItem("dataCentrifuge");
		}
	};

	const clearDataCentrifuge = () => {
		dataCentrifugeRef.value = null;
	};

	return {
		useCentrifuge,
		disconnectCentrifuge,
		handleTokenRefresh,
		clearDataCentrifuge,
		isLoadingApplications,
		getDataCentrifuge,
		getCentrifugeRef,
		getSubscriptionRef,
	};
});
