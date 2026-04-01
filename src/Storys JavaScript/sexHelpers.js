
/*
 * Applies arousal changes from a sex act to the current Top and object.
 * Respects optional arousal caps defined on the act.
 * Safely initializes arousal values if missing.
 */
setup.applyArousalFromAct = function (sex, act) {
  if (!sex || !act) return;

  const Top = sex.Top;
  const Bottom  = sex.Bottom;
  if (!Top || !Bottom) return;

  // Ensure arousal values exist and are numeric
  if (typeof Top.arousal !== "number") Top.arousal = 0;
  if (typeof Bottom.arousal  !== "number") Bottom.arousal  = 0;

  // Apply Top arousal, respecting optional cap
  if (typeof act["Top arousal"] === "number") {
    const cap = act["Top arousal cap"];
    if (cap === undefined || Top.arousal < cap) {
      Top.arousal += act["Top arousal"];
    }
  }

  // Apply object arousal, respecting optional cap
  if (typeof act["Bottom arousal"] === "number") {
    const cap = act["Bottom arousal cap"];
    if (cap === undefined || Bottom.arousal < cap) {
      Bottom.arousal += act["Bottom arousal"];
    }
  }
  setup.checkForClimax(sex);
};

/*
 * Updates the NPC arousal UI elements (progress bar + numeric text).
 * Fails safely if elements are missing.
 */
setup.updateNpcArousalUI = function (value) {
  const bar = document.getElementById("npc-arousal-bar");
  const text = document.getElementById("npc-arousal-text");
  if (bar) bar.value = value;
  if (text) text.textContent = value;

};


/*
 * Updates valid cum locations for Top and Bottom
 * based on the current sex position and role.
 */
setup.updateCumLocations = function (sex) {
    // safe setters
    function setEmpty(sex) {
        if (sex?.Top) sex.Top.cumLocation = [];
        if (sex?.Bottom)  sex.Bottom.cumLocation  = [];
    }
    if (!sex || !sex.Top || !sex.Bottom || !sex.position) {
        setEmpty(sex);
        return;
    }
    const pos = setup.sexpositions?.[sex.position];
    if (!pos) {
        setEmpty(sex);
        return;
    }
    // --- 1) Base lists from position ---
    const tBase = Array.isArray(pos["Top cum locations"]) ? pos["Top cum locations"] : [];
    const bBase = Array.isArray(pos["Bottom cum locations"]) ? pos["Bottom cum locations"] : [];
    // Compute base assignment using your existing role rules
    let TopBase = [];
    let BottomBase  = [];

    if (sex.role === "equal") {
        const combined = [...new Set([...tBase, ...bBase])];
        TopBase = combined.slice();
        BottomBase  = combined.slice();
    } else if (sex.role === "Top") {
        TopBase = tBase.slice();
        BottomBase  = bBase.slice();
    } else if (sex.role === "Bottom") {
        TopBase = bBase.slice();
        BottomBase  = tBase.slice();
    } else {
        // fallback
        setEmpty(sex);
        return;
    }

    // --- 2) Optional additions from current act in setup.sexacts ---
    // If you want “all acts valid for this position” instead of only current act,
    // we can extend this later—but this is the safest/fastest first step.
    const actKey = sex.act;
    const act = actKey ? setup.sexacts?.[actKey] : null;

    // Helper: merge + dedupe
    function mergeUnique(baseArr, addArr) {
    if (!Array.isArray(addArr) || addArr.length === 0) return baseArr;
        return [...new Set([...baseArr, ...addArr])];
    }

    // Determine who is the "Top actor" vs "Bottom actor" for this position+role
    // (mirrors your helper idea; kept inline to keep this wiki self-contained)
    const posEqual = !!pos.equal;
    let TopActor = null, BottomActor = null;

    if (posEqual) {
        if (sex.role === "Top") { TopActor = sex.Top; BottomActor = sex.Bottom; }
        else if (sex.role === "Bottom") { TopActor = sex.Bottom; BottomActor = sex.Top; }
    } else {
        if (sex.role === "Top") { TopActor = sex.Top; BottomActor = sex.Bottom; }
        else if (sex.role === "Bottom") { TopActor = sex.Bottom; BottomActor = sex.Top; }
    }

    // Start with base
    let TopFinal = TopBase;
    let BottomFinal  = BottomBase;

    if (act) {
        // A) Direct Top/object additions
        TopFinal = mergeUnique(TopFinal, act["Top cum locations"]);
        BottomFinal  = mergeUnique(BottomFinal,  act["Bottom cum locations"]);

        // B) Generic "cum locations" applies to the ejaculating actor
        // By default, assume the TOP actor is the ejaculator if they have a Penis,
        // otherwise fall back to Top (keeps it predictable).
        const actCum = act["cum locations"];

        if (Array.isArray(actCum) && actCum.length) {
            // Try to pick a likely ejaculator in a simple/robust way
            let ejaculator = null;

            // If you track penetration, prefer that
            if (sex.penetration && sex.penetration.TopPart) {
                // penetration.TopPart belongs to sex.Top by your UI convention
                // (if your penetration object differs, tweak this mapping)
                ejaculator = sex.Top;
            } else {
                // fallback heuristic: TopActor if present, else Top
                ejaculator = TopActor || sex.Top;
            }

            if (ejaculator === sex.Top) {
                TopFinal = mergeUnique(TopFinal, actCum);
            } else if (ejaculator === sex.Bottom) {
                BottomFinal = mergeUnique(BottomFinal, actCum);
            } else {
                // if unknown, just give both the additional options
                TopFinal = mergeUnique(TopFinal, actCum);
                BottomFinal  = mergeUnique(BottomFinal, actCum);
            }
        }
        // C) Act can optionally define Top/Bottom cum locations (same keys as positions)
        const actTop = Array.isArray(act["Top cum locations"]) ? act["Top cum locations"] : [];
        const actBot = Array.isArray(act["Bottom cum locations"]) ? act["Bottom cum locations"] : [];

        if (sex.role === "equal") {
            const combined = [...new Set([...actTop, ...actBot])];
            TopFinal = mergeUnique(TopFinal, combined);
            BottomFinal  = mergeUnique(BottomFinal, combined);
        } else if (sex.role === "Top") {
            // Top is Top-role in your current mapping
            TopFinal = mergeUnique(TopFinal, actTop);
            BottomFinal  = mergeUnique(BottomFinal, actBot);
        } else if (sex.role === "Bottom") {
            TopFinal = mergeUnique(TopFinal, actBot);
            BottomFinal  = mergeUnique(BottomFinal, actTop);
        }
    }

    // --- 3) Write back ---
    sex.Top.cumLocation = TopFinal;
    sex.Bottom.cumLocation  = BottomFinal;
};

