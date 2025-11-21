/**
 * app.js
 *
 */

// Plugins
import { registerPlugins } from "@/plugins";
import { registerAllModules } from "handsontable/registry";
import "tippy.js/dist/tippy.css"; // optional for styling
import VueTippy from "vue-tippy";

// Добавление своего редактора
import { registerHotEditors } from "./helpers/hotEditor.js"; 
// Styles
import "/resources/styles/app.scss";

// Components
import App from "./App.vue";

// Composables
import { registerLanguageDictionary, ruRU } from "handsontable/i18n";
import { createApp } from "vue";

const app = createApp(App);

registerPlugins(app);
registerAllModules();
registerLanguageDictionary(ruRU);
app.use(VueTippy, {
	directive: "tippy", // => v-tippy
	component: "tippy", // => <tippy/>
	componentSingleton: "tippy-singleton", // => <tippy-singleton/>,
	defaultProps: {
		placement: "top",
		allowHTML: true,
	}, // => Global default options * see all props
});
app.mount("#app");
registerHotEditors();
