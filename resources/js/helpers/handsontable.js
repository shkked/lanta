export function mapStatusToColor(status, text = false, color) {
	const statusMap = {
		"Есть ошибки": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		error: [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"Направлен на корректировку": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"Биллинг проверен, есть ошибки": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"Биллинг ждёт утверждения сервисного партнёра": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"На проверке у аналитика": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"На согласовании фин. отдела": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"Ожидает отправку отчёта и тех листов": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"Принят в работу УСП": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"Итоговый период": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"Биллинг утверждён": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		Оплачен: [`bg-${color}-lighten-2`, `text-${color}-darken-3`],
		success: [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"Документы загружены": [`bg-${color}-lighten-4`, `text-${color}-darken-3`],
		"Биллинг загружен, ожидает проверки": [`bg-${color}-lighten-4`, `text-${color}`],
		"Согласован фин.отделом": [`bg-${color}-lighten-4`, `${color}-darken-4`],
	};

	return statusMap[status] ? statusMap[status][text ? 1 : 0] : "";
}

export function paintRow(instance, excludeCols = []) {
	return function (td, row, column) {
		const rowData = instance.value.hotInstance.getSourceDataAtRow(row);
		const status = rowData ? rowData.status : null;
		if (status && !excludeCols.includes(column)) {
			td.className += ` ${mapStatusToColor(status)}`;
		}
		if (td.getAttribute("aria-readonly")) {
			td.className += " text-grey-darken-3";
		}
	};
}

export function removeFilters(columns) {
	return function (col, th) {
		if (col === columns || (Array.isArray(columns) && columns.includes(col))) {
			const button = th.querySelector(".changeType");
			if (button) {
				button.parentElement.removeChild(button);
			}
		}
	};
}

export function setColumnsWidth(source, hot) {
	const widths = [];

	for (let visualIndex = 0; visualIndex < hot.countCols(); visualIndex++) {
		widths[visualIndex] = hot.getColWidth(visualIndex);
	}

	localStorage.setItem(`columnsWidth${source}`, JSON.stringify(widths));
}

export function setColumnsOrder(source, hot) {
	const newOrder = Array.from(
		hot.getPlugin("manualColumnMove").hot.columnIndexMapper.fromPhysicalToVisualIndexesCache.keys(),
	);

	localStorage.setItem(`columnsOrder${source}`, JSON.stringify(newOrder));
}

export function loadColumnsData(source, hot) {
	const savedOrder = JSON.parse(localStorage.getItem(`columnsOrder${source}`)); // visualIndex[] по physicalIndex
	const savedWidths = JSON.parse(localStorage.getItem(`columnsWidth${source}`)); // ширины в visual-порядке

	if (!savedOrder || !savedWidths) return;

	hot.updateSettings({
		manualColumnMove: savedOrder,
		colWidths: savedWidths,
	});
}

export function isSameOrder(a, b) {
	return JSON.stringify(a) === JSON.stringify(b);
}

export function deleteTippy(td) {
	if (td._tippy) {
		td._tippy.destroy();
		delete td._tippy;
	}
}
export function searchErrors({ errorsData, rowData, td, tippy, colorize = true, cellProperties = null } = {}) {
	let textMessage = "";
	let isError = false;
	errorsData.forEach((item) => {
		const error = rowData?.errors?.find((error) => error.name == item);
		if (error) {
			isError = true;
			if (colorize) td.className += " bg-red-color";
			if (cellProperties) cellProperties.readOnly = false;
			if (textMessage) {
				textMessage += "<br/><br/>" + error.slug;
			} else {
				textMessage = error.slug;
			}
		}
	});
	if (isError) td.value = tippy(td, { content: textMessage });
	textMessage = "";
}