setup.shouldShowCumPanel = function (sex) {
  if (!sex || !sex.Top || !sex.Bottom) return false;

  // ✅ Example criteria options (pick what matches your system):
  // A) Phase based:
  if (sex.phase === "climax") return true;

  // B) Or: arousal threshold:
  // if ((sex.Top.arousal || 0) >= 900) return true;

  // C) Or: you set a flag when a climax is triggered:
  // if (sex.cumReady === true) return true;

  return false;
};

setup.setSexPhase = function (sex, phase) {
  if (!sex) return;
  sex.phase = phase;
};

/* Optional: move to next phase */
setup.advanceSexPhase = function (sex) {
  if (!sex) return;
  const idx = setup.sexPhases.indexOf(sex.phase);
  if (idx === -1) { sex.phase = setup.sexPhases[0]; return; }
  sex.phase = setup.sexPhases[Math.min(idx + 1, setup.sexPhases.length - 1)];
};

/*checks if a character reached climax */
setup.checkForClimax = function (sex) {
  if (!sex || !sex.Top || !sex.Bottom) return false;

  // Don’t re-trigger if already in climax/aftercare
  if (sex.phase === "climax" || sex.phase === "aftercare") return false;

  // Pick thresholds that match your balance
  const THRESH = 1000;

  const sA = (typeof sex.Top.arousal === "number") ? sex.Top.arousal : 0;
  const oA = (typeof sex.Bottom.arousal  === "number") ? sex.Bottom.arousal  : 0;

  // Trigger if either hits threshold
  if (sA >= THRESH || oA >= THRESH) {
    sex.phase = "climax";

    // Optional: flag who is climaxing (useful for UI)
    sex.climax = sex.climax || {};
    sex.climax.Top = (sA >= THRESH);
    sex.climax.Bottom  = (oA >= THRESH);

    // Optional: open cum selection immediately
    sex.cumReady = true;

    return true;
  }

  return false;
};




/*
 * Collects all furniture flags present in a room.
 * Used for validating positions and acts.
 */
