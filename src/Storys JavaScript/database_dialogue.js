
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
	return setup.isMC(char) ? base : (thirdPerson || (base + "s"));
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
