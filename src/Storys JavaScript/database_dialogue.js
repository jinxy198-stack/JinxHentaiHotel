
setup.isMC = function (char) {
	return char === State.variables.mc;
};

setup.ref = function (char, form) {
	if (!char) {
		return "";
	}

	const isMC = setup.isMC(char);
	const name = char.name || "Someone";

	switch (form) {
		case "subj":
			return isMC ? "you" : name;

		case "subjCap":
			return isMC ? "You" : name;

		case "obj":
			return isMC ? "you" : name;

		case "poss":
			return isMC ? "your" : (/s$/i.test(name) ? name + "'" : name + "'s");

		case "refl":
			return isMC ? "yourself" : name;

		default:
			return isMC ? "you" : name;
	}
};

setup.verb = function (char, base, thirdPerson) {
	if (char === State.variables.mc) {
		return base;
	}

	if (thirdPerson) {
		return thirdPerson;
	}

	if (/(s|sh|ch|x|z|o)$/i.test(base)) {
		return base + "es";
	}
	if (/[^aeiou]y$/i.test(base)) {
		return base.slice(0, -1) + "ies";
	}
	return base + "s";
};

setup.part = function (char, key, fallback) {
	if (!char) {
		return fallback || "";
	}

	let value;

	if (char[key] != null) {
		value = char[key];
	}
	else if (char.body && char.body[key] != null) {
		value = char.body[key];
	}
	else {
		value = fallback || "";
	}

	return String(value);
};

setup.partLower = function (char, key, fallback) {
	if (!char) {
		return String(fallback || "").toLowerCase();
	}

	let value;

	if (char[key] != null) {
		value = char[key];
	}
	else if (char.body && char.body[key] != null) {
		value = char.body[key];
	}
	else {
		value = fallback || "";
	}

	return String(value).toLowerCase();
};

setup.value = function (char, key, fallback) {
	if (!char) {
		return String(fallback || "");
	}

	let value = char[key];

	if (value == null) {
		value = fallback || "";
	}

	return String(value);
};

setup.valueLower = function (char, key, fallback) {
	if (!char) {
		return String(fallback || "").toLowerCase();
	}

	let value = char[key];

	if (value == null) {
		value = fallback || "";
	}

	return String(value).toLowerCase();
};

setup.be = function (char, tense) {
	const isMC = char === State.variables.mc;
	tense = tense || "present";

	if (tense === "past") {
		return isMC ? "were" : "was";
	}
	return isMC ? "are" : "is";
};

setup.have = function (char) {
	return char === State.variables.mc ? "have" : "has";
};

setup.article = function (word) {
	word = String(word || "").trim();
	if (!word) return "";

	return /^[aeiou]/i.test(word) ? "an" : "a";
};

setup.plural = function (count, singular, plural) {
	return count === 1 ? singular : (plural || singular + "s");
};

setup.list = function (arr) {
	arr = (arr || []).filter(Boolean);
	if (arr.length === 0) return "";
	if (arr.length === 1) return arr[0];
	if (arr.length === 2) return arr[0] + " and " + arr[1];
	return arr.slice(0, -1).join(", ") + ", and " + arr[arr.length - 1];
};

setup.cap = function (str) {
	str = String(str || "");
	return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
};

setup.speakerName = function (char) {
	return char === State.variables.mc ? "You" : (char.name || "Someone");
};

setup.cleanText = function (str) {
	return String(str || "")
		.replace(/\s+([,.!?;:])/g, "$1")
		.replace(/\s{2,}/g, " ")
		.trim();
};

setup.noise = {
    Human: ["moan","groan","squeal"],
    Lizard: ["hiss"],
    Fox: ["yip"],
    Goat:["bleat"],
    Sheep:["bleat"],
    Cow:["moo"],
    Pig:["oink"],
    Canine:["growl"],
    Feline:["meow"],
    Eagel:["screech"]
}

