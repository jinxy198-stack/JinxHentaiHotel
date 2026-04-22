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

  function applyArousalDelta(actor, delta, cap) {
    if (!actor || typeof delta !== "number") return;

    actor.arousal = numeric(actor.arousal);

    if (cap !== undefined && actor.arousal >= cap) return;

    actor.arousal += delta;

    if (typeof cap === "number" && actor.arousal > cap) {
      actor.arousal = cap;
    }
  }

  setup.applyArousalFromAct = function (sex, act) {
    if (!sex || !act || !sex.Top || !sex.Bottom) return;

    applyArousalDelta(sex.Top, act["Top arousal"], act["Top arousal cap"]);
    applyArousalDelta(sex.Bottom, act["Bottom arousal"], act["Bottom arousal cap"]);

    setup.checkForClimax(sex);
  };

  setup.checkForClimax = function (sex) {
    if (!sex || !sex.Top || !sex.Bottom) return false;
    if (sex.phase === "climax" || sex.phase === "aftercare") return false;

    const topArousal = numeric(sex.Top.arousal);
    const bottomArousal = numeric(sex.Bottom.arousal);

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

	sex.Top.cumLocation = topLocations;
	sex.Bottom.cumLocation = bottomLocations;
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
    let count = 0;
    if (sex?.Top) count++;
    if (sex?.Bottom) count++;
    if (Array.isArray(sex?.participants)) count += sex.participants.length;
    return count;
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

  setup.actAllowsPosition = function (act, sex) {
    if (!Array.isArray(act?.positions) || !act.positions.length) return true;
    if (!sex?.position || !sex?.role) return false;

    return act.positions.some(entry => {
        const [position, role] = String(entry).split(":");

        if (position !== sex.position) return false;
        if (!role) return true;

        return role === sex.role;
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

setup.isContinueActValid = function (act, sex) {
  if (!sex?.penetration?.TopPart || !sex?.penetration?.BottomPart) return false;

  const actTopParts = asArray(act?.["Top parts"]);
  const actBottomParts = asArray(getRequiredBottomParts(act));

  if (!actTopParts.length || !actBottomParts.length) return false;

  return (
    actTopParts.includes(sex.penetration.TopPart) &&
    actBottomParts.includes(sex.penetration.BottomPart)
  );
};

setup.isEndActValid = function (act, sex) {
  if (!sex?.penetration?.TopPart || !sex?.penetration?.BottomPart) return false;

  const currentTop = sex.penetration.TopPart;
  const currentBottom = sex.penetration.BottomPart;

  const actTopParts = asArray(act?.["Top parts"]);
  const actBottomParts = asArray(getRequiredBottomParts(act));

  if (!actTopParts.length || !actBottomParts.length) return false;

  if (
    actTopParts.includes(currentTop) &&
    actBottomParts.includes(currentBottom)
  ) {
    return true;
  }

  if (act["either direction"] === true || act.equal === true) {
    return (
      actTopParts.includes(currentBottom) &&
      actBottomParts.includes(currentTop)
    );
  }

  return false;
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

  sex.penetration = {
    TopPart: setup.pickMatchedRequiredPart(Top, act["Top parts"]),
    BottomPart: setup.pickMatchedRequiredPart(Bottom, getRequiredBottomParts(act))
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
      log: []
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