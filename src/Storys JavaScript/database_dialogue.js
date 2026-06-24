
setup.isMC = function (char) {
	const mc = State.variables.mc;

	if (!char || !mc) {
		return false;
	}

	return char === mc || char.isMC === true || char.id === "mc";
};

setup.ref = function (char, form) {
	form = form || "subj";

	if (setup.isMC(char)) {
		switch (form) {
			case "subj":
				return "you";
			case "subjCap":
				return "You";
			case "obj":
				return "you";
			case "poss":
				return "your";
			case "possCap":
				return "Your";
			case "refl":
				return "yourself";
			default:
				return "you";
		}
	}

	const name = char && char.name ? char.name : "someone";

	switch (form) {
		case "subj":
		case "subjCap":
		case "obj":
			return name;

		case "poss":
			return name + "'s";

		case "possCap":
			return name + "'s";

		case "refl":
			return name + "self";

		default:
			return name;
	}
};

setup.verb = function (char, base, thirdPerson) {
	if (setup.isMC(char)) {
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
	const isMC = setup.isMC(char);
	tense = tense || "present";

	if (tense === "past") {
		return isMC ? "were" : "was";
	}

	return isMC ? "are" : "is";
};

setup.have = function (char) {
	return setup.isMC(char) ? "have" : "has";
};

setup.speakerName = function (char) {
	return setup.isMC(char) ? "You" : ((char && char.name) || "Someone");
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


setup.cleanText = function (str) {
	return String(str || "")
		.replace(/\s+([,.!?;:])/g, "$1")
		.replace(/\s{2,}/g, " ")
		.trim();
};


/* =========================
   Safe Grammar Pronouns
   ========================= */

/*
	Use a unique name so this does not conflict with any other
	pronoun system you already have.
*/
setup.grammarPronouns = {
	"He/Him": {
		subj: "he",
		obj: "him",
		poss: "his",
		possNoun: "his",
		refl: "himself",
		pluralVerb: false
	},
	"She/Her": {
		subj: "she",
		obj: "her",
		poss: "her",
		possNoun: "hers",
		refl: "herself",
		pluralVerb: false
	},
	"They/Them": {
		subj: "they",
		obj: "them",
		poss: "their",
		possNoun: "theirs",
		refl: "themselves",
		pluralVerb: true
	},
	"Ae/Aer": {
		subj: "ae",
		obj: "aer",
		poss: "aer",
		possNoun: "aers",
		refl: "aerself",
		pluralVerb: false
	},
	"E/Em": {
		subj: "e",
		obj: "em",
		poss: "eir",
		possNoun: "eirs",
		refl: "emself",
		pluralVerb: false
	}
};

setup.normalizePronounKey = function (key) {
	key = String(key || "").trim();

	const map = {
		"he": "He/Him",
		"him": "He/Him",
		"he/him": "He/Him",
		"male": "He/Him",

		"she": "She/Her",
		"her": "She/Her",
		"she/her": "She/Her",
		"female": "She/Her",

		"they": "They/Them",
		"them": "They/Them",
		"they/them": "They/Them",
		"nonbinary": "They/Them",
		"non-binary": "They/Them",

		"ae/aer": "Ae/Aer",
		"e/em": "E/Em"
	};

	return map[key.toLowerCase()] || key || "They/Them";
};

setup.getPronouns = function (char) {
	const fallback = setup.grammarPronouns["They/Them"];

	if (!char) {
		return fallback;
	}

	const rawKey = char.pronouns || char.pronoun || char.pronounSet || char.gender || "They/Them";
	const key = setup.normalizePronounKey(rawKey);

	return setup.grammarPronouns[key] || fallback;
};

setup.pro = function (char, form, cap) {
	if (!char) {
		return "";
	}

	if (setup.isMC(char)) {
		switch (form) {
			case "subj":
				return cap ? "You" : "you";
			case "obj":
				return cap ? "You" : "you";
			case "poss":
				return cap ? "Your" : "your";
			case "possNoun":
				return cap ? "Yours" : "yours";
			case "refl":
				return cap ? "Yourself" : "yourself";
			default:
				return cap ? "You" : "you";
		}
	}

	const p = setup.getPronouns(char) || setup.grammarPronouns["They/Them"];

	let word;

	switch (form) {
		case "subj":
			word = p.subj;
			break;
		case "obj":
			word = p.obj;
			break;
		case "poss":
			word = p.poss;
			break;
		case "possNoun":
			word = p.possNoun;
			break;
		case "refl":
			word = p.refl;
			break;
		default:
			word = p.subj;
			break;
	}

	word = word || "they";

	return cap ? setup.cap(word) : word;
};

setup.usesPluralVerb = function (char, asPronoun) {
	if (setup.isMC(char)) {
		return true;
	}

	if (asPronoun) {
		const p = setup.getPronouns(char);
		return p && p.pluralVerb === true;
	}

	return false;
};

/* More flexible verb helper.
   Use asPronoun: true when the subject is a pronoun.
*/
setup.verbEx = function (char, base, thirdPerson, asPronoun) {
	if (setup.usesPluralVerb(char, asPronoun)) {
		return base;
	}

	return setup.verb(char, base, thirdPerson);
};

setup.beEx = function (char, tense, asPronoun) {
	tense = tense || "present";

	const plural = setup.usesPluralVerb(char, asPronoun);

	if (tense === "past") {
		return plural ? "were" : "was";
	}

	return plural ? "are" : "is";
};

setup.haveEx = function (char, asPronoun) {
	return setup.usesPluralVerb(char, asPronoun) ? "have" : "has";
};

setup.doEx = function (char, asPronoun) {
	return setup.usesPluralVerb(char, asPronoun) ? "do" : "does";
};

/* Possessive name helper: James' / Kevin's */
setup.namePoss = function (name) {
	name = String(name || "Someone").trim();
	return /s$/i.test(name) ? name + "'" : name + "'s";
};

/* Improved article helper.
   Handles: an hour, a university, a one-time thing.
*/
setup.articleEx = function (word) {
	word = String(word || "").trim();
	if (!word) {
		return "";
	}

	const lower = word.toLowerCase();

	if (/^(honest|honor|hour|heir)\b/.test(lower)) {
		return "an";
	}

	if (/^(university|unicorn|unique|user|useful|unit|usual)\b/.test(lower)) {
		return "a";
	}

	if (/^one\b/.test(lower)) {
		return "a";
	}

	return /^[aeiou]/i.test(word) ? "an" : "a";
};

setup.articlePhrase = function (word) {
	word = String(word || "").trim();
	if (!word) {
		return "";
	}

	return setup.articleEx(word) + " " + word;
};

/* Better plural helper with some irregular words. */
setup.irregularPlurals = {
	person: "people",
	man: "men",
	woman: "women",
	child: "children",
	foot: "feet",
	tooth: "teeth",
	mouse: "mice",
	goose: "geese",
	knife: "knives",
	wife: "wives",
	leaf: "leaves",
	wolf: "wolves"
};

setup.pluralize = function (word, count, customPlural) {
	word = String(word || "");

	if (count === 1) {
		return word;
	}

	if (customPlural) {
		return customPlural;
	}

	const lower = word.toLowerCase();

	if (setup.irregularPlurals[lower]) {
		return setup.irregularPlurals[lower];
	}

	if (/(s|sh|ch|x|z)$/i.test(word)) {
		return word + "es";
	}

	if (/[^aeiou]y$/i.test(word)) {
		return word.slice(0, -1) + "ies";
	}

	if (/(f)$/i.test(word)) {
		return word.slice(0, -1) + "ves";
	}

	if (/(fe)$/i.test(word)) {
		return word.slice(0, -2) + "ves";
	}

	return word + "s";
};

setup.countPhrase = function (count, singular, plural) {
	return count + " " + setup.pluralize(singular, count, plural);
};

/* Ordinals: 1st, 2nd, 3rd, 4th, 11th, 21st */
setup.ordinal = function (num) {
	num = Number(num);

	const mod100 = num % 100;

	if (mod100 >= 11 && mod100 <= 13) {
		return num + "th";
	}

	switch (num % 10) {
		case 1:
			return num + "st";
		case 2:
			return num + "nd";
		case 3:
			return num + "rd";
		default:
			return num + "th";
	}
};

/* General word inflection.
   Useful for noises and action words:
   moan -> moans / moaning / moaned
   cry -> cries / crying / cried
*/
setup.inflect = function (word, form) {
	word = String(word || "");

	if (!word) {
		return "";
	}

	form = form || "base";

	if (form === "base") {
		return word;
	}

	if (form === "s") {
		if (/(s|sh|ch|x|z|o)$/i.test(word)) {
			return word + "es";
		}
		if (/[^aeiou]y$/i.test(word)) {
			return word.slice(0, -1) + "ies";
		}
		return word + "s";
	}

	if (form === "ing") {
		if (/ie$/i.test(word)) {
			return word.slice(0, -2) + "ying";
		}
		if (/[^e]e$/i.test(word) && !/(ee|ye|oe)$/i.test(word)) {
			return word.slice(0, -1) + "ing";
		}
		return word + "ing";
	}

	if (form === "ed") {
		if (/e$/i.test(word)) {
			return word + "d";
		}
		if (/[^aeiou]y$/i.test(word)) {
			return word.slice(0, -1) + "ied";
		}
		return word + "ed";
	}

	return word;
};

setup.pickOne = function (arr) {
	arr = arr || [];
	if (arr.length === 0) {
		return "";
	}

	if (setup.pick) {
		return setup.pick(arr);
	}

	return arr[Math.floor(Math.random() * arr.length)];
};

setup.getNoiseTable = function (char) {
	if (!char) {
		return setup.noise.Default;
	}

	/* Direct species match: Human, Canine, Feline, etc. */
	if (char.species && setup.noise[char.species]) {
		return setup.noise[char.species];
	}

	/* Anthro subtype match: Bunny, Fox, Canine, Feline, etc. */
	if (char.anthro && char.anthro.subtype && setup.noise[char.anthro.subtype]) {
		return setup.noise[char.anthro.subtype];
	}

	return setup.noise.Default;
};

setup.noiseWord = function (char, type, form) {
	type = type || "pleasure";
	form = form || "base";

	const table = setup.getNoiseTable(char);
	const defaultTable = setup.noise.Default;

	let pool = table[type];

	if (!pool && defaultTable) {
		pool = defaultTable[type];
	}

	if (!pool) {
		pool = ["moan"];
	}

	const word = setup.pickOne(pool);

	return setup.inflect(word, form);
};
setup.noise = {
    Human:{
		"pleasure": ["moan"],
		"pain": ["groan"],
		"comfort": ["sigh"],
		"surprise": ["squeal", "shout", "yell"],
		"exertion": ["grunt", "pant"],
		"climax": ["moan", "scream", "shout"]
	},
	Canine:{
		"pleasure": ["growl"],
		"pain": ["whimper","yelp"],
		"comfort": ["pant"],
		"surprise": ["bark", "yip"],
		"exertion": ["pant", "growl"],
		"climax": ["howl"]
	},
	Feline:{
		"pleasure": ["purr","meow"],
		"pain": ["hiss", "yowl"],
		"comfort": ["purr"],
		"surprise": ["hiss", "yowl"]
	},
	Fox:{
		"pleasure": ["yip"],
	},
	Cow:{
		"comfort": ["moo"],
		"climax": ["bellow"]
	},
	Mouse:{
		"pleasure": ["squeak"],
		"pain": ["squeak"],
		"comfort": ["squeak"],
		"surprise": ["squeak"],
	},
	Sheep:{
		"comfort": ["bleat"],
	},
	Goat:{
		"comfort": ["bleat"],
	},
	Pig:{
		"comfort": ["oink"],
		"surprise": ["grunt"],
		"climax": ["squeal"]
	},
	Eagle:{
		"climax": ["screech"]
	},
	Default:{
		"pleasure": ["moan"],
		"pain": ["groan", "cry", "squeal"],
		"comfort": ["sigh"],
		"surprise": ["squeal"],
		"exertion": ["grunt", "pant"],
		"climax": ["moan", "scream", "shout"]
	}
}

