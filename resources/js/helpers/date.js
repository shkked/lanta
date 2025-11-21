export function formatDate(date) {
	if (!date) return null;
	const dateInst = new Date(date);
	let month = "" + (dateInst.getMonth() + 1);
	let day = "" + dateInst.getDate();
	const year = dateInst.getFullYear();

	if (month.length < 2) month = "0" + month;
	if (day.length < 2) day = "0" + day;

	return [year, month, day].join("-");
}
