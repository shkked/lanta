<template>
	<v-app>
		<app-layout>
			<router-view />
			<toast />
			<tippy />
		</app-layout>
	</v-app>
</template>

<script setup>
import Toast from "@/components/Toast.vue";
import AppLayout from "@/layouts/AppLayout.vue";
import { Tippy } from "vue-tippy";
</script>
