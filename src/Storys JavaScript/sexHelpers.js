(function () {
  const CLIMAX_THRESHOLD = 1000;

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value == null) return [];
    return [value];
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function unique(list) {
    return [...new Set(asArray(list).filter(v => v != null && v !== ""))];
  }

  function mergeUnique(...lists) {
    return [...new Set(lists.flatMap(asArray).filter(v => v != null && v !== ""))];
  }

  function numeric(value, fallback = 0) {
    return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
  }

  function clearCumLocations(sex) {
    if (sex?.Top) sex.Top.cumLocation = [];
    if (sex?.Bottom) sex.Bottom.cumLocation = [];
  }

  function getRequiredBottomParts(act) {
    return act?.["Bottom parts"] ?? act?.["object parts"] ?? [];
  }

  function getBottomPartsMode(act) {
    return act?.["Bottom parts mode"] ?? act?.["object parts mode"] ?? "any";
  }

  /* =========================
   * ACTOR HELPERS
   * ========================= */

  setup.getActors = function (sex) {
    const top = sex?.Top || null;
    const bottom = sex?.Bottom || null;

    return {
      top,
      bottom,
      active: sex?.role === "Bottom" ? bottom : top,
      partner: sex?.role === "Bottom" ? top : bottom
    };
  };

  setup.getTopBottomActors = function (sex) {
    const { top, bottom } = setup.getActors(sex);
    return { Top: top, Bottom: bottom };
  };

  setup.getActActor = function (sex) {
    return setup.getActors(sex).active;
  };

  setup.getActPartner = function (sex) {
    return setup.getActors(sex).partner;
  };

  setup.updateTopBottom = function (sex) {
    if (!sex) return;

    const V = State.variables;
    const mc = V.mc;
    const n = V.n;

    if (!mc || !n) return;

    if (sex.role === "Bottom") {
      sex.Top = n;
      sex.Bottom = mc;
    } else {
      sex.Top = mc;
      sex.Bottom = n;
    }
  };

  /* =========================
   * BODY / GENITAL HELPERS
   * ========================= */

  setup.normalizeBodyparts = function (actor) {
    if (!actor) return;

    const bodyParts = Object.keys(actor.body || {});
    if (actor.genitals) bodyParts.push(actor.genitals);

    actor.bodyparts = unique(bodyParts);
  };

  setup.partMatches = function (actor, required) {
    if (!actor || !required) return false;

    const req = normalize(required);
    const owned = asArray(actor.bodyparts).map(normalize);

    return owned.includes(req);
  };

  setup.hasParts = function (actor, parts) {
    const required = unique(parts).map(normalize);
    if (!required.length) return true;
    if (!actor || !actor.bodyparts) return false;

    const owned = new Set(asArray(actor.bodyparts).map(normalize));
    return required.some(part => owned.has(part));
  };

  setup.actorHasAnyParts = function (actor, parts) {
    return setup.hasParts(actor, parts);
  };

  setup.actorHasAllParts = function (actor, parts) {
    const required = unique(parts).map(normalize);
    if (!required.length) return true;
    if (!actor || !actor.bodyparts) return false;

    const owned = new Set(asArray(actor.bodyparts).map(normalize));
    return required.every(part => owned.has(part));
  };

  setup.actorMeetsPartRequirement = function (actor, parts, mode) {
    return mode === "all"
      ? setup.actorHasAllParts(actor, parts)
      : setup.hasParts(actor, parts);
  };

  setup.genitaltypeMatches = function (actor, required) {
    if (!actor || !required) return false;

    const req = normalize(required);
    const owned = asArray(actor.genitaltype).map(normalize);

    return owned.includes(req);
  };

  setup.actorHasGenitalType = function (actor, genitaltypes) {
    const required = unique(genitaltypes).map(normalize);
    if (!required.length) return true;
    if (!actor || !actor.genitaltype) return false;

    const owned = new Set(asArray(actor.genitaltype).map(normalize));
    return required.some(type => owned.has(type));
  };

/* =========================
 * AROUSAL / PHASE HELPERS
 * ========================= */

/*
	Important:
	- $sex.arousalByKey is the session's real arousal storage.
	- actor.arousal is only a mirrored display value.
	- This prevents arousal from resetting when Top/Bottom actor references are rebuilt.
*/

function getArousalKey(actor) {
	if (!actor) return null;

	const V = State.variables;

	if (actor === V.mc || actor.isMC === true) {
		return "mc";
	}

	if (actor.id != null) {
		return "id:" + actor.id;
	}

	if (actor.uid != null) {
		return "uid:" + actor.uid;
	}

	if (actor.npcId != null) {
		return "npcId:" + actor.npcId;
	}

	if (actor.NPCID != null) {
		return "NPCID:" + actor.NPCID;
	}

	const nameKey = [
		actor.name || "",
		actor.surname || "",
		actor.nickname || ""
	].join("|").trim();

	return nameKey ? "name:" + nameKey : null;
}

function numeric(value, fallback = 0) {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return fallback;
}

function ensureArousalStore(sex) {
	if (!sex) return {};

	if (!sex.arousalByKey || typeof sex.arousalByKey !== "object") {
		sex.arousalByKey = {};
	}

	return sex.arousalByKey;
}

function writeActorArousal(sex, actor, value) {
	if (!sex || !actor) return 0;

	const store = ensureArousalStore(sex);
	const key = getArousalKey(actor);
	const cleanValue = Math.max(0, numeric(value, 0));

	actor.arousal = cleanValue;

	if (key) {
		store[key] = cleanValue;
	}

	return cleanValue;
}

function syncActorArousal(sex, actor) {
	if (!sex || !actor) return 0;

	const store = ensureArousalStore(sex);
	const key = getArousalKey(actor);

	const actorValue = numeric(actor.arousal, null);
	const storedValue = key ? numeric(store[key], null) : null;

	let value = 0;

	if (actorValue !== null && storedValue !== null) {
		/*
			Use the higher value so a temporary actor-side reset to 0
			does not destroy the real session value.
		*/
		value = Math.max(actorValue, storedValue);
	} else if (storedValue !== null) {
		value = storedValue;
	} else if (actorValue !== null) {
		value = actorValue;
	}

	return writeActorArousal(sex, actor, value);
}

setup.ensureSexArousal = function (sex) {
	if (!sex) return sex;

	ensureArousalStore(sex);

	syncActorArousal(sex, sex.Top);
	syncActorArousal(sex, sex.Bottom);
	syncActorArousal(sex, sex.Watcher);

	if (Array.isArray(sex.participants)) {
		sex.participants.forEach(actor => syncActorArousal(sex, actor));
	}

	return sex;
};

setup.getArousal = function (sex, actor) {
	return syncActorArousal(sex, actor);
};

setup.setArousal = function (sex, actor, value) {
	return writeActorArousal(sex, actor, value);
};

setup.addArousal = function (sex, actor, delta, cap) {
	if (!sex || !actor) return 0;

	const current = syncActorArousal(sex, actor);
	const amount = numeric(delta, 0);

	let next = current + amount;

	const capValue = numeric(cap, null);

	if (capValue !== null) {
		if (current >= capValue) {
			return writeActorArousal(sex, actor, current);
		}

		if (next > capValue) {
			next = capValue;
		}
	}

	return writeActorArousal(sex, actor, next);
};

setup.resetEncounterArousal = function (sex) {
	if (!sex) return;

	sex.arousalByKey = {};

	const actors = [
		sex.Top,
		sex.Bottom,
		sex.Watcher
	];

	if (Array.isArray(sex.participants)) {
		sex.participants.forEach(actor => actors.push(actor));
	}

	[...new Set(actors.filter(Boolean))].forEach(actor => {
		writeActorArousal(sex, actor, 0);
	});
};

setup.applyArousalFromAct = function (sex, act) {
	if (!sex || !act || !sex.Top || !sex.Bottom) return;

	setup.ensureSexArousal(sex);

	setup.addArousal(sex, sex.Top, act["Top arousal"], act["Top arousal cap"]);
	setup.addArousal(sex, sex.Bottom, act["Bottom arousal"], act["Bottom arousal cap"]);

	setup.checkForClimax(sex);
};

setup.checkForClimax = function (sex) {
	if (!sex || !sex.Top || !sex.Bottom) return false;
	if (sex.phase === "climax" || sex.phase === "aftercare") return false;

	setup.ensureSexArousal(sex);

	const topArousal = setup.getArousal(sex, sex.Top);
	const bottomArousal = setup.getArousal(sex, sex.Bottom);

	const topClimax = topArousal >= CLIMAX_THRESHOLD;
	const bottomClimax = bottomArousal >= CLIMAX_THRESHOLD;

	if (!topClimax && !bottomClimax) return false;

	sex.phase = "climax";
	sex.climax = {
		Top: topClimax,
		Bottom: bottomClimax
	};
	sex.cumReady = true;

	return true;
};

setup.checkOrgasm = function (actor) {
	return numeric(actor?.arousal) >= CLIMAX_THRESHOLD;
};

  setup.shouldShowCumPanel = function (sex) {
    return !!(sex && (sex.phase === "climax" || sex.cumReady === true));
  };

  setup.setSexPhase = function (sex, phase) {
    if (!sex) return;
    sex.phase = phase;
  };

  setup.advanceSexPhase = function (sex) {
    if (!sex) return;

    const phases = setup.sexPhases || [];
    const index = phases.indexOf(sex.phase);

    sex.phase = index === -1
      ? phases[0]
      : phases[Math.min(index + 1, phases.length - 1)];
  };

  setup.getAllowedActTypesForPhase = function (phase) {
    switch (phase) {
      case "tease":
        return ["tease", "penetrate"];
      case "continue":
        return ["continue", "end"];
      case "aftercare":
        return ["aftercare"];
      default:
        return ["tease"];
    }
  };

  /* =========================
   * CUM LOCATION HELPERS
   * ========================= */

  function filterCumLocationsForTarget(locations, target) {
	  const requiredPartsByLocation = {
		  "on breasts": ["Breasts"],
		  "on chest": ["Chest"]
	  };

	  return unique(locations).filter(loc => {
		  const required = requiredPartsByLocation[normalize(loc)];

		  /* If the location has no body-part rule, keep it. */
		  if (!required) return true;

		  /* If it has a rule, target must have at least one matching part. */
		  return setup.actorHasAnyParts(target, required);
	  });
  }

  setup.updateCumLocations = function (sex) {
	  if (!sex || !sex.Top || !sex.Bottom || !sex.position) {
		  clearCumLocations(sex);
		  return;
	  }

	  const pos = setup.sexpositions?.[sex.position];
	  if (!pos) {
		  clearCumLocations(sex);
		  return;
	  }

	  let topLocations = unique(pos["Top cum locations"]);
	  let bottomLocations = unique(pos["Bottom cum locations"]);

	  const act = setup.sexacts?.[sex.act];
	  if (act) {
		  const actTop = unique(act["Top cum locations"]);
		  const actBottom = unique(act["Bottom cum locations"]);

		  topLocations = mergeUnique(topLocations, actTop);
		  bottomLocations = mergeUnique(bottomLocations, actBottom);

		  const generalCum = unique(act["cum locations"]);
		  if (generalCum.length) {
			  if (sex.climax?.Top) {
				  topLocations = mergeUnique(topLocations, generalCum);
			  }
			  if (sex.climax?.Bottom) {
				  bottomLocations = mergeUnique(bottomLocations, generalCum);
			  }
		  }
	  }
	  sex.Top.cumLocation = filterCumLocationsForTarget(topLocations, sex.Bottom);
    sex.Bottom.cumLocation = filterCumLocationsForTarget(bottomLocations, sex.Top);
  };

  /* =========================
   * ROOM HELPERS
   * ========================= */

  setup.getRoomFurnitureFlags = function (roomKey) {
    const room = setup.RoomTypes?.db?.[roomKey];
    if (!room || !room.contents) return [];

    const flags = Object.keys(room.contents).flatMap(key => {
      return setup.RoomTypes?.furniture?.[key]?.flags || [];
    });

    return unique(flags);
  };

  setup.syncSexWithRoom = function (sex, room) {
    if (!sex || !room) return;
    sex.location = room.location;
    sex.furnitureFlags = room.furnitureFlags;
  };

  setup.roomHasFurniture = function (sex, required) {
    const needed = unique(required);
    if (!needed.length) return true;
    if (!sex?.furnitureFlags) return false;

    return needed.some(flag => sex.furnitureFlags.includes(flag));
  };

  /* =========================
   * POSITION HELPERS
   * ========================= */

  setup.getEncounterSize = function (sex) {
	if (!sex) {
		return 0;
	}

	if (Array.isArray(sex.participants) && sex.participants.length) {
		return [...new Set(sex.participants.filter(Boolean))].length;
	}

	return [...new Set([
		sex.Top,
		sex.Bottom,
		sex.Watcher
	].filter(Boolean))].length;
};

  setup.isPositionValid = function (positionKey, sex) {
    const pos = setup.sexpositions?.[positionKey];
    if (!pos || !sex?.Top || !sex?.Bottom) return false;

    const topParts = pos.Top || [];
    const bottomParts = pos.Bottom || [];

    const bodyOK = pos.equal
      ? (
          (setup.hasParts(sex.Top, topParts) && setup.hasParts(sex.Bottom, bottomParts)) ||
          (setup.hasParts(sex.Bottom, topParts) && setup.hasParts(sex.Top, bottomParts))
        )
      : (
          setup.hasParts(sex.Top, topParts) &&
          setup.hasParts(sex.Bottom, bottomParts)
        );

    if (!bodyOK) return false;

    return setup.roomHasFurniture(sex, pos.furniture);
  };

  setup.getAvailablePositions = function (sex) {
    const size = setup.getEncounterSize(sex);

    return Object.keys(setup.sexpositions || {})
      .filter(key => {
        const pos = setup.sexpositions[key];
        return size <= 2
          ? pos.primary === true
          : pos.primary === true || pos.secondary === true;
      })
      .filter(key => setup.isPositionValid(key, sex));
  };

  setup.ensureValidSexPosition = function (sex) {
    const available = setup.getAvailablePositions(sex);

    if (!available.length) {
      sex.position = null;
      sex.act = null;
      sex.penetration = null;
      sex.phase = "tease";
      clearCumLocations(sex);
      return;
    }

    if (sex.position && available.includes(sex.position)) {
      setup.updateCumLocations(sex);
      return;
    }

    sex.position = available[0];
    sex.act = null;
    sex.penetration = null;
    sex.phase = "tease";
    setup.updateCumLocations(sex);
  };

  /* =========================
   * ACT VALIDATION HELPERS
   * ========================= */

  setup.actAllowsPositionLegacy = function (act, sex) {
    if (!Array.isArray(act?.positions) || !act.positions.length) return true;
    if (!sex?.position || !sex?.role) return false;

    return act.positions.some(entry => {
        const [position, role] = String(entry).split(":");

        if (position !== sex.position) return false;
        if (!role) return true;

        return role === sex.role;
    });
  };
  setup.actAllowsPosition = function (act, sex) {
	sex = sex || State.variables.sex;

	const positions = asArray(act.positions || act["positions"] || []);

	if (!positions.length) {
		return true;
	}

	const currentPosition = sex.position;
	const role = setup.getSexControlRole(sex) || sex.role;

	return positions.some(pos => {
		const parts = String(pos).split(":");
		const posName = parts[0];
		const requiredRole = parts[1] || null;

		if (posName !== currentPosition) {
			return false;
		}

		if (!requiredRole) {
			return true;
		}

		return requiredRole === role;
	});
  };

  setup.actMeetsParts = function (sex, act) {
    const actor = setup.getActActor(sex);
    const partner = setup.getActPartner(sex);

    return (
      setup.actorMeetsPartRequirement(actor, act["Top parts"], act["Top parts mode"]) &&
      setup.actorMeetsPartRequirement(partner, getRequiredBottomParts(act), getBottomPartsMode(act))
    );
  };

  setup.actMeetsPartRequirements = function (sex, act) {
    const { Top, Bottom } = setup.getTopBottomActors(sex);

    if (!setup.actorMeetsPartRequirement(Top, act["Top parts"], act["Top parts mode"])) {
      return false;
    }

    if (!setup.actorMeetsPartRequirement(Bottom, getRequiredBottomParts(act), getBottomPartsMode(act))) {
      return false;
    }

    if (!setup.actorHasGenitalType(Top, act["Top genitaltype"])) {
      return false;
    }

    if (!setup.actorHasGenitalType(Bottom, act["Bottom genitaltype"])) {
      return false;
    }

    return true;
  };

  setup.pickMatchedRequiredPart = function (actor, parts) {
  const required = asArray(parts);
  if (!required.length) return null;

  const owned = new Set(asArray(actor?.bodyparts).map(part =>
    String(part).trim().toLowerCase()
  ));

  const match = required.find(part =>
    owned.has(String(part).trim().toLowerCase())
  );

  return match || required[0] || null;
};

setup.getPenetrationPairs = function (sex) {
	const pen = sex?.penetration;
	if (!pen) return [];

	if (Array.isArray(pen.pairs) && pen.pairs.length) {
		return pen.pairs.filter(p => p && p.topPart && p.bottomPart);
	}

	if (pen.TopPart && pen.BottomPart) {
		return [{
			topPart: pen.TopPart,
			bottomPart: pen.BottomPart
		}];
	}

	return [];
};

setup.actMatchesCurrentPenetration = function (act, sex) {
	const pairs = setup.getPenetrationPairs(sex);
	if (!pairs.length) return false;

	const actTopParts = asArray(act?.["Top parts"]);
	const actBottomParts = asArray(getRequiredBottomParts(act));

	if (!actTopParts.length || !actBottomParts.length) return false;

	const topMode = String(act?.["Top parts mode"] || "any").toLowerCase();
	const bottomMode = String(getBottomPartsMode(act) || "any").toLowerCase();

	const requiresAll =
		topMode === "all" ||
		bottomMode === "all";

	/*
		"all" means the act needs a full paired match.
		This is for mutual acts like:
		Penis -> Mouth
		Mouth -> Penis
	*/
	if (requiresAll) {
		if (actTopParts.length !== actBottomParts.length) return false;
		if (pairs.length !== actTopParts.length) return false;

		const directMatch = actTopParts.every((topPart, i) => {
			const bottomPart = actBottomParts[i];

			return pairs.some(p =>
				p.topPart === topPart &&
				p.bottomPart === bottomPart
			);
		});

		if (directMatch) return true;

		if (act["either direction"] === true || act.equal === true) {
			return actTopParts.every((topPart, i) => {
				const bottomPart = actBottomParts[i];

				return pairs.some(p =>
					p.topPart === bottomPart &&
					p.bottomPart === topPart
				);
			});
		}

		return false;
	}

	/*
		Default "any" mode means:
		Top part can be any listed top part,
		Bottom part can be any listed bottom part.

		This allows:
		Head -> Chest
		to match acts with:
		Top parts: ["Head"]
		Bottom parts: ["Chest", "Breasts"]
	*/
	return pairs.some(p =>
		actTopParts.includes(p.topPart) &&
		actBottomParts.includes(p.bottomPart)
	);
};

setup.isContinueActValid = function (act, sex) {
	return setup.actMatchesCurrentPenetration(act, sex);
};

setup.isEndActValid = function (act, sex) {
	return setup.actMatchesCurrentPenetration(act, sex);
};

setup.getAvailableSexActs = function (sex) {
  const allowedTypes = setup.getAllowedActTypesForPhase(sex.phase);

  return Object.entries(setup.sexacts || {})
    .filter(([_, act]) => {
      const types = asArray(act["action type"]);
      if (types.includes("end")) {
        return (
          sex.phase === "continue" &&
          setup.isEndActValid(act, sex) &&
          setup.actAllowsPosition(act, sex) &&
          setup.actMeetsPartRequirements(sex, act)
        );
      }

      if (types.includes("continue")) {
        return (
          sex.phase === "continue" &&
          setup.isContinueActValid(act, sex) &&
          setup.actAllowsPosition(act, sex) &&
          setup.actMeetsPartRequirements(sex, act)
        );
      }

      if (types.includes("aftercare")) {
        return sex.phase === "aftercare";
      }

      if (!types.some(type => allowedTypes.includes(type))) return false;
      if (!setup.actAllowsPosition(act, sex)) return false;
      if (!setup.actMeetsPartRequirements(sex, act)) return false;
      return true;
    })
    .map(([name]) => name);
};

  /* =========================
   * ACT APPLICATION HELPERS
   * ========================= */

  setup.afterSexStateChange = function (sex) {
    setup.updateCumLocations(sex);
    setup.updateBindings?.();
  };

  setup.applySexAct = function (sex, actKey) {
	  const act = setup.sexacts[actKey];
	  if (!act) return;
	  sex.history.push(actKey);
	  sex.act = actKey;

	  setup.applyArousalFromAct(sex, act);

	  const types = act["action type"];

	  if (types.includes("end")) {
		  sex.penetration = null;
		  sex.phase = "tease";
		  setup.afterSexStateChange(sex);
		  return;
	  }

	  if (types.includes("penetrate")) {
	    const { Top, Bottom } = setup.getTopBottomActors(sex);

	    const topParts = asArray(act["Top parts"] || act["top parts"] || []);
	    const bottomParts = asArray(getRequiredBottomParts(act));

	    const topMode = String(act["Top parts mode"] || "any").toLowerCase();
	    const bottomMode = String(getBottomPartsMode(act) || "any").toLowerCase();

	    let pairs = [];

	    if (
		    (topMode === "all" || bottomMode === "all") &&
		    topParts.length === bottomParts.length
	    ) {
		      pairs = topParts.map((topPart, i) => {
			      const bottomPart = bottomParts[i];

			      return {
				      topPart: setup.pickMatchedRequiredPart(Top, [topPart]),
				      bottomPart: setup.pickMatchedRequiredPart(Bottom, [bottomPart])
			      };
		      }).filter(p => p.topPart && p.bottomPart);
	      } else {
		      const topPart = setup.pickMatchedRequiredPart(Top, topParts);
		      const bottomPart = setup.pickMatchedRequiredPart(Bottom, bottomParts);

		      if (topPart && bottomPart) {
			      pairs = [{
				      topPart: topPart,
				      bottomPart: bottomPart
			      }];
		      }
	      }

	      sex.penetration = {
		      pairs: pairs,
		      /* Keep old names for older UI/code */
		      TopPart: pairs[0]?.topPart || null,
		      BottomPart: pairs[0]?.bottomPart || null
	      };

	      sex.phase = "continue";
	      setup.afterSexStateChange(sex);
	      return;
    }
	  if (types.includes("continue")) {
		  sex.phase = "continue";
		  setup.afterSexStateChange(sex);
		  return;
	  }
	  if (types.includes("tease")) {
		  sex.phase = "tease";
		  setup.afterSexStateChange(sex);
		  return;
	  }
	  if (types.includes("climax")) {
		  sex.phase = "aftercare";
		  setup.afterSexStateChange(sex);
		  return;
	  }
	  setup.updateBindings?.();
  };

  /* =========================
   * TRAIT HELPERS
   * ========================= */

  setup.hasTrait = function (npc, trait) {
    return Array.isArray(npc?.traits) && npc.traits.includes(trait);
  };

  setup.hasAnyTrait = function (npc, traits) {
    if (!Array.isArray(npc?.traits)) return false;
    const needed = unique(traits);
    if (!needed.length) return false;

    return needed.some(trait => npc.traits.includes(trait));
  };

  setup.actBlockedByTraits = function (sex, act) {
    const blocked = act?.["blocked traits"];
    if (!blocked) return false;

    return (
      setup.hasAnyTrait(sex?.Top, blocked.Top) ||
      setup.hasAnyTrait(sex?.Bottom, blocked.Bottom)
    );
  };

  /* =========================
   * SESSION RESET
   * ========================= */

  setup.resetSexSession = function () {
    const V = State.variables;

    if (V.mc) V.mc.arousal = 0;
    if (V.ui?.npc) V.ui.npc.arousal = 0;
    if (V.ui?.npc2) V.ui.npc2.arousal = 0;

    V.orgasm = {
      top: false,
      bottom: false,
      Top: false,
      Bottom: false
    };

    V.seenActions = {};

    V.sex = {
      roles: V.sex?.roles || { dom: null, sub: null },
      role: null,

      Top: null,
      Bottom: null,
      top: null,
      bottom: null,

      position: "Standing",
      previousPosition: null,
      engagedParts: { top: [], bottom: [], Top: [], Bottom: [] },
      penetration: null,
      phase: "tease",
      history: [],
      act: null,
      furnitureFlags: [],
      climax: {},
      cumReady: false,
      stage: "foreplay",
      log: [],
      arousalByKey: {}
    };
  };


  setup.getActPenetrationPairs = function (act) {
	const tops = act["Top parts"] || act["top parts"] || [];
	const bottoms = act["Bottom parts"] || act["bottom parts"] || [];

	const len = Math.min(tops.length, bottoms.length);
	const pairs = [];

	for (let i = 0; i < len; i++) {
		pairs.push({
			topPart: tops[i] ?? null,
			bottomPart: bottoms[i] ?? null
		});
	}

	return pairs.filter(p => p.topPart && p.bottomPart);
  };

  setup.penetrationPairsMatch = function (aPairs, bPairs) {
	if (!Array.isArray(aPairs) || !Array.isArray(bPairs)) return false;
	if (aPairs.length !== bPairs.length) return false;

	return aPairs.every(ap =>
		bPairs.some(bp =>
			ap.topPart === bp.topPart &&
			ap.bottomPart === bp.bottomPart
		)
	);
  };

  setup.describePenetration = function (sex) {
	const pairs = sex?.penetration?.pairs || [];
	if (!pairs.length) return "None";

	return pairs
		.map(p => `${p.topPart} penetrating ${p.bottomPart}`)
		.join(" | ");
  };
})();


