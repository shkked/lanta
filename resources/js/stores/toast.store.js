import { defineStore } from "pinia";

export const useToastStore = defineStore("toast", {
	state: () => ({
		notifications: [],
	}),
	actions: {
		show(title, message, type, timeout = 3000) {
			const color = "primary";
			const icon = getIconByType(type);
			const id = Date.now();

			this.notifications.push({
				id,
				title,
				message,
				color,
				icon,
			});

			if (timeout) {
				setTimeout(() => {
					this.hide(id);
				}, timeout);
			}
		},

		hide(id) {
			this.notifications = this.notifications.filter((notification) => notification.id !== id);
		},
	},
});

// function getColorByType(type) {
// 	return (
// 		{
// 			info: "primary",
// 			success: "green",
// 			error: "red",
// 		}[type] || "primary"
// 	);
// }

function getIconByType(type) {
	return (
		{
			info: "mdi-information",
			success: "mdi-check-circle",
			error: "mdi-alert",
		}[type] || "mdi-information"
	);
}
