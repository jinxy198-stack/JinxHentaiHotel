

setup.get_booty_call_targets = function () {
	var v = State.variables;
	var out = [];
	var key, npc, mems, last;

	if (!v.bootyCallContacts || typeof v.bootyCallContacts !== "object") {
		return out;
	}

	for (key in v.bootyCallContacts) {
		if (!Object.prototype.hasOwnProperty.call(v.bootyCallContacts, key)) {
			continue;
		}

		npc = v.bootyCallContacts[key];
		mems = v.npcMemories && v.npcMemories[key];

		last = (Array.isArray(mems) && mems.length > 0)
			? mems[mems.length - 1]
			: null;

		out.push({
			npcId: key,
			npcName: npc.name || "Someone",
			npc: npc,
			times: Array.isArray(mems) ? mems.length : 0,
			lastTurn: last ? (last.turn || 0) : 0
		});
	}

	out.sort(function (a, b) {
		return (b.lastTurn || 0) - (a.lastTurn || 0);
	});

	return out;
};


setup.getNpcMemoryKey = function (person) {
	if (!person) {
		return null;
	}

	if (person.id != null) {
		return String(person.id);
	}

	if (person.name != null) {
		return String(person.name);
	}

	return null;
};

setup.cloneNpcForMemory = function (person) {
	if (!person) {
		return null;
	}

	/* deep clone so later changes do not break the saved version */
	return JSON.parse(JSON.stringify(person));
};

setup.record_sex_memory = function (person, act) {
	var v = State.variables;
	var key;

	if (!person) {
		return;
	}

	if (!v.npcMemories || typeof v.npcMemories !== "object") {
		v.npcMemories = {};
	}

	if (!v.bootyCallContacts || typeof v.bootyCallContacts !== "object") {
		v.bootyCallContacts = {};
	}

	key = setup.getNpcMemoryKey(person);

	if (!key) {
		return;
	}

	if (!Array.isArray(v.npcMemories[key])) {
		v.npcMemories[key] = [];
	}

	v.npcMemories[key].push({
		npcId: key,
		npcName: person.name || "Someone",
		act: act || "had sex with",
		position: v.sex && v.sex.position ? v.sex.position : null,
		role: v.sex && v.sex.role ? v.sex.role : null,
		location: v.gamelocation || null,
		turn: State.turns
	});

	/* this is the important part for Booty-Call */
	v.bootyCallContacts[key] = setup.cloneNpcForMemory(person);
};
setup.get_all_npc_memories = function () {
	var v = State.variables;
	var all = [];
	var key, i;

	if (!v.npcMemories || typeof v.npcMemories !== "object") {
		return all;
	}

	for (key in v.npcMemories) {
		if (Object.prototype.hasOwnProperty.call(v.npcMemories, key) && Array.isArray(v.npcMemories[key])) {
			for (i = 0; i < v.npcMemories[key].length; i++) {
				all.push(v.npcMemories[key][i]);
			}
		}
	}

	all.sort(function (a, b) {
		return (b.turn || 0) - (a.turn || 0);
	});

	return all;
};