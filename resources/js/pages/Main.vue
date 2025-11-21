<template>
	<v-container fluid class="primary fill-height d-flex flex-column">
		<div class="d-flex justify-start w-100">
			<h3 class="text-h6">Последние обновления</h3>
		</div>
		<section class="w-100 d-flex flex-column post-list mt-15">
			<v-col
				v-for="(item, index) in data"
				:key="item.id"
				cols="12"
				class="post-list__item bg-primary pa-0 cursor-pointer"
				:class="{ 'post-list__item--closed': item.isClosed, 'mt-5': index !== 0 }"
				:style="{ maxHeight: item.isClosed ? '195px' : item.height + 100 + 'px' }"
				@click="toggleItem(item, index)"
			>
				<div class="w-100 d-flex align-center post-list__header pl-15">
					{{ item.title }}
				</div>
				<div
					ref="textRefs"
					class="post-list__text px-15 py-5 w-75 mt-5"
					:style="{ maxHeight: item.isClosed ? '70px' : item.height + 'px' }"
					v-html="item.text"
				></div>
				
			</v-col>
		</section>
		<!-- <router-link :to="{ name: 'About' }">About</router-link>
		<router-link :to="{ name: 'Login' }">Login</router-link> -->
	</v-container>
</template>

<script setup>
import { nextTick, reactive, ref } from "vue";

const data = reactive([
	{
		id: 1,
		title: "Изменения в работе Ланты",
		text: `С 11.09.2023 на портале вносятся изменения в порядок формирования отчетов по заявкам (счета). Загрузка заявок, а также формирование отчетов будет проходить по следующему алгоритму. <br><br> 1. Каждый понедельник отделом УСП на портал загружаются заявки за прошедшую неделю. Загруженные заявки группируются в личном кабинете сервисного партнера по трем типам (Инцидентные, покопийные, абонентские). На данном этапе изменений не произошло. <br><br> 2. Сервисному партнеру необходимо до окончания текущей недели проверить корректность информации в заявках и согласовать каждую заявку. При обнаружении некорректной информации (неверная сумма, некорректная категория и пр.) заявка отклоняется с указанием причины отклонения. Порядок согласования или отклонения изложен в инструкции. <br><br> 3. В случае если сервисным партнером обнаружено что загружены не все заявки это фиксируется на портале отдельным образом. Порядок изложен в инструкции. <br><br> 4. Сотрудники УСП получив на портале информацию об отклоненных заявках связываются с Сервисным партнером по электронной почте, телефону или мессенджеру. Отклонённая заявка корректируется УСП и согласовывается сервисным партнером.ВАЖНО. Отчеты по заявкам, загружаемые еженедельно НЕ формируются. <br><br> 5. Первый день месяца Сотрудник УСП загружает последние заявки по прошедшему месяцу и отмечает данные период как ИТОГОВЫЙ. В результате в кабинете сервисного партнера формируется шаблон отчетов за весь прошедший месяц (отчеты строятся в разрезе услуги и клиента). <br><br> 6. Сервисный партнер может на основе шаблона сформировать отчеты (автоматически формируются суммы счетов на основе соответствующих заявок). Отчет будет успешно сформирован при выполнении двух условий:<br><br>a. Все заявки отчётного месяца согласованы (пункт2)<br><br>b. Во всех недельных периодах отчетного месяца отсутствует указание га то, что не все заявки загружены (пункт3) <br><br> 7. После формирования отчета сервисному партнеру необходимо указать номер и дату счета, а также приложить скан копии документов. В данном и дальнейших этапах изменений не произошло. <br><br> Основным изменением является:<br><br>• Сервисному партнеру необходимо согласовать загруженные заявки.<br><br>• Отчеты по заявкам формируются сервисным партнером один раз в месяц. <br><br> Подробная информация по изменениям имеется в инструкции`,
		isClosed: true,
	},
	{
		id: 2,
		title: "Новые функции",
		text: `На прошлой неделе мы внедрили в систему искусственный интеллект. Теперь при проверке биллингов можно пользоваться автоматической проверкой всех значений в таблице`,
		isClosed: true,
	},
]);

const textRefs = ref([]);

const toggleItem = async (item, index) => {
	item.isClosed = !item.isClosed;

	await nextTick();

	if (!item.isClosed) {
		item.height = textRefs.value[index].scrollHeight;
	} else {
		item.height = 0;
	}
};
</script>

<style lang="scss">
.post-list__item {
	border-radius: 10px;
	transition: max-height 0.5s ease;
	&:hover {
		background-color: rgb(15, 74, 141) !important;
	}
	.post-list__header {
		font-size: 20px;
		font-weight: 500;
		color: #ffffff;
		background-color: rgba(0, 0, 0, 0.37);
		min-height: 80px;
		border-top-left-radius: 10px;
		border-top-right-radius: 10px;
	}
	.post-list__text {
		color: #ffffff;
		overflow: hidden;
	}
}
.post-list__item--closed {
	max-height: 195px;
	overflow: hidden;

	.post-list__text {
		//max-height: 78px;
		overflow: hidden;
	}
}
</style>
