function getWords(string, num = 1) {
	if (string) {
		const words = string.split(" ");
		return words.slice(0, num).join(" ");
	}
	return "";
}
export default function twoWordsName(firstname, lastname) {
	if (!firstname && !lastname) return "";

	if (!firstname && lastname) return getWords(lastname, 2);
	if (firstname && !lastname) return getWords(firstname, 2);

	if (firstname && lastname) {
		return firstname.split(" ").length === 1
			? getWords(firstname) + " " + getWords(lastname)
			: getWords(firstname, 2);
	}
}
