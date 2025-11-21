<template>
	<v-container fluid class="fill-height">
		<v-row class="fill-height">
			<v-col cols="6" class="d-flex justify-center align-center">
				<div
					class="bg-primary d-flex justify-center align-center rounded-circle"
					style="aspect-ratio: 1 / 1; width: 600px"
				>
					<v-img max-width="400" height="auto" src="/img/shrug.svg" />
				</div>
			</v-col>
			<v-col cols="6" class="d-flex flex-column justify-center align-center ga-10">
				<h1 class="text-primary text-h1 font-weight-bold">404</h1>
				<div class="d-flex flex-column text-center ga-2">
					<h2 class="text-h3">Страница не найдена</h2>
					<p class="text-grey-darken-1">
						Извините, но запрашиваемая страница не найдена.<br />Пожалуйста вернитесь на главную странцу.
					</p>
				</div>
				<router-link to="/">
					<v-btn class="bg-primary" size="x-large">Вернуться на главную</v-btn>
				</router-link>
			</v-col>
		</v-row>
	</v-container>
</template>
