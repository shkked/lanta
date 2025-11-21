/**
 * plugins/index.js
 *
 */

// Plugins
import router from "@/router";
import pinia from "@/stores";
import VueDatePicker from "@vuepic/vue-datepicker";
import "@vuepic/vue-datepicker/dist/main.css";
import vuetify from "./vuetify";

export function registerPlugins(app) {
	app.use(vuetify).use(router).use(pinia).use(VueDatePicker);
}