setup.getRoomFurnitureFlags = function (roomKey) {
    const room = setup.RoomTypes.db[roomKey];
    if (!room) return [];

    const flags = [];

    Object.keys(room.contents).forEach(furnKey => {
        const furn = setup.RoomTypes.furniture[furnKey];
        if (furn && furn.flags) {
            flags.push(...furn.flags);
        }
    });

    return [...new Set(flags)];
};

/*
 * Synchronizes sex state with the current room context.
 */
setup.syncSexWithRoom = function (sex, room) {
    sex.location = room.location;
    sex.furnitureFlags = room.furnitureFlags;
};


/*
 * Builds a normalized bodyparts list for an actor,
 * including genitals if present.
 */
setup.normalizeBodyparts = function(actor) {
    if (!actor || !actor.body) return;

    const parts = Object.keys(actor.body);

    if (actor.genitals) {
        parts.push(actor.genitals);
    }

    actor.bodyparts = [...new Set(parts)];
};

/*
 * Returns total number of participants in the encounter.
 */
setup.getEncounterSize = function (sex) {
    let count = 0;
    if (sex.Top) count++;
    if (sex.Bottom) count++;

    if (Array.isArray(sex.participants)) {
        count += sex.participants.length;
    }

    return count;
};

/*
 * Case-insensitive body part equality check.
 */
setup.partEquals = function (a, b) {
    if (!a || !b) return false;
    return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
};

/*
 * Checks if an actor has a required body part,
 * accounting for aliases.
 */
setup.partMatches = function(actor, required) {
    if (!actor || !actor.bodyparts || !required) return false;

    const req = required.toLowerCase();

    return actor.bodyparts.some(p => {
        const part = p.toLowerCase();
        return (
            part === req 
        );
    });
};

/*
 * Checks whether an actor has at least one
 * of the required body parts.
 */
setup.hasParts = function(actor, parts) {
    if (!actor || !actor.bodyparts) return false;
    if (!parts || parts.length === 0) return true;

    return parts.some(p => setup.partMatches(actor, p));
};




/*
 * Validates whether a sex position can be used
 * given body parts, roles, and furniture constraints.
 */
setup.isPositionValid = function (positionKey, sex) {
  const pos = setup.sexpositions[positionKey];
  if (!pos) return false;

  // Decide who is physically Top/Bottom based on MC role rule in updateSubjectObject:
  // role "Top"    => Top=MC (Top), Bottom=NPC (Bottom)
  // role "Bottom" => Top=NPC (Top), Bottom=MC (Bottom)
  const TopActor    = (sex.role === "Top") ? sex.Top : sex.Top; // NPC is Top when MC is Bottom (Top is NPC)
  const BottomActor = (sex.role === "Bottom") ? sex.Bottom  : sex.Bottom;  // MC is Bottom when role is Bottom (object is MC)

  const TopParts = pos.Top || [];
  const BottomParts = pos.Bottom || [];

  let bodyOK = false;

  if (pos.equal) {
    bodyOK =
      (setup.hasParts(sex.Top, TopParts) && setup.hasParts(sex.Bottom, BottomParts)) ||
      (setup.hasParts(sex.Bottom, TopParts) && setup.hasParts(sex.Top, BottomParts));
  } else {
    // Consistent: pos.Top always checked on TopActor, pos.Bottom on BottomActor
    bodyOK =
      setup.hasParts(TopActor, TopParts) &&
      setup.hasParts(BottomActor, BottomParts);
  }

  if (!bodyOK) return false;

  if (pos.furniture?.length) {
    if (!sex.furnitureFlags?.length) return false;
    if (!pos.furniture.some(f => sex.furnitureFlags.includes(f))) return false;
  }

  return true;
};

/*
 * Returns all valid sex positions for the current encounter.
 * Filters by encounter size and position validity.
 */
setup.getAvailablePositions = function (sex) {
    const size = setup.getEncounterSize(sex);

    return Object.keys(setup.sexpositions)
        .filter(posKey => {
            const pos = setup.sexpositions[posKey];

            if (size <= 2) {
                return pos.primary === true;
            }

            return pos.primary === true || pos.secondary === true;
        })
        .filter(posKey => setup.isPositionValid(posKey, sex));
};

/*
 * Checks whether an act is allowed in the current position and role.
 */
setup.actAllowsPosition = function(act, sex) {
    if (!act.positions || !Array.isArray(act.positions)) return true;

    return act.positions.some(p => {
        const [pos, role] = p.split(":");
        if (pos !== sex.position) return false;
        if (!role) return true;
        if (role === sex.role) return true;
        if (sex.role === "equal") return true;
        return false;
    });
};

