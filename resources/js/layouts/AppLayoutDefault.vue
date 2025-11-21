<template>
	<v-navigation-drawer expand-on-hover rail mobile-breakpoint="false">
		<router-link
			:to="{ name: 'Main' }"
			class="d-flex text-decoration-none align-content-center ga-2 px-2 py-3 align-center"
		>
			<v-avatar image="/img/logo.jpeg" size="40"></v-avatar>
			<div class="text-h6 font-weight-bold text-primary text-uppercase">Лантасервис</div>
		</router-link>

		<v-divider></v-divider>

		<v-list density="compact" color="primary" nav>
			<v-list-item prepend-icon="mdi-folder-outline" title="Задачи" value="tasks"></v-list-item>

			<v-divider></v-divider>

			<v-list-group value="Отчетность" class="mx-0 ma-0 pa-0 ga-0">
				<template #activator="{ props }">
					<v-list-item v-bind="props" prepend-icon="mdi-file-chart-outline" title="Отчетность"></v-list-item>
				</template>

				<v-list-item
					prepend-icon="mdi-cash"
					title="Все биллинги"
					value="bill"
					style="padding-inline-start: 8px !important"
					:to="
						roleRouteResolver({
							Billings: ROLES.SP,
							'Billings (USP)': [ROLES.USP, ROLES.ANALYST],
						})
					"
				></v-list-item>

				<v-list-item
					v-if="permittedFor([ROLES.USP, ROLES.ANALYST])"
					prepend-icon="mdi-file-check"
					title="Загрузка заявок"
					value="file-check"
					style="padding-inline-start: 8px !important"
					:to="
						roleRouteResolver({
							'Requests (USP)': [ROLES.USP, ROLES.ANALYST],
						})
					"
				></v-list-item>
				<v-list-item
					v-if="permittedFor([ROLES.SP])"
					prepend-icon="mdi-list-box"
					title="Список заявок"
					value="list-box"
					style="padding-inline-start: 8px !important"
					:to="
						roleRouteResolver({
							ListRequests: ROLES.SP,
						})
					"
				></v-list-item>

				<v-list-item
					prepend-icon="mdi-text-box-multiple-outline"
					title="Отчеты"
					value="item.title"
					style="padding-inline-start: 8px !important"
					:to="
						roleRouteResolver({
							Reports: ROLES.SP,
							'Reports (USP)': [ROLES.USP, ROLES.ANALYST],
						})
					"
				></v-list-item>

				<v-list-item
					prepend-icon="mdi mdi-file-download"
					title="Дозагрузка отчётов"
					value="down-reports"
					style="padding-inline-start: 8px !important"
				></v-list-item>

				<v-list-item
					prepend-icon="mdi-checkbox-marked-circle-outline"
					title="Проверка и загрузка SLA"
					value="check-sla"
					style="padding-inline-start: 8px !important"
					:to="
						roleRouteResolver({
							'Check-SLA (SP)': ROLES.SP,
							'Check-SLA (USP)': [ROLES.USP, ROLES.ANALYST],
						})
					"
				></v-list-item>
			</v-list-group>
			<v-divider></v-divider>

			<template v-if="permittedFor(ROLES.USP)">
				<v-list-group value="Инструменты">
					<template #activator="{ props }">
						<v-list-item v-bind="props" prepend-icon="mdi-tools" title="Инструменты"></v-list-item>
					</template>

					<v-list-item
						prepend-icon="mdi-play-circle-outline"
						title="Старт отчетности"
						value="start_report"
						style="padding-inline-start: 8px !important"
					></v-list-item>

					<v-list-item
						prepend-icon="mdi-account-multiple-plus-outline"
						title="Создание нового СП"
						value="add-sp"
						style="padding-inline-start: 8px !important"
						:to="{ name: 'Service partners' }"
					></v-list-item>
				</v-list-group>
				<v-divider></v-divider>
			</template>

			<v-list-item prepend-icon="mdi-finance" title="Дашборды" value="dashboard"></v-list-item>
			<v-divider></v-divider>

			<v-list-item prepend-icon="mdi-book-open-outline" title="Инструкция" value="instructions"></v-list-item>
		</v-list>
	</v-navigation-drawer>
	<v-app-bar border="b" elevation="0">
		<v-container fluid class="d-flex justify-space-between align-center">
			<breadcrumbs />

			<v-menu rounded>
				<template #activator="{ props }">
					<div v-bind="props" class="d-flex align-center ga-3 cursor-pointer">
						<div v-if="centrifugeStore.isLoadingApplications" class="d-flex align-center ga-2 mb-2">
							<v-progress-circular indeterminate color="primary" size="20" width="2" />
							<span class="text-caption">Идёт выгрузка заявок...</span>
						</div>
						<v-avatar icon="mdi-account" color="primary"></v-avatar>
						<div>
							<h3 style="line-height: normal">
								{{ twoWordsName(User?.firstname, User?.lastname) }}
							</h3>
							<p v-if="User?.email" class="text-caption">
								{{ User.email }}
							</p>
						</div>
					</div>
				</template>
				<v-card class="mt-3" style="width: fit-content">
					<v-card-text class="d-flex justify-center">
						<v-btn variant="text" @click="logoutUser">Выйти</v-btn>
					</v-card-text>
				</v-card>
			</v-menu>
		</v-container>
	</v-app-bar>
	<v-main>
		<slot />
	</v-main>
</template>

<script setup>
import { ROLES, twoWordsName } from "@/helpers";
import roleRouteResolver from "@/helpers/roleRouteResolver.js";
import Breadcrumbs from "@/modules/Breadcrumbs.vue";
import { useUserStore } from "@/stores/user.store.js";
import { useCentrifugeStore } from "@/stores/centrifuge.store.js";

const { User, permittedFor, logout, clearColumnSettings } = useUserStore();
const centrifugeStore = useCentrifugeStore();

const logoutUser = async () => {
	await logout();
	clearColumnSettings();
};
</script>
