
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