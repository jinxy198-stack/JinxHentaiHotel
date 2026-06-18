
/* for the body slider */
window.SugarCubeInput = function (el) {
	const path = el.dataset.var;
	if (!path) return;

	const parts = path.replace(/^\$/, "").split(".");
	let obj = State.variables;

	for (let i = 0; i < parts.length - 1; i++) {
		obj = obj[parts[i]];
		if (!obj) return;
	}

	obj[parts[parts.length - 1]] = Number(el.value);
};



/* === Affection helpers + binder (place in Story JavaScript) === */
(function () {
	/* ------- binder (no timers) ------- */
	function getVarByName(name) {
		try { return State.getVar(name); } catch { return undefined; }
	}
	function applyBinding(el) {
		const varName = el.getAttribute('data-bind');
		if (!varName) return;

		let val = getVarByName(varName);
		let num = Number(val);
		if (!Number.isFinite(num)) num = 0;

		if (el.tagName === 'PROGRESS' || el.tagName === 'METER') {
			let max = Number(el.getAttribute('max'));
			if (!Number.isFinite(max) || max <= 0) { max = 100; el.setAttribute('max', '100'); }
			num = Math.min(max, Math.max(0, num));
			el.setAttribute('value', String(num));  // avoid indeterminate
			el.value = num;
			const sel = el.getAttribute('data-percent-target');
			if (sel) {
				const tgt = document.querySelector(sel);
				if (tgt) tgt.textContent = Math.round((num / max) * 100) + '%';
			}
		} else {
			el.textContent = val != null ? String(val) : '';
		}
	}
	function updateAll(container) {
		(container || document).querySelectorAll('[data-bind]').forEach(applyBinding);
	}
	$(document).on(':passagerender :update :save :load :undo :redo', function (ev) {
		updateAll(ev && ev.content ? ev.content : document);
	});
	setup.updateBindings = function () { updateAll(document); };

	/* ------- affection helpers ------- */
	setup.clamp = function (x, min, max) { return Math.min(max, Math.max(min, Number(x) || 0)); };

	setup.ensureAffection = function () {
		if (!Number.isFinite(Number(State.variables.affection))) State.variables.affection = 0;
	};

	setup.addAffection = function (delta) {
		setup.ensureAffection();
		const v = Number(State.variables.affection) || 0;
		const d = Number(delta) || 0;
		State.variables.affection = setup.clamp(v + d, 0, 100);
		setup.updateBindings();
	};

	/* Optional alias */
	setup.bumpAffection = setup.addAffection;
})();

/* === General helpers & tiny widgets === */
(function () {
  /* One-liner picker is already present: setup.pick(...) in SugarCube runtime. Keep using it. */

  /* Generic confirm->goto widget to kill repetition:
     Usage in passages: <<ConfirmBack "Index-CC" "pages.gender">> */
  Macro.add('ConfirmBack', {
    handler() {
      const dest = this.args[0] || 'Index-CC';
      const pageFlag = this.args[1]; // optional, e.g., "pages.gender"
      const $btn = jQuery(document.createElement('button')).text('Confirm');
      $btn.on('click', () => {
        if (pageFlag) State.setVar(`$${pageFlag}`, true);
        Engine.play(dest);
      });
      jQuery(this.output).append($btn);
    }
  });
  
})();



/* Toggle button*/
$(document).on("click", "#npcsex-toggle", function () {
  const bar = document.getElementById("npcsex-actions-bar");

  const minimized = bar.classList.toggle("minimized");

  this.textContent = minimized ? "▲ Actions" : "▼ Actions";
  this.setAttribute("aria-expanded", !minimized);
});



setup.refreshFullPool = function () {
	const v = State.variables;

	const traits = Array.isArray(v.mc?.traits) ? v.mc.traits : [];

	let pool = [];
	pool = pool.concat(v.CBPool || []);
	pool = pool.concat(v.OCPool || []);
	pool = pool.concat(v.ABPool || []);
	pool = pool.concat(v.MiscPool || []);
	pool = pool.concat(v.UTDRPool || []);

	if (traits.includes("Hates Kids")) {
		pool = pool.filter(function (npc) {
			return npc && typeof npc.age === "number" && npc.age >= 18;
		});
	}
	if (traits.includes("Hates Adults")) {
		pool = pool.filter(function (npc) {
			return npc && typeof npc.age === "number" && npc.age < 18;
		});
	}
	if (traits.includes("Hates Furries")) {
		pool = pool.filter(function (npc) {
			return npc && npc.species === "Human";
		});
	}
  if (traits.includes("Hates Humans")) {
		pool = pool.filter(function (npc) {
			return npc && npc.species === "Anthro";
		});
	}
	v.fullPool = pool;
};


