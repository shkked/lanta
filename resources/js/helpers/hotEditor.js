import Handsontable from "handsontable";
import { onlyDigitsEditor } from "./onlyDigitsEditor";
import { TextAreaEditor } from "./textEditorClass";
export function registerHotEditors() {
	Handsontable.editors.registerEditor("textareaEditor", TextAreaEditor);
	Handsontable.editors.registerEditor("onlyDigitsEditor", onlyDigitsEditor);
}
