// Utilities
import { api } from "@/axios";
import router from "@/router";
import { useCentrifugeStore } from "@/stores/centrifuge.store.js";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useUserStore = defineStore("user", () => {
	// State
	const User = ref(null);
	const { disconnectCentrifuge } = useCentrifugeStore();

	// Actions
	async function getUser() {
		try {
			const response = await api.get("/user");
			User.value = response.data.data;
		} catch (error) {
			console.error(error);
			throw error;
		}
	}
	async function logout(request = true) {
		try {
			console.log("logout");
			if (request) await api.get("/logout");
			User.value = null;
			// Отключение web socket
			disconnectCentrifuge();
			// console.log([Auth.value]);
			router.push({ name: "Login" });
		} catch (error) {
			console.error(error);
			throw error;
		}
	}

	function permittedFor(roles) {
		if (Array.isArray(roles)) {
			return roles.includes(User.value?.role);
		} else {
			return User.value?.role === roles;
		}
	}

	const clearColumnSettings = () => {
		Object.keys(localStorage).forEach((key) => {
			if (key.startsWith("columns")) {
				localStorage.removeItem(key);
			}
		});
	};

	// Computed
	const Auth = computed(() => {
		return !!User.value;
	});

	return { User, getUser, logout, permittedFor, Auth, clearColumnSettings };
});
