export default function setDynamicValues(target, source) {
	if (typeof target === "string") {
		return target.replace(/(?:^|\s):\w+(?:\s|$)/, (match) => {
			const key = match.slice(1);
			if (source.hasOwnProperty(key)) {
				return source[key];
			}
		});
	}
}

// TODO: подумать как переделать механизм динамических значений в мете