/*
 * Returns all valid sex acts for the current state.
 * Handles phase logic, end acts, body parts, and position constraints.
 */
setup.getAvailableSexActs = function (sex) {
    return Object.entries(setup.sexacts)
        .filter(([_, act]) => {
            const types = act["action type"];

            // END acts already do a penetration validity check
            if (types.includes("end")) {
                return (
                    sex.phase === "continue" &&
                    setup.isEndActValid(act, sex)
                );
            }

            // NEW: CONTINUE acts must match current penetration
            if (types.includes("continue")) {
                return (
                    sex.phase === "continue" &&
                    setup.isContinueActValid(act, sex)
                );
            }

            // for aftercare
            if (types.includes("aftercare")) {
                return (
                    sex.phase === "aftercare"
                );
            }

            const allowed = setup.getAllowedActTypesForPhase(sex.phase);
            if (!types.some(t => allowed.includes(t))) return false;

            if (!setup.actAllowsPosition(act, sex)) return false;
            if (!setup.actMeetsPartRequirements(sex, act)) return false;

            return true;
        })
        .map(([name]) => name);
};



// Resolve physical Top/Bottom actors consistently from your current binding scheme.
// If your updateSubjectObject already binds Top/object based on MC role,
// you can treat: Top = TopActor, object = BottomActor OR vice-versa.
// Choose ONE convention and stick with it.
// This version assumes: Top = TopActor, object = BottomActor.
setup.getTopBottomActors = function(sex) {
  return {
    Top: sex.Top,
    Bottom: sex.Bottom
  };
};

// Returns true if actor has any of the listed parts (empty list = true)
setup.actorHasAnyParts = function(actor, parts) {
  return setup.hasParts(actor, parts);
};


setup.actorHasAllParts = function (actor, parts) {
    if (!actor || !actor.bodyparts) return false;
    if (!parts || parts.length === 0) return true;

    return parts.every(p => setup.partMatches(actor, p));
};

// Role-stable act requirement check.
// Supports either the old keys ("Top parts"/"object parts") OR new keys ("Top parts"/"Bottom parts").
setup.actorMeetsPartRequirement = function (actor, parts, mode) {
    if (mode === "all") {
        return setup.actorHasAllParts(actor, parts);
    }

    // default behavior stays the same
    return setup.hasParts(actor, parts);
};

setup.actMeetsPartRequirements = function (sex, act) {
    const { Top, Bottom } = setup.getTopBottomActors(sex);

    if (act["Top parts"] || act["Bottom parts"]) {
        const TopMode = act["Top parts mode"] || "any";
        const BottomMode = act["Bottom parts mode"] || "any";

        if (!setup.actorMeetsPartRequirement(Top, act["Top parts"], TopMode)) {
            return false;
        }

        if (!setup.actorMeetsPartRequirement(Bottom, act["Bottom parts"], BottomMode)) {
            return false;
        }
    } else {
        if (!setup.actMeetsParts(sex, act)) return false;
    }

    if (act["Top genitaltype"] || act["Bottom genitaltype"]) {
        if (!setup.actorHasGenitalType(Top, act["Top genitaltype"])) return false;
        if (!setup.actorHasGenitalType(Bottom, act["Bottom genitaltype"])) return false;
    }

    return true;
};

setup.actorHasGenitalType = function(actor, genitaltype) {
  if (!actor || !actor.genitaltype) return false;
  if (!genitaltype || genitaltype.length === 0) return true;

  return genitaltype.some(gt => setup.genitaltypeMatches(actor, gt));
};

setup.genitaltypeMatches = function(actor, required) {
  if (!actor || !actor.genitaltype || !required) return false;

  const req = required.toLowerCase();

  return actor.genitaltype.some(gt =>
    String(gt).toLowerCase() === req
  );
};








// In your current architecture, $sex.role is the MC's role.
// So the MC is:
// - Top when role is "Top"
// - object  when role is "Bottom"
setup.getActActor = function (sex) {
  return sex.role === "Top" ? sex.Top : sex.Bottom;
};

setup.getActPartner = function (sex) {
  return sex.role === "Top" ? sex.Bottom : sex.Top;
};

// Checks act requirements using actor/partner mapping (MC-centric).
setup.actMeetsParts = function (sex, act) {
  const actor   = setup.getActActor(sex);
  const partner = setup.getActPartner(sex);

  if (!setup.hasParts(actor, act["Top parts"])) return false;
  if (!setup.hasParts(partner, act["Bottom parts"])) return false;

  return true;
};