setup.sameChar = function (a, b) {
	if (!a || !b) {
		return false;
	}

	if (a === b) {
		return true;
	}

	if (a.id != null && b.id != null) {
		return a.id === b.id;
	}

	if (a.isMC && b.isMC) {
		return true;
	}

	if (a.name && b.name && a.name === b.name) {
		if (!a.surname && !b.surname) {
			return true;
		}

		return a.surname === b.surname;
	}

	return false;
};

setup.getSexQuoteSpeaker = function (sex) {
	const mc = State.variables.mc;

	if (!sex || !mc) {
		return null;
	}

	if (setup.sexSyncLegacy && sex === State.variables.sex) {
		setup.sexSyncLegacy();
	}

	const top =
		sex.Top
		|| (sex.roles && sex.roles.dom)
		|| (sex.roles && sex.roles.Top && sex.roles.Top[0])
		|| null;

	const bottom =
		sex.Bottom
		|| (sex.roles && sex.roles.sub)
		|| (sex.roles && sex.roles.Bottom && sex.roles.Bottom[0])
		|| null;

	const watcher =
		sex.Watcher
		|| (sex.roles && sex.roles.watcher)
		|| (sex.roles && sex.roles.Watcher && sex.roles.Watcher[0])
		|| null;

	/*
		MC is Top, so Bottom NPC speaks.
	*/
	if (setup.sameChar(top, mc)) {
		return bottom
			? {
				char: bottom,
				role: "Bottom"
			}
			: null;
	}

	/*
		MC is Bottom, so Top NPC speaks.
	*/
	if (setup.sameChar(bottom, mc)) {
		return top
			? {
				char: top,
				role: "Top"
			}
			: null;
	}

	/*
	MC is Watcher.
	Let the opposite NPC speak based on the current control role.
  */
  if (setup.sameChar(watcher, mc)) {
	const controlRole = setup.getSexControlRole(sex);

	if (controlRole === "Top") {
		return bottom
			? {
				char: bottom,
				role: "Bottom"
			}
			: null;
	}

	if (controlRole === "Bottom") {
		return top
			? {
				char: top,
				role: "Top"
			}
			: null;
	}

	return null;
  }
};

setup.getSexRoleOf = function (char, sex) {
	if (!char || !sex || !sex.roles) {
		return null;
	}

	if (setup.sameChar(char, sex.roles.dom)) {
		return "Top";
	}

	if (setup.sameChar(char, sex.roles.sub)) {
		return "Bottom";
	}

	if (setup.sameChar(char, sex.roles.watcher)) {
		return "Watcher";
	}

	return null;
};

setup.syncMcSexRole = function (sex) {
	const mc = State.variables.mc;

	if (!sex || !mc) {
		return null;
	}

	const top =
		sex.Top
		|| (sex.roles && sex.roles.dom)
		|| (sex.roles && sex.roles.Top && sex.roles.Top[0])
		|| null;

	const bottom =
		sex.Bottom
		|| (sex.roles && sex.roles.sub)
		|| (sex.roles && sex.roles.Bottom && sex.roles.Bottom[0])
		|| null;

	const watcher =
		sex.Watcher
		|| (sex.roles && sex.roles.watcher)
		|| (sex.roles && sex.roles.Watcher && sex.roles.Watcher[0])
		|| null;

	if (setup.sameChar && setup.sameChar(top, mc)) {
		sex.role = "Top";
		sex.mcRole = "Top";
		return "Top";
	}

	if (setup.sameChar && setup.sameChar(bottom, mc)) {
		sex.role = "Bottom";
		sex.mcRole = "Bottom";
		return "Bottom";
	}

	if (setup.sameChar && setup.sameChar(watcher, mc)) {
		sex.role = "Watcher";
		sex.mcRole = "Watcher";
		return "Watcher";
	}

	sex.role = null;
	sex.mcRole = null;
	return null;
};


setup.getSexControlRole = function (sex) {
	sex = sex || State.variables.sex;

	if (!sex) {
		return null;
	}

	/*
		Normal MC participation:
		Use MC's actual role.
	*/
	if (sex.role === "Top" || sex.role === "Bottom") {
		sex.controlRole = sex.role;
		return sex.controlRole;
	}

	/*
		Watcher mode:
		The player is watching, but needs a Top/Bottom action perspective.
	*/
	if (sex.role === "Watcher") {
		if (sex.controlRole !== "Top" && sex.controlRole !== "Bottom") {
			sex.controlRole = "Top";
		}

		return sex.controlRole;
	}

	return null;
};