(function () {
  const BODY_DEFAULTS = {
    Head: "Head",
    Face: "Face",
    Mouth: "Mouth",
    Arm: "Arm",
    Leg: "Leg",
    Hand: "Hand",
    Feet: "Feet",
    Ass: "Ass",
    Asshole: "Asshole",
    Nipples: "Nipples",
    Crotch: "Crotch",
    Thigh: "Thigh",
    Finger: "Finger",
    Hip: "Hip",
    Lip: "Lip",
    Tongue: "Tongue",
    Bodymaterial: "Skin"
  };

  const PART_ALIASES = {
    arm: ["arms"],
    arms: ["arm"],

    hand: ["hands"],
    hands: ["hand"],

    leg: ["legs"],
    legs: ["leg"],

    foot: ["feet"],
    feet: ["foot"],

    ear: ["ears"],
    ears: ["ear"],

    eye: ["eyes"],
    eyes: ["eye"],

    finger: ["fingers"],
    fingers: ["finger"],

    hip: ["hips"],
    hips: ["hip"],

    lip: ["lips"],
    lips: ["lip"],

    thigh: ["thighs"],
    thighs: ["thigh"],

    breast: ["breasts"],
    breasts: ["breast"],

    nipple: ["nipples"],
    nipples: ["nipple"]
  };

  function cleanString(value, fallback = "") {
    if (value == null) return fallback;
    const out = String(value).trim();
    return out === "" ? fallback : out;
  }

	function asArray(value) {
  		if (value == null) return [];

  		if (Array.isArray(value)) {
    		return value;
  		}

  		return [value];
	}
	
  function cleanArray(value) {
    return [...new Set(
      asArray(value)
        .map(v => cleanString(v))
        .filter(Boolean)
    )];
  }

  function buildBodyparts(actor) {
    const rawParts = Object.keys(actor.body || {});
    const genitalParts = cleanArray(actor.genitalsList || actor.genitals);

    const out = new Set();

    rawParts.concat(genitalParts).forEach(part => {
      const p = cleanString(part);
      if (!p) return;

      out.add(p);

      const aliases = PART_ALIASES[p.toLowerCase()];
      if (aliases) {
        aliases.forEach(alias => out.add(alias));
      }
    });

    actor.bodyparts = [...out];
    return actor.bodyparts;
  }

  setup.normalizeActor = function (actor) {
    if (!actor || typeof actor !== "object") return actor;

    /* ---------- simple scalar defaults ---------- */
    actor.name = cleanString(actor.name);
    actor.surname = cleanString(actor.surname);
    actor.species = cleanString(actor.species, "Human");
    actor.gender = cleanString(actor.gender);
    actor.trans = cleanString(actor.trans);
    actor.pronouns = cleanString(actor.pronouns);
    actor.sexpref = cleanString(actor.sexpref, "Neutral");
    actor.bodyheight = cleanString(actor.bodyheight, "Average");
    actor.physique = cleanString(actor.physique, "Average");
    actor.origin = cleanString(actor.origin, "Unknown");

    /* keep old field, add clearer alias */
    actor.sexu = cleanString(actor.sexu, cleanString(actor.sexuality));
    actor.sexuality = cleanString(actor.sexuality, actor.sexu);

    /* ---------- normalize list-like fields ---------- */
    actor.nicknameList = cleanArray(actor.nickname);
    actor.nickname = actor.nicknameList[0] || cleanString(actor.nickname);

    actor.traits = cleanArray(actor.traits);
    actor.personality = cleanArray(actor.personality);
    actor.genitaltype = cleanArray(actor.genitaltype);

    /* support either one genital or many */
    actor.genitalsList = cleanArray(actor.genitals);
    actor.genitals = actor.genitalsList[0] || cleanString(actor.genitals);

    /* ---------- body defaults ---------- */
    actor.body = Object.assign({}, BODY_DEFAULTS, actor.body || {});

    /* ensure genitals also exist as body keys */
    actor.genitalsList.forEach(part => {
      if (!actor.body[part]) {
        actor.body[part] = part;
      }
    });

    /* ---------- gender defaults ---------- */
    const g = actor.gender.toLowerCase();

    if (g === "male") {
      delete actor.body.Breasts;
      delete actor.body.Vagina;
      delete actor.body.Clitoris;

      actor.body.Penis = actor.body.Penis || "Penis";
      actor.body.Balls = actor.body.Balls || "Balls";
      actor.body.Chest = actor.body.Chest || "Chest";

      if (!actor.genitals) {
        actor.genitals = "Penis";
        actor.genitalsList = ["Penis"];
      }
    }
    else if (g === "female") {
      delete actor.body.Chest;
      delete actor.body.Penis;
      delete actor.body.Balls;

      actor.body.Vagina = actor.body.Vagina || "Vagina";
      actor.body.Clitoris = actor.body.Clitoris || "Clit";
      actor.body.Breasts = actor.body.Breasts || "Breasts";

      if (!actor.genitals) {
        actor.genitals = "Vagina";
        actor.genitalsList = ["Vagina"];
      }
    }

    /* ---------- optional anthro cleanup ---------- */
    if (cleanString(actor.species).toLowerCase() === "anthro") {
      actor.anthro = actor.anthro || {};
      actor.skincolor = "";
      actor.skinfeatures = cleanString(actor.skinfeatures);
    }

    /* ---------- rebuild bodyparts last ---------- */
    buildBodyparts(actor);

    actor._normalized = true;
    return actor;
  };

  /* keep old helper name working */
  setup.normalizeBodyparts = function (actor) {
    if (!actor || typeof actor !== "object") return actor;
    buildBodyparts(actor);
    return actor;
  };

  setup.normalizeActors = function () {
    for (let i = 0; i < arguments.length; i++) {
      const item = arguments[i];

      if (Array.isArray(item)) {
        item.forEach(actor => setup.normalizeActor(actor));
      } else {
        setup.normalizeActor(item);
      }
    }
  };

  setup.normalizeSexActors = function (sex) {
    if (!sex) return sex;
    setup.normalizeActor(sex.Top);
    setup.normalizeActor(sex.Bottom);
    return sex;
  };
})();