setup.afterSexStateChange = function (sex) {
  setup.updateCumLocations(sex);
  setup.updateBindings?.(); // safe-call if it exists
};


/*
 * Applies a selected sex act and updates encounter state.
 */
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
        sex.penetration = {
            TopPart: act["Top parts"]?.[0] ?? null,
            BottomPart: act["Bottom parts"]?.[0] ?? null
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

    setup.updateBindings();
};

/*
 * Checks whether an actor has reached orgasm threshold.
 */
setup.checkOrgasm = function (actor) {
    return actor.arousal >= 1000;
};

/*
 * Returns which act types are allowed for a given phase.
 */
setup.getAllowedActTypesForPhase = function (phase) {
    switch (phase) {
        case "tease":
            return ["tease", "penetrate"];
        case "continue":
            return ["continue", "end"];
        case "aftercare":
            return ["aftercare"]    
        default:
            return ["tease"];
    }
};

/*
 * Checks if the current room contains required furniture.
 */
setup.roomHasFurniture = function (sex, required) {
    if (!required || required.length === 0) return true;
    if (!sex.furnitureFlags) return false;

    return required.some(f => sex.furnitureFlags.includes(f));
};

/*
 * Ensures the current sex position remains valid.
 * Falls back to the first valid position if needed.
 */
setup.ensureValidSexPosition = function (sex) {
    const available = setup.getAvailablePositions(sex) || [];

    if (available.length === 0) {
        sex.position = null;
        sex.act = null;
        sex.penetration = null;
        sex.phase = "tease";
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

/*
 * Validates whether an END act correctly matches
 * the current penetration configuration.
 */
setup.isEndActValid = function (act, sex) {
  if (!sex || !sex.penetration) return false;
  if (!sex.penetration.TopPart || !sex.penetration.BottomPart) return false;

  const sp = sex.penetration.TopPart;
  const op = sex.penetration.BottomPart;

  const aSub = act["Top parts"]?.[0];
  const aObj = act["Bottom parts"]?.[0];
  if (!aSub || !aObj) return false;

  // Strict match (direction matters)
  if (aSub === sp && aObj === op) return true;

  // Only allow inverse if the act explicitly says it's symmetric
  if (act["either direction"] === true || act.equal === true) {
    if (aSub === op && aObj === sp) return true;
  }

  return false;
};


setup.isContinueActValid = function (act, sex) {
    // Must currently be penetrating something
    if (!sex || !sex.penetration) return false;
    if (!sex.penetration.TopPart || !sex.penetration.BottomPart) return false;

    // Act must declare what it continues (use first required parts)
    const aSub = act["Top parts"]?.[0];
    const aObj = act["Bottom parts"]?.[0];
    if (!aSub || !aObj) return false;

    // Strict match (direction matters):
    return (
        aSub === sex.penetration.TopPart &&
        aObj === sex.penetration.BottomPart
    );

    // If you ever want "either direction counts", use:
    // return (
    //   (aSub === sp && aObj === op) ||
    //   (aSub === op && aObj === sp)
    // );
};



setup.updateTopBottom = function (sex) {
    if (!sex) return;

    const mc = State.variables.mc;
    const n  = State.variables.n;

    if (!mc || !n) return;

    if (sex.role === "Top") {
        sex.Top = mc;
        sex.Bottom  = n;
    }
    else if (sex.role === "Bottom") {
        sex.Top = n;
        sex.Bottom  = mc;
    }
    else {
        sex.Top = mc;
        sex.Bottom  = n;
    }
};

setup.hasTrait = function (npc, trait) {
  return Array.isArray(npc?.traits) && npc.traits.includes(trait);
};

setup.hasAnyTrait = function (npc, traits) {
  if (!Array.isArray(traits) || traits.length === 0) return false;
  if (!Array.isArray(npc?.traits)) return false;
  return traits.some(t => npc.traits.includes(t));
};

// Returns true if this act is blocked by Top/Bottom traits
setup.actBlockedByTraits = function (sex, act) {
  const bt = act?.["blocked traits"];
  if (!bt) return false;

  const subjBlocked = setup.hasAnyTrait(sex?.Top, bt.Top);
  const objBlocked  = setup.hasAnyTrait(sex?.Bottom,  bt.Bottom);

  return subjBlocked || objBlocked;
};