/**
 * router/index.js
 */

// Composables
import { ROLES } from "@/helpers";
import {
	authorizationMiddleware,
	loadLayoutMiddleware,
	loginPageMiddleware,
	roleMiddleware,
	setPageTitleMiddleware,
} from "@/router/middleware";
import { createRouter, createWebHistory } from "vue-router";

const routes = [
	{
		path: "/",
		name: "Main",
		component: () => import("@/pages/Main.vue"),
		meta: {
			breadcrumb: "Главная",
		},
	},
	{
		path: "/about",
		name: "About",
		component: () => import("@/pages/About.vue"),
		children: [
			{ path: "services", name: "Services", component: () => import("@/pages/About.vue") },
			{ path: "pricing", component: () => import("@/pages/About.vue"), meta: { breadcrumb: "Цены" } },
		],
		meta: {
			title: "О нас",
		},
	},
	{
		path: "/login",
		name: "Login",
		component: () => import("@/pages/Login.vue"),
		meta: {
			layout: "empty",
			title: "Авторизация",
		},
	},
	// {
	// 	path: "/report_requests",
	// 	name: "ReportRequests",
	// 	component: () => import("@/pages/ReportRequests.vue"),
	// 	meta: {
	// 		breadcrumb: "Заявки данного отчёта",
	// 	},
	// },
	{
		path: "/instruments",
		children: [
			{
				path: "service-partners",
				name: "Service partners",
				component: () => import("@/pages/ServicePartner.vue"),
				meta: {
					title: "Сервисные партнёры",
				},
			},
		],
		meta: {
			breadcrumb: "Инструменты",
			roles: ROLES.USP,
		},
	},
	{
		path: "/accounting",
		meta: {
			breadcrumb: "Отчётность",
		},
		children: [
			{
				path: "billings",
				children: [
					{
						path: "",
						name: "Billings",
						component: () => import("@/pages/sp/Billings.vue"),
						meta: {
							title: "Все биллинги",
						},
					},
					{
						path: ":client",
						name: "ClientBilling",
						component: () => import("@/pages/sp/ClientBilling.vue"),
						meta: {
							title: ":client",
						},
					},
				],
				meta: {
					breadcrumb: "Биллинги",
					prefixWithIndex: true,
					roles: ROLES.SP,
				},
			},
			{
				path: "usp/billings",
				children: [
					{
						path: "",
						name: "Billings (USP)",
						component: () => import("@/pages/usp/Billings.vue"),
						meta: {
							title: "Все биллинги",
						},
					},
					{
						path: ":client",
						name: "ClientBilling (USP)",
						component: () => import("@/pages/usp/ClientBilling.vue"),
						meta: {
							title: ":client",
						},
					},
				],
				meta: {
					breadcrumb: "Биллинги",
					prefixWithIndex: true,
					roles: [ROLES.USP, ROLES.ANALYST],
				},
			},
			{
				path: "requests",
				children: [
					{
						path: "",
						name: "Requests",
						component: () => import("@/pages/sp/Requests.vue"),
						meta: {
							title: "Заявки",
						},
					},
					{
						path: ":id",
						name: "RequestsPeriod",
						component: () => import("@/pages/sp/RequestsPeriod.vue"),
						meta: {
							title: ":id",
						},
					},
				],
				meta: {
					breadcrumb: "Заявки",
					prefixWithIndex: true,
					roles: ROLES.SP,
				},
			},
			{
				path: "usp/requests",
				children: [
					{
						path: "",
						name: "Requests (USP)",
						component: () => import("@/pages/usp/Requests.vue"),
						meta: {
							title: "Загрузка заявок",
						},
					},
					{
						path: ":id",
						name: "RequestsPeriod (USP)",
						component: () => import("@/pages/usp/RequestsPeriod.vue"),
						// component: () => import("@/pages/usp/RequestPeriodNew.vue"),
						meta: {
							title: ":id",
						},
					},
				],
				meta: {
					breadcrumb: "Заявки",
					prefixWithIndex: true,
					roles: [ROLES.USP, ROLES.ANALYST],
				},
			},
			{
				path: "listrequests",
				children: [
					{
						path: "",
						name: "ListRequests",
						component: () => import("@/pages/sp/ListRequests.vue"),
						meta: {
							title: "Список заявок",
						},
					},
				],
				meta: {
					breadcrumb: "Заявки",
					prefixWithIndex: true,
					roles: ROLES.SP,
				},
			},
			// {
			// 	path: "usp/listrequests",
			// 	children: [
			// 		{
			// 			path: "",
			// 			name: "ListRequests (USP)",
			// 			component: () => import("@/pages/usp/ListRequests.vue"),
			// 			meta: {
			// 				title: "Список заявок",
			// 			},
			// 		},
			// 	],
			// 	meta: {
			// 		breadcrumb: "Заявки",
			// 		prefixWithIndex: true,
			// 		roles: [ROLES.USP, ROLES.ANALYST],
			// 	},
			// },
			{
				path: "reports",
				children: [
					{
						path: "",
						name: "Reports",
						component: () => import("@/pages/Reports.vue"),
						meta: {
							title: "Отчёты",
						},
					},
					{
						path: ":period",
						name: "ReportsPeriod",
						component: () => import("@/pages/sp/ReportsPeriod.vue"),
						meta: {
							title: ":period",
						},
					},
					{
						path: "/report_requests",
						name: "ReportRequests",
						component: () => import("@/pages/ReportRequests.vue"),
						meta: {
							breadcrumb: "Заявки данного отчёта",
						},
					},
				],
				meta: {
					breadcrumb: "Отчёты",
					prefixWithIndex: true,
					roles: ROLES.SP,
				},
			},
			{
				path: "usp/reports",
				children: [
					{
						path: "",
						name: "Reports (USP)",
						component: () => import("@/pages/Reports.vue"),
						meta: {
							title: "Отчёты",
						},
					},
					{
						path: ":period",
						name: "ReportsPeriod (USP)",
						component: () => import("@/pages/usp/ReportsPeriod.vue"),
						meta: {
							title: ":period",
						},
					},
					{
						path: "report_requests",
						name: "ReportRequests (USP)",
						component: () => import("@/pages/ReportRequests.vue"),
						meta: {
							title: "Заявки данного отчёта",
						},
					},
				],
				meta: {
					breadcrumb: "Отчёты",
					prefixWithIndex: true,
					roles: [ROLES.USP, ROLES.ANALYST],
				},
			},
			{
				path: "reports",
				children: [
					{
						path: "",
						name: "Reports",
						component: () => import("@/pages/Reports.vue"),
						meta: {
							title: "Отчёты",
						},
					},
					{
						path: ":period",
						name: "ReportsPeriod",
						component: () => import("@/pages/sp/ReportsPeriod.vue"),
						meta: {
							title: ":period",
						},
					},
					{
						path: "/report_requests",
						name: "ReportRequests",
						component: () => import("@/pages/ReportRequests.vue"),
						meta: {
							breadcrumb: "Заявки данного отчёта",
						},
					},
				],
				meta: {
					breadcrumb: "Отчёты",
					prefixWithIndex: true,
					roles: ROLES.SP,
				},
			},
			{
				path: "usp/check-sla",
				children: [
					{
						path: "",
						name: "Check-SLA (USP)",
						component: () => import("@/pages/usp/CheckSLA.vue"),
						meta: {
							title: "Проверка и загрузка SLA",
						},
					},
				],
				meta: {
					breadcrumb: "Проверка и загрузка SLA",
					prefixWithIndex: true,
					roles: [ROLES.USP, ROLES.ANALYST],
				},
			},
			{
				path: "check-sla",
				children: [
					{
						path: "",
						name: "Check-SLA (SP)",
						component: () => import("@/pages/sp/CheckSLA.vue"),
						meta: {
							title: "Страница SLA",
						},
					},
				],
				meta: {
					breadcrumb: "Страница SLA",
					prefixWithIndex: true,
					roles: ROLES.SP,
				},
			},
		],
	},
	{
		path: "/:catchAll(.*)",
		component: () => import("@/pages/NotFoundPage.vue"),
		meta: {
			title: "Страница не найдена",
			layout: "empty",
		},
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

// Порядок имеет значение (не менять, если не знаешь что делаешь)
router.beforeEach(authorizationMiddleware);
router.beforeEach(loginPageMiddleware);
router.beforeEach(roleMiddleware);
router.beforeEach(loadLayoutMiddleware);

// afterEach т.к. если использовать beforeEach история будет формироваться неверно (при нажатии и удерживании на
// браузерных стрелках управления (чтобы посмотреть историю) последней страницей будет отображаться та на которой ты
// сейчас находишься, а должна быть та, на которой находился до этого)
router.afterEach(setPageTitleMiddleware);

export default router;

// TODO: Посмотреть можно ли как-то исправить то, что если перейти на существующий роут,
//  но при этом добавить в конец /, то он почему-то добавит в url public и соответственно будет 404
