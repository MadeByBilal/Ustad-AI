export const CATEGORY_ESTIMATES = {
    plumber: { min: 800, max: 1500 },
    electrician: { min: 1500, max: 4000 },
    ac_technician: { min: 2000, max: 6000 },
    carpenter: { min: 1500, max: 5000 },
};
/**
 * Visit-and-check fee: the only amount the customer commits to upfront.
 * The main repair payment is settled after the ustad inspects the problem.
 */
export const INSPECTION_FEES = {
    plumber: 300,
    electrician: 350,
    ac_technician: 500,
    carpenter: 300,
};
export function inspectionFeeFor(category) {
    return category ? INSPECTION_FEES[category] : 0;
}
export const CANONICAL_SKILLS = {
    plumber: ["faucet repair", "pipe fitting", "drain cleaning", "geyser installation", "water tank installation"],
    electrician: ["wiring", "fault finding", "switchboard installation", "inverter installation", "lighting"],
    ac_technician: ["ac repair", "compressor service", "gas refilling", "ac installation", "deep cleaning"],
    carpenter: ["door repair", "furniture making", "cabinet repair", "wardrobe installation", "kitchen cabinets"],
};
const HIGH_COMPLEXITY_KEYWORDS = [
    "installation",
    "replace",
    "replacement",
    "compressor",
    "main wiring",
    "complete wiring",
    "wardrobe",
    "kitchen cabinets",
    "renovation",
];
const LOW_COMPLEXITY_KEYWORDS = [
    "tighten",
    "minor",
    "small leak",
    "switch repair",
    "faucet repair",
    "drain cleaning",
];
export function complexityFor(text) {
    const normalized = text.toLowerCase();
    if (HIGH_COMPLEXITY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
        return "high";
    }
    if (LOW_COMPLEXITY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
        return "low";
    }
    return "medium";
}
const KEYWORD_RULES = [
    {
        category: "electrician",
        keywords: [
            "short circuit", "wiring", "fuse", "switchboard", "switch", "socket",
            "inverter", "generator", "lighting", "bijli", "luce", "shock", "current",
            "main switch", "db", "meter", "power outage",
        ],
        subcategory: "electrical_fault",
        skills: ["fault finding", "wiring", "switchboard installation", "inverter installation", "lighting"],
    },
    {
        category: "plumber",
        keywords: [
            "leak", "tap", "faucet", "pani", "paani", "water tank", "pipe",
            "bathroom", "toilet", "geyser", "drain", "naali", "motor",
            "nal", "nala", "towel radiator",
        ],
        subcategory: "plumbing_fault",
        skills: ["pipe fitting", "faucet repair", "drain cleaning", "geyser installation", "water tank installation"],
    },
    {
        category: "ac_technician",
        keywords: [
            "air conditioner", "window ac", "split ac", "compressor",
            "gas refill", "refrigerant", "cooler", "ac", "hawa",
        ],
        subcategory: "ac_fault",
        skills: ["ac repair", "gas refilling", "compressor service", "ac installation", "deep cleaning"],
    },
    {
        category: "carpenter",
        keywords: [
            "darwaza", "door", "lakri", "lakdi", "wood", "furniture",
            "almari", "cabinet", "wardrobe", "sofa", "kitchen",
            "table", "chair", "shelf",
        ],
        subcategory: "carpentry_work",
        skills: ["door repair", "furniture making", "cabinet repair", "wardrobe installation", "kitchen cabinets"],
    },
];
const SKILL_KEYWORDS = {
    wiring: "wiring",
    fuse: "fault finding",
    "short circuit": "fault finding",
    switchboard: "switchboard installation",
    switch: "switchboard installation",
    inverter: "inverter installation",
    lighting: "lighting",
    leak: "pipe fitting",
    tap: "faucet repair",
    faucet: "faucet repair",
    pani: "pipe fitting",
    paani: "pipe fitting",
    pipe: "pipe fitting",
    drain: "drain cleaning",
    naali: "drain cleaning",
    geyser: "geyser installation",
    tank: "water tank installation",
    motor: "water tank installation",
    compressor: "compressor service",
    "gas refill": "gas refilling",
    cooler: "ac repair",
    darwaza: "door repair",
    door: "door repair",
    lakri: "furniture making",
    lakdi: "furniture making",
    wood: "furniture making",
    furniture: "furniture making",
    almari: "cabinet repair",
    cabinet: "cabinet repair",
    wardrobe: "wardrobe installation",
    kitchen: "kitchen cabinets",
};
const EMERGENCY_KEYWORDS = ["short circuit", "bijli ja rahi", "power outage", "fire", "aag", "gas leak", "gas ki dhani", "khatra", "emergency", "current lag raha", "shock"];
const URGENT_KEYWORDS = ["fuse", "wiring", "spark", "chamak", "dhani", "smell", "bijli"];
const FLAG_BY_KEYWORD = [
    ["short circuit", "short circuit"],
    ["bijli ja rahi", "power outage"],
    ["power outage", "power outage"],
    ["fuse", "fuse blowout"],
    ["gas", "gas leak"],
    ["fire", "fire risk"],
    ["aag", "fire risk"],
    ["shock", "electric shock risk"],
    ["current", "electric shock risk"],
];
function hasKeyword(text, keywords) {
    return keywords.some((k) => text.includes(k));
}
function matchedSkillsFor(text, ruleSkills) {
    const hits = [];
    for (const [kw, skill] of Object.entries(SKILL_KEYWORDS)) {
        if (text.includes(kw) && ruleSkills.includes(skill)) {
            hits.push(skill);
        }
    }
    return Array.from(new Set(hits));
}
export function analyzeJobInput(text, opts) {
    const normalized = text.trim().toLowerCase();
    const categoryHint = opts?.categoryHint ?? null;
    if (!normalized) {
        return {
            category: categoryHint,
            subcategory: "",
            description: text.trim(),
            required_skills: categoryHint ? CANONICAL_SKILLS[categoryHint].slice(0, 2) : [],
            urgency: opts?.urgencyHint ?? "normal",
            safety_flags: [],
            confidence: 0,
            clarification_required: !categoryHint,
            estimate_min: categoryHint ? CATEGORY_ESTIMATES[categoryHint].min : 0,
            estimate_max: categoryHint ? CATEGORY_ESTIMATES[categoryHint].max : 0,
            inspection_fee: inspectionFeeFor(categoryHint),
            complexity: complexityFor(text),
        };
    }
    // Score-based category detection: count keyword hits per category,
    // pick the highest. Ties broken by rule order (electrician first).
    let bestCategory = null;
    let bestHits = 0;
    let bestRule = null;
    for (const rule of KEYWORD_RULES) {
        const hits = rule.keywords.filter((k) => normalized.includes(k)).length;
        if (hits > bestHits) {
            bestHits = hits;
            bestCategory = rule.category;
            bestRule = rule;
        }
    }
    const category = bestCategory ?? categoryHint ?? null;
    const matchedRule = bestRule;
    if (!category) {
        return {
            category: null,
            subcategory: "",
            description: text.trim(),
            required_skills: [],
            urgency: opts?.urgencyHint ?? "normal",
            safety_flags: [],
            confidence: 0.25,
            clarification_required: true,
            estimate_min: 0,
            estimate_max: 0,
            inspection_fee: 0,
            complexity: complexityFor(text),
        };
    }
    const keywordUrgency = hasKeyword(normalized, EMERGENCY_KEYWORDS)
        ? "emergency"
        : hasKeyword(normalized, URGENT_KEYWORDS)
            ? "potentially_urgent"
            : "normal";
    const urgency = opts?.urgencyHint === "emergency" ? "emergency" : keywordUrgency;
    const safety_flags = urgency === "emergency" || urgency === "potentially_urgent"
        ? FLAG_BY_KEYWORD.filter(([kw]) => normalized.includes(kw))
            .map(([, flag]) => flag)
            .filter((flag, idx, arr) => arr.indexOf(flag) === idx)
        : [];
    // Use skills from the matched rule; fall back to first 2 canonical skills
    const required_skills = matchedRule && matchedSkillsFor(normalized, matchedRule.skills).length > 0
        ? matchedSkillsFor(normalized, matchedRule.skills)
        : CANONICAL_SKILLS[category].slice(0, 2);
    const confidence = Math.min(0.95, 0.7 + (bestHits >= 2 ? 0.1 : 0) + (bestHits >= 3 ? 0.05 : 0));
    return {
        category,
        subcategory: matchedRule?.subcategory ?? "",
        description: text.trim(),
        required_skills,
        urgency,
        safety_flags,
        confidence,
        clarification_required: false,
        estimate_min: CATEGORY_ESTIMATES[category].min,
        estimate_max: CATEGORY_ESTIMATES[category].max,
        inspection_fee: INSPECTION_FEES[category],
        complexity: complexityFor(normalized),
    };
}
/** Re-derives skills, estimates and flags for a customer-edited summary. */
export function deriveAnalysisForCategory(category, subcategory, urgency) {
    const estimates = CATEGORY_ESTIMATES[category];
    return {
        category,
        subcategory,
        description: "",
        required_skills: CANONICAL_SKILLS[category].slice(0, 2),
        urgency,
        safety_flags: urgency === "emergency" ? ["generic emergency"] : [],
        confidence: 0.6,
        clarification_required: false,
        estimate_min: estimates.min,
        estimate_max: estimates.max,
        inspection_fee: INSPECTION_FEES[category],
        complexity: "medium",
    };
}
export function findEmergencyFlags(text) {
    return FLAG_BY_KEYWORD.filter(([kw]) => text.toLowerCase().includes(kw))
        .map(([, flag]) => flag);
}
//# sourceMappingURL=analyze.js.map