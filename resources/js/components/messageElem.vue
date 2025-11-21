<template>
	<div class="my-3 px-2">
		<v-row :class="msg.user == 'me' ? 'justify-end' : 'justify-start'">
			<v-col cols="6" class="message-elem rounded-10" :class="msg.user == 'me' ? 'bg-primary' : 'bg-white'">
				<div v-if="msg.files?.length">
					<p
						v-for="(item, index) in msg?.files"
						:key="index"
						class="d-flex message-elem__file cursor-pointer"
						@click="downloadFile(item)"
					>
						<span class="mr-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								fill="currentColor"
								class="bi bi-file-earmark-fill"
								viewBox="0 0 16 16"
							>
								<path
									d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2m5.5 1.5v2a1 1 0 0 0 1 1h2z"
								/>
							</svg>
						</span>
						{{ item }}
					</p>
				</div>
				<p :class="msg.files?.length ? 'mt-4' : ''">
					{{ msg.text }}
				</p>
				<div class="d-flex justify-end mt-5">
					<p>{{ msg.time }}</p>
				</div>
			</v-col>
		</v-row>
	</div>
</template>

<script setup>
defineProps({
	colClass: {
		type: String,
		default: "bg-primary",
	},
	rowClass: {
		type: String,
		default: "justify-start",
	},
	msg: {
		type: Object,
		required: true,
	},
});

const downloadFile = (file) => {
	window.open(file, "_blank");
};
</script>

<style lang="scss" scoped>
.message-elem {
	//padding: 5px 10px;
	.message-elem__file {
		word-break: break-word;
	}
	p {
		font-size: 15px;
	}
}
</style>
