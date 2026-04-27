
setup.personalityTips = {
	Brash: "Somewhat rude but still has some kindness inside.",
	Brave: "Bold, assertive, and willing to take risks.",
	Bubbly: "Consistently cheerful, enthusiastic, and social.",
	Childish: "Likes behaving immaturely, regardless of age.",
	Chill: "Steady, patient, and unlikely to rush things.",
	Confident: "Sure of yourself and likes to take the lead.",
	Energetic: "Full of life and lots of energy to spare.",
	Flamboyant: "Strikingly bold, showy, or attracting attention.",
	Kind: "Gentle, considerate, and caring.",
	Lazy: "Doesn't like to be very active.",
	Logical: "Socially stunted but very rational.",
	Modest: "Does not think themselves higher than others.",
	Naive: "A charming innocent view of the world, though knows enough.",
	Nerdy: "Passonate and knowledgable on a specific academic.",
	Playful: "Likes to fool around, lewd or not.",
	Provocative: "Sex is always on your mind and you want to focus on it.",
	Sassy: "Likes to tease, and is slightly disrespectful.",
	Selfish: "Thinks of themself first before anyone else.",
	Stubborn: "Hard to convince to see things from other's point of view.",
	Terse: "Speaks brief, concise, and to the point, often using few words.",
	Timid: "Shy, hesitant, and easily flustered.",
	Tough: "Blunt, resilient, and hard to intimidate.",
	Upbeat: "Likes being positive, even when things seem bleak.",
};

setup.traitTips = {
	"Mute": "This character cannot speak.",
	"Will Not Top": "They will not perform penetrative actions as the active/top partner.",
	"Will Not Bottom": "They will not receive penetrative actions as the passive/bottom partner.",
	"Hates Kids": "If the player character has this then characters under 18 will not exist",
	"Hates Adults": "If the player character has this then characters over 18 will not exist",
	"Hates Furries": "If the player character has this then characters who are antho will not exist.",
	"Hates Humans": "If the player character has this then characters who are human will not exist.",
	"Flight": "Is capable of flight or levitation.",
	"Elastic": "Is able to stretch or elongate their body.",
	"Super Strength":"Stronger than they appear.",
	"Blind": "They cannot see anything around them.",
	"Ticklish": "Their body is sensitive and touching might make them laugh.",
	"Sex Addict": "Always seeking sexual encounters.",
	"Fighter": "Trained to fight.",
	"Scholar": "Seeks to learn",
	"Athlete": "Likes physical activities",
	"Celebrity": "Popular among their peers",
	"Glutton": "Enjoys eating food a lot.",
	"Genius": "Noticably smarter than the average person.",
	"Gamer": "Enjoy's playing games, (not exclusive to videogames).",
	"Rainbow Cum": "For some reason their cum is multicolored, and tastes kinda fruity.",
	"Hero": "Fights injustice on a regular basis.",
	"Criminal": "Commit's crimes on a regular basis",
	"Noble": "A person of high wealth and status",
	"Outlander": "Not used to living in the comforts of civilzation.",
	"Emissary": "The chosen of the god of the hotel."
};




/* Main trait list */
setup.traits = {
	list: [
		"Mute",
		"Will Not Top",
		"Will Not Bottom",
		"Sex Addict",
		"Fighter",
		"Scholar",
		"Athlete",
		"Celebrity",
		"Glutton",
		"Genius",
		"Gamer",
		"Hero",
		"Criminal",
		"Noble",
		"Outlander",
		"Ticklish"
	],

	conflicts: {
		"Will Not Top": ["Will Not Bottom"],
		"Will Not Bottom": ["Will Not Top"],

		"Hero": ["Criminal"],
		"Criminal": ["Hero"],

		"Noble": ["Outlander"],
		"Outlander": ["Noble"]
	}
};
/* Checks if adding this trait would conflict with existing traits */
/* Checks if adding this trait would conflict with existing traits */
setup.traits.canAddTrait = function (char, trait) {
	var current;
	var conflicts;
	var reverseConflicts;
	var i;
	var existingTrait;

	if (!char) {
		return false;
	}

	if (!Array.isArray(char.traits)) {
		char.traits = [];
	}

	current = char.traits;

	/* Prevent duplicates */
	if (current.includes(trait)) {
		return false;
	}

	conflicts = setup.traits.conflicts[trait] || [];

	for (i = 0; i < current.length; i++) {
		existingTrait = current[i];

		/* Checks if the new trait conflicts with an existing trait */
		if (conflicts.includes(existingTrait)) {
			return false;
		}

		/* Also checks if the existing trait conflicts with the new trait */
		reverseConflicts = setup.traits.conflicts[existingTrait] || [];

		if (reverseConflicts.includes(trait)) {
			return false;
		}
	}

	return true;
};


/* Adds one trait safely */
setup.traits.addTrait = function (char, trait) {
	if (!setup.traits.canAddTrait(char, trait)) {
		return false;
	}

	char.traits.push(trait);
	return true;
};


/* Adds random traits safely, up to maxAmount */
setup.traits.addRandomTraits = function (char, maxAmount, options) {
	var pool;
	var amount;
	var added;
	var trait;
	var index;

	if (!char) {
		return [];
	}

	if (!Array.isArray(char.traits)) {
		char.traits = [];
	}

	maxAmount = maxAmount || 2;
	options = options || {};

	/*
		By default, this gives 0 to maxAmount traits.
		If you want exactly maxAmount traits, use:
		{ exact: true }
	*/
	amount = options.exact ? maxAmount : random(0, maxAmount);

	pool = setup.traits.list.slice();
	added = [];

	while (added.length < amount && pool.length > 0) {
		index = random(0, pool.length - 1);
		trait = pool.splice(index, 1)[0];

		if (setup.traits.addTrait(char, trait)) {
			added.push(trait);
		}
	}

	return added;
};