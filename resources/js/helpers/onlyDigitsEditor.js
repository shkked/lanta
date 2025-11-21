import Handsontable from "handsontable";
export class onlyDigitsEditor extends Handsontable.editors.TextEditor {
	createElements() {
		super.createElements();

		// Удаление ". " после двойного пробела для mac os
		this.TEXTAREA.addEventListener("input", () => {
			this.TEXTAREA.value = this.TEXTAREA.value.replace(/\. $/, "");
		});

		// Блокировка нецифровых клавиш
		this.TEXTAREA.addEventListener("keydown", (event) => {
			const allowedKeys = ["Backspace", "ArrowLeft", "ArrowRight", "Delete", "Tab", "Home", "End"];

			if (event.ctrlKey || event.metaKey) return;

			if (!/\d/.test(event.key) && !allowedKeys.includes(event.key)) {
				event.preventDefault();
			}
		});

		// Очистка нецифровых символов при вставке
		this.TEXTAREA.addEventListener("paste", (event) => {
			event.preventDefault();
			const pastedData = (event.clipboardData || window.Clipboard).getData("text");
			const digitsOnly = pastedData.replace(/\D/g, ""); // удаляем всё, кроме цифр
			const start = this.TEXTAREA.selectionStart;
			const end = this.TEXTAREA.selectionEnd;
			const originalValue = this.TEXTAREA.value;

			// Вставка чисел на позицию курсора
			this.TEXTAREA.value = originalValue.substring(0, start) + digitsOnly + originalValue.substring(end);

			// Обновляем позицию курсора
			const newCaretPos = start + digitsOnly.length;
			this.TEXTAREA.setSelectionRange(newCaretPos, newCaretPos);
		});
	}
}
