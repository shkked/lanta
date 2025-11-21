<template>
	<div>
		<v-col class="chat-elem cursor-pointer bg-white d-flex">
			<div class="col-3 chat-elem__avatar bg-black"></div>
			<div class="col-9 d-flex flex-column ml-4">
				<p class="chat-elem__user font-weight-bold">{{ chat.user }}</p>
				<p class="chat-elem__message">{{ chat.message }}</p>
			</div>
		</v-col>
	</div>
</template>

<script setup>
defineProps({
	chat: {
		type: Object,
		required: true,
	},
});
</script>

<style lang="scss" scoped>
.chat-elem {
	border-bottom: 1px solid black;
	&:hover{
		background-color: #f5f5f5 !important;
	}
	.chat-elem__avatar{
		aspect-ratio: 1/1;
		width: 46px;
		border-radius: 50%;

	}
}
</style>
