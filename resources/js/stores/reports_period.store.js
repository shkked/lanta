import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/axios";
import { useToastStore } from "@/stores/toast.store.js";

export const useReportsStore = defineStore("reports", () => {
	const dataIncident = ref([]);
	const dataPaged = ref([]);
	const dataSubscriber = ref([]);
	const uspList = ref([]);
	const loading = ref(false);
	const tab = ref("incident");
	const reportId = ref(null);
	const isUpdatingTable = ref(false);

	const toastStore = useToastStore();

	const currentTabData = computed(() => {
		switch (tab.value) {
			case "incident":
				return dataIncident.value;
			case "paged":
				return dataPaged.value;
			case "subscriber":
				return dataSubscriber.value;
			default:
				return [];
		}
	});

	function mapWithStatusOptions(items) {
		return (items || []).map((item) => ({
			...item,
			statusOptions: item.reportStatusTransitions?.map((t) => t.name) || [],
			statusOptionsFull: item.reportStatusTransitions || [],
		}));
	}

	async function loadReports(id) {
		loading.value = true;
		reportId.value = id;
		try {
			const response = await api.get(`/reports/${id}/report-items`);
			const data = response.data;

			uspList.value = data.uspList;
			dataPaged.value = mapWithStatusOptions(data["copy-by-copyApplications"]);
			dataIncident.value = mapWithStatusOptions(data["incidentApplications"]);
			dataSubscriber.value = mapWithStatusOptions(data["subscriptionService"]);
		} catch (e) {
			console.error("Ошибка при загрузке отчётов:", e);
		} finally {
			loading.value = false;
		}
	}

	function getCurrentArray() {
		return tab.value === "paged"
			? dataPaged.value
			: tab.value === "incident"
				? dataIncident.value
				: dataSubscriber.value;
	}

	function patchRow(updatedItem) {
		const currentArray = getCurrentArray();
		const index = currentArray.findIndex((el) => el.id === updatedItem.id);
		if (index !== -1) {
			currentArray.splice(index, 1, {
				...currentArray[index],
				...updatedItem,
				statusOptions: updatedItem.reportStatusTransitions?.map((t) => t.name) || [],
				statusOptionsFull: updatedItem.reportStatusTransitions || [],
			});
		}
	}

	async function updateStatus(rowIndex, newStatusName, oldStatusName) {
		const currentArray = getCurrentArray();
		const item = currentArray[rowIndex];

		if (oldStatusName === newStatusName) return;

		const selectedStatus = item.statusOptionsFull.find((s) => s.name === newStatusName);
		if (!selectedStatus) return;

		if (newStatusName === "Направлен на корректировку" && !item.comment?.trim()) {
			toastStore.show(
				"Ошибка!",
				"Для выбора статуса 'Направлен на корректировку' необходимо заполнить комментарий.",
				"error",
				10000,
			);
			return false;
		}

		try {
			isUpdatingTable.value = true;
			const { data: updatedItem } = await api.put(`/reports/${reportId.value}/report-items/${item.id}`, {
				reportStatusId: selectedStatus.id,
			});
			patchRow(updatedItem);
			return currentArray.find((el) => el.id === updatedItem.id);
		} catch (e) {
			console.error("Ошибка при обновлении статуса:", e);
		} finally {
			isUpdatingTable.value = false;
		}
	}

	async function updateUsp(rowIndex, newUspName) {
		const currentArray = getCurrentArray();
		const item = currentArray[rowIndex];
		if (!item) return;

		const selectedUsp = uspList.value.find((u) => u.name === newUspName);
		if (!selectedUsp) {
			console.warn("Не найден ID для ответственного", newUspName);
			return;
		}

		try {
			const { data: updatedItem } = await api.put(`/reports/${reportId.value}/report-items/${item.id}`, {
				uspId: selectedUsp.id,
			});

			patchRow(updatedItem);
			return currentArray.find((el) => el.id === updatedItem.id);
		} catch (e) {
			console.error("Ошибка при обновлении ответственного:", e);
		}
	}

	async function updateDateReport(rowIndex, newDateReport) {
		const currentArray = getCurrentArray();
		const item = currentArray[rowIndex];
		if (!item) return;

		try {
			const { data: updatedItem } = await api.put(`/reports/${reportId.value}/report-items/${item.id}`, {
				dateReport: newDateReport,
			});

			patchRow(updatedItem);
		} catch (error) {
			console.error("Ошибка при обновлении даты счёта:", error);
		}
	}

	async function updateDatePay(rowIndex, newDatePay) {
		const currentArray = getCurrentArray();
		const item = currentArray[rowIndex];
		if (!item) return;

		try {
			const { data: updatedItem } = await api.put(`/reports/${reportId.value}/report-items/${item.id}`, {
				datePay: newDatePay,
			});

			patchRow(updatedItem);
		} catch (error) {
			console.error("Ошибка при обновлении даты оплаты:", error);
		}
	}

	async function updateOrderCode(rowIndex, newOrderCode) {
		const currentArray = getCurrentArray();
		const item = currentArray[rowIndex];
		if (!item) return;

		try {
			const { data: updatedItem } = await api.put(`/reports/${reportId.value}/report-items/${item.id}`, {
				orderCode: newOrderCode,
			});

			patchRow(updatedItem);
		} catch (error) {
			console.error("Ошибка при сохранении номера счёта", error);
		}
	}

	async function updateFinalAmount(rowIndex, newFinalAmount) {
		const currentArray = getCurrentArray();
		const item = currentArray[rowIndex];
		if (!item) return;

		try {
			const { data: updatedItem } = await api.put(`/reports/${reportId.value}/report-items/${item.id}`, {
				finalAmount: newFinalAmount,
			});

			patchRow(updatedItem);
		} catch (error) {
			console.error("Ошибка при сохранении суммы счёта", error);
		}
	}

	async function sendComment(rowIndex, comment) {
		const currentArray = getCurrentArray();
		const item = currentArray[rowIndex];
		if (!item) return;

		try {
			const { data: updatedItem } = await api.put(`/reports/${reportId.value}/report-items/${item.id}`, {
				comment: comment,
			});

			patchRow(updatedItem);
		} catch (error) {
			console.error("Ошибка при отправке комментария", error);
		}
	}
	const sendReport = async (rowData, fileInput) => {
		const missingFields = [
			!rowData.orderCode,
			!rowData.dateReport,
			...(tab.value === "subscriber" ? [!rowData.finalAmount] : []),
			!fileInput?.files?.length,
		];

		if (missingFields.some(Boolean)) {
			toastStore.show(
				"Ошибка!",
				tab.value === "subscriber"
					? "Необходимо сначала заполнить номер, дату и сумму счета, затем загрузить документы"
					: "Необходимо сначала заполнить номер и дату счета, затем загрузить документы",
				"error",
				10000,
			);
			return;
		}

		const formData = new FormData();
		for (const file of fileInput.files) {
			formData.append("files[]", file);
		}

		try {
			const id = rowData.id;

			const { data: updatedItem } = await api.post(
				`/reports/${reportId.value}/report-items/${id}/upload`,
				formData,
			);

			patchRow(updatedItem);
			toastStore.show("Успех!", "Отчёт успешно загружен", "success", 10000);
		} catch (error) {
			console.error(error);
			toastStore.show("Ошибка!", "Попробуйте позже", "error", 10000);
		}
	};
	const downloadDocuments = async (itemId) => {
		if (!reportId.value) {
			console.warn("reportId не задан");
			return;
		}

		try {
			const response = await api.get(`/reports/${reportId.value}/report-items/${itemId}/download`, {
				responseType: "blob",
			});

			const blob = new Blob([response.data]);
			const url = window.URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			link.download = `document_${itemId}.zip`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (e) {
			console.error("Ошибка при скачивании документа:", e);
		}
	};

	return {
		dataIncident,
		dataPaged,
		dataSubscriber,
		uspList,
		loading,
		tab,
		currentTabData,
		reportId,
		isUpdatingTable,
		updateDateReport,
		updateDatePay,
		updateFinalAmount,
		loadReports,
		updateStatus,
		updateUsp,
		updateOrderCode,
		sendReport,
		sendComment,
		downloadDocuments,
	};
});