setup.debug = {
	ensure() {
		const v = State.variables;

		if (!v.debug || typeof v.debug !== "object") {
			v.debug = {};
		}

		if (typeof v.debug.enabled !== "boolean") {
			v.debug.enabled = false;
		}

		if (!Array.isArray(v.debug.dialogueLog)) {
			v.debug.dialogueLog = [];
		}

		if (!Array.isArray(v.debug.warnings)) {
			v.debug.warnings = [];
		}

		if (!v.debug.maxLines) {
			v.debug.maxLines = 25;
		}
	},

	safeName(obj) {
		if (!obj) return "None";
		return obj.name || obj.NPCName || obj.id || "Unnamed";
	},

	log(type, message, data = {}) {
		this.ensure();

		const v = State.variables;
		const d = v.debug;

		if (!d.enabled) return;

		let details = "";

		try {
			details = JSON.stringify(data);
		} catch (e) {
			details = "[Could not stringify debug data]";
		}

		d.dialogueLog.unshift({
			turn: State.turns || 0,
			passage: State.passage || "Unknown",
			type,
			message,
			details
		});

		d.dialogueLog = d.dialogueLog.slice(0, d.maxLines);
	},

	quote(source, passageName, data = {}) {
		this.ensure();

		const v = State.variables;

		v.debug.lastQuote = {
			source,
			passageName,
			npc: this.safeName(v.ui && v.ui.npc),
			act: v.sex ? v.sex.act : "None",
			phase: v.sex ? v.sex.phase : "None",
			position: v.sex ? v.sex.position : "None"
		};

		this.log("QUOTE", source + " used " + passageName, Object.assign({}, v.debug.lastQuote, data));
	},

	action(actionName, data = {}) {
		this.ensure();

		const v = State.variables;

		v.debug.lastAction = {
			actionName,
			npc: this.safeName(v.ui && v.ui.npc),
			phase: v.sex ? v.sex.phase : "None",
			position: v.sex ? v.sex.position : "None"
		};

		this.log("ACTION", "Selected action: " + actionName, Object.assign({}, v.debug.lastAction, data));
	},

	scan(label = "Dialogue scan") {
		this.ensure();

		const v = State.variables;
		const warnings = [];

		if (!v.ui) {
			warnings.push("$ui is missing.");
		}

		if (!v.ui || !v.ui.npc) {
			warnings.push("$ui.npc is missing.");
		}

		if (!v.sex) {
			warnings.push("$sex is missing.");
		}

		if (v.sex) {
			if (!v.sex.Top) warnings.push("$sex.Top is missing.");
			if (!v.sex.Bottom) warnings.push("$sex.Bottom is missing.");
			if (!v.sex.phase) warnings.push("$sex.phase is missing.");
			if (!v.sex.position) warnings.push("$sex.position is missing.");
		}

		if (v.sex && v.sex.act && setup.sexacts && !setup.sexacts[v.sex.act] && v.sex.act !== "Climax") {
			warnings.push("Current $sex.act does not exist in setup.sexacts: " + v.sex.act);
		}

		v.debug.warnings = warnings;

		if (warnings.length > 0) {
			this.log("WARNING", label, { warnings });
		}

		return warnings;
	}
};

