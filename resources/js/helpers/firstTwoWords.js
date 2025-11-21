export default function firstTwoWords(sentence) {
	if (sentence) {
		// Разбиваем предложение на слова
		const words = sentence.split(" ");

		// Получаем первые два слова и объединяем их обратно в строку
		return words.slice(0, 2).join(" ");
	}
}
