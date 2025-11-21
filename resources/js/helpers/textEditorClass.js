import Handsontable from "handsontable";
export class TextAreaEditor extends Handsontable.editors.TextEditor {
	createElements() {
		super.createElements();

		this.TEXTAREA = this.hot.rootDocument.createElement("textarea");
		this.TEXTAREA.className += " custom-editor";
		this.TEXTAREA.setAttribute("data-hot-input", true); // Makes the element recognizable by HOT as its own component's element.
		this.textareaStyle = this.TEXTAREA.style;
		this.textareaStyle.width = "100%";
		// this.textareaStyle.height = "100px";

		this.TEXTAREA_PARENT.innerText = "";
		this.TEXTAREA_PARENT.appendChild(this.TEXTAREA);
	}

	open() {
		super.open();

		this.TEXTAREA.value = this.TD.textContent || ""; // Устанавливаем текущее значение ячейки
		this.TEXTAREA.focus(); // Фокусируемся на textarea
		this.TEXTAREA.setSelectionRange(this.TEXTAREA.value.length, this.TEXTAREA.value.length); // Устанавливаем курсор в конец

		this._onKeyDown = this.onKeyDown.bind(this);
		this.TEXTAREA.addEventListener("keydown", this._onKeyDown);
	}

	close() {
		super.close();
		// Убираем фокус и очищаем значения
		if (this._onKeyDown) {
			this.TEXTAREA.removeEventListener("keydown", this._onKeyDown);
		}
	}
	onKeyDown(event) {
		if (event.key === "Enter" && !event.shiftKey) {
			// Останавливаем стандартное поведение (не закрываем редактор)
			event.stopImmediatePropagation();
			event.preventDefault();

			// Вставляем перенос строки в textarea
			const cursorPos = this.TEXTAREA.selectionStart;
			const value = this.TEXTAREA.value;

			// Вставляем новый перенос строки
			this.TEXTAREA.value = value.slice(0, cursorPos) + "\n" + value.slice(cursorPos);

			// Перемещаем курсор на новую строку
			this.TEXTAREA.selectionStart = this.TEXTAREA.selectionEnd = cursorPos + 1;
		}
	}
}