setup.sexEnsure = function (sex) {
	sex = sex || State.variables.sex || {};

	sex.participants = Array.isArray(sex.participants)
		? sex.participants
		: [];

	sex.roles = sex.roles || {};
	sex.roles.Top = Array.isArray(sex.roles.Top) ? sex.roles.Top : [];
	sex.roles.Bottom = Array.isArray(sex.roles.Bottom) ? sex.roles.Bottom : [];
	sex.roles.Watcher = Array.isArray(sex.roles.Watcher) ? sex.roles.Watcher : [];

	sex.climax = sex.climax || {};
	sex.engagedParts = sex.engagedParts || {};
	sex.history = sex.history || [];
	sex.log = sex.log || [];

	return sex;
};

setup.sexAddParticipant = function (char, role) {
	const sex = setup.sexEnsure(State.variables.sex);

	if (!char) {
		return;
	}

	if (!sex.participants.includes(char)) {
		sex.participants.push(char);
	}

	if (role) {
		setup.sexAssignRole(char, role);
	}
};

setup.sexRemoveFromRoles = function (char) {
	const sex = setup.sexEnsure(State.variables.sex);

	["Top", "Bottom", "Watcher"].forEach(role => {
		sex.roles[role] = sex.roles[role].filter(c => c !== char);
	});
};

setup.sexAssignRole = function (char, role) {
	const sex = setup.sexEnsure(State.variables.sex);

	if (!char || !["Top", "Bottom", "Watcher"].includes(role)) {
		return;
	}

	if (!sex.participants.includes(char)) {
		sex.participants.push(char);
	}

	setup.sexRemoveFromRoles(char);

	sex.roles[role].push(char);

	setup.sexSyncLegacy();
};

setup.sexRoleList = function (role, sex) {
	sex = setup.sexEnsure(sex || State.variables.sex);

	return Array.isArray(sex.roles?.[role])
		? sex.roles[role].filter(Boolean)
		: [];
};

setup.sexRole = function (role, sex) {
	return setup.sexRoleList(role, sex)[0] || null;
};

setup.sexHasRole = function (char, role, sex) {
	return setup.sexRoleList(role, sex).includes(char);
};

setup.sexSyncLegacy = function () {
	const sex = setup.sexEnsure(State.variables.sex);

	/*
		New role arrays.
	*/
	sex.Top = setup.sexRole("Top", sex);
	sex.Bottom = setup.sexRole("Bottom", sex);
	sex.Watcher = setup.sexRole("Watcher", sex);

	/*
		Old aliases.
	*/
	sex.top = sex.Top;
	sex.bottom = sex.Bottom;

	/*
		Older role-choice aliases.
		This is the missing part.
	*/
	sex.roles.dom = sex.Top;
	sex.roles.sub = sex.Bottom;
	sex.roles.watcher = sex.Watcher;

	/*
		MC perspective role.
	*/
	if (sex.Top === State.variables.mc) {
		sex.role = "Top";
	} else if (sex.Bottom === State.variables.mc) {
		sex.role = "Bottom";
	} else if (sex.Watcher === State.variables.mc) {
		sex.role = "Watcher";
	} else {
		sex.role = null;
	}
};

setup.getEncounterSize = function (sex) {
	sex = setup.sexEnsure(sex || State.variables.sex);

	return sex.participants.filter(Boolean).length;
};

setup.startSexEncounter = function (topChar, bottomChar, watcherChar) {
	const V = State.variables;

	V.sex = {
		participants: [],
		roles: {
			Top: [],
			Bottom: [],
			Watcher: []
		},

		Top: null,
		Bottom: null,
		Watcher: null,
		top: null,
		bottom: null,

		position: "Standing",
		previousPosition: null,

		phase: "tease",
		stage: "foreplay",
		act: null,

		actor: null,
		target: null,
		support: null,
		actorRole: null,
		targetRole: null,
		supportRole: null,

		engagedParts: {},
		penetration: null,
		climax: {},
		cumReady: false,

		furnitureFlags: [],
		history: [],
		log: []
	};

	setup.sexAddParticipant(topChar, "Top");
	setup.sexAddParticipant(bottomChar, "Bottom");

	if (watcherChar) {
		setup.sexAddParticipant(watcherChar, "Watcher");
	}

	setup.sexSyncLegacy();
};

setup.sexWatcherJoinAs = function (watcherChar, newRole) {
	if (!watcherChar) {
		return;
	}

	if (!["Top", "Bottom"].includes(newRole)) {
		return;
	}

	setup.sexAssignRole(watcherChar, newRole);
	setup.sexSyncLegacy();
};

setup.sexSetActActors = function (actName, actor, target, support) {
	const sex = setup.sexEnsure(State.variables.sex);

	sex.act = actName;

	sex.actor = actor || setup.sexRole("Top", sex);
	sex.target = target || setup.sexRole("Bottom", sex);
	sex.support = support || setup.sexRole("Watcher", sex);

	sex.actorRole = setup.sexHasRole(sex.actor, "Top", sex)
		? "Top"
		: setup.sexHasRole(sex.actor, "Bottom", sex)
			? "Bottom"
			: setup.sexHasRole(sex.actor, "Watcher", sex)
				? "Watcher"
				: null;

	sex.targetRole = setup.sexHasRole(sex.target, "Top", sex)
		? "Top"
		: setup.sexHasRole(sex.target, "Bottom", sex)
			? "Bottom"
			: setup.sexHasRole(sex.target, "Watcher", sex)
				? "Watcher"
				: null;

	setup.sexSyncLegacy();
};

setup.isAttractedTo = function (fromChar, toChar) {
	if (!fromChar || !toChar) {
		return false;
	}

	const fromGender = fromChar.gender || "";
	const toGender = toChar.gender || "";
	const sexuality = fromChar.sexu || "Unknown";

	switch (sexuality) {
		case "Homosexual":
			return fromGender === toGender;

		case "Heterosexual":
			return fromGender !== toGender;

		case "Bisexual":
		case "Pansexual":
			return true;

		case "Asexual":
			return false;

		default:
			return false;
	}
};

setup.checkAttractionGroup = function (a, b, third) {
	const V = State.variables;

	const chars = [];

	[a, b, third].forEach(char => {
		if (char && !chars.includes(char)) {
			chars.push(char);
		}
	});

	const checks = [];
	let allPass = chars.length >= 2;

	for (let i = 0; i < chars.length; i++) {
		const fromChar = chars[i];

		for (let j = 0; j < chars.length; j++) {
			const toChar = chars[j];

			if (!fromChar || !toChar || fromChar === toChar) {
				continue;
			}

			const result = setup.isAttractedTo(fromChar, toChar);

			checks.push({
				from: fromChar,
				to: toChar,
				fromName: fromChar.name || "Unknown",
				toName: toChar.name || "Unknown",
				result: result
			});

			if (!result) {
				allPass = false;
			}
		}
	}

	V.attractionChecks = checks;
	V.attraction = allPass;

	return allPass;
};