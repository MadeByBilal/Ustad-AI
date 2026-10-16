import type {
  UrgencyLevel,
  WorkerCategory,
} from "../../models/index.js";
import type { ComplexityLevel } from "./pricing.js";

export interface PriceEstimate {
  min: number;
  max: number;
}

export const CATEGORY_ESTIMATES: Record<WorkerCategory, PriceEstimate> = {
  plumber: { min: 800, max: 1500 },
  electrician: { min: 1500, max: 4000 },
  ac_technician: { min: 2000, max: 6000 },
  carpenter: { min: 1500, max: 5000 },
};

/**
 * Visit-and-check fee: the only amount the customer commits to upfront.
 * The main repair payment is settled after the ustad inspects the problem.
 */
export const INSPECTION_FEES: Record<WorkerCategory, number> = {
  plumber: 300,
  electrician: 350,
  ac_technician: 500,
  carpenter: 300,
};

export function inspectionFeeFor(category: WorkerCategory | null): number {
  return category ? INSPECTION_FEES[category] : 0;
}

export const CANONICAL_SKILLS: Record<WorkerCategory, string[]> = {
  plumber: ["faucet repair", "pipe fitting", "drain cleaning", "geyser installation", "water tank installation"],
  electrician: ["wiring", "fault finding", "switchboard installation", "inverter installation", "lighting"],
  ac_technician: ["ac repair", "compressor service", "gas refilling", "ac installation", "deep cleaning"],
  carpenter: ["door repair", "furniture making", "cabinet repair", "wardrobe installation", "kitchen cabinets"],
};

export interface AnalysisResult {
  category: WorkerCategory | null;
  subcategory: string;
  description: string;
  required_skills: string[];
  urgency: UrgencyLevel;
  safety_flags: string[];
  confidence: number;
  clarification_required: boolean;
  estimate_min: number;
  estimate_max: number;
  inspection_fee: number;
  complexity?: ComplexityLevel;
}

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

export function complexityFor(text: string): ComplexityLevel {
  const normalized = text.toLowerCase();
  if (HIGH_COMPLEXITY_KEYWORDS.some((keyword) => hasKeyword(normalized, keyword))) {
    return "high";
  }
  if (LOW_COMPLEXITY_KEYWORDS.some((keyword) => hasKeyword(normalized, keyword))) {
    return "low";
  }
  return "medium";
}

interface KeywordRule {
  category: WorkerCategory;
  keywords: string[];
  subcategory: string;
  skills: string[];
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    category: "electrician",
    keywords: [
      "short circuit", "circuit", "wiring", "wire", "fuse", "switchboard",
      "switch", "socket", "plug", "inverter", "ups", "generator", "lighting",
      "light", "bulb", "tube light", "pankha", "fan", "regulator", "bijli",
      "electric", "electricity", "shock", "current", "meter", "board",
      "breaker", "spark", "chingari", "power outage", "light band",
      "بجلی", "لائٹ", "پنکھا", "پنکھے", "پنکھوں", "فین", "بلب", "سوئچ",
      "تار", "میٹر", "چنگاری", "شارٹ سرکٹ", "بریکر",
    ],
    subcategory: "electrical_fault",
    skills: ["fault finding", "wiring", "switchboard installation", "inverter installation", "lighting"],
  },
  {
    category: "plumber",
    keywords: [
      "leak", "leakage", "seepage", "tap", "faucet", "nalka", "nal", "nala",
      "naali", "pani", "paani", "tank", "tanki", "pipe", "bathroom", "toilet",
      "commode", "flush", "basin", "shower", "sink", "geyser", "gizer",
      "geaser", "drain", "motor", "pump", "tapak", "boiler",
      "پانی", "نل", "نلکا", "نلکے", "نلی", "پائپ", "گیزر", "ٹنکی", "ٹونٹی",
      "فلش", "موٹر", "بہہ",
    ],
    subcategory: "plumbing_fault",
    skills: ["pipe fitting", "faucet repair", "drain cleaning", "geyser installation", "water tank installation"],
  },
  {
    category: "ac_technician",
    keywords: [
      "air conditioner", "air conditioning", "ac", "compressor",
      "gas refill", "gas refilling", "refrigerant", "cooler", "cooling",
      "chiller", "hawa",
      "اے سی", "کولر", "ایئر کنڈیشنر", "کمپریسر", "فرج", "ریفریجریٹر",
      "ٹھنڈا", "ٹھنڈی", "گیس ریفل",
    ],
    subcategory: "ac_fault",
    skills: ["ac repair", "gas refilling", "compressor service", "ac installation", "deep cleaning"],
  },
  {
    category: "carpenter",
    keywords: [
      "darwaza", "door", "khidki", "window", "lakri", "lakdi", "wood",
      "furniture", "almari", "cabinet", "wardrobe", "sofa", "kitchen",
      "table", "chair", "shelf", "bed", "takht", "tala", "taala", "lock",
      "hinge", "drawer", "channel", "plywood", "partition",
      "دروازہ", "دروازے", "کھڑکی", "کھڑکیاں", "الماری", "لکڑی", "فرنیچر",
      "صوفہ", "میز", "کرسی", "تالا", "قبضہ", "دراز", "کیبنٹ",
    ],
    subcategory: "carpentry_work",
    skills: ["door repair", "furniture making", "cabinet repair", "wardrobe installation", "kitchen cabinets"],
  },
];

const SKILL_KEYWORDS: Record<string, string> = {
  wiring: "wiring",
  wire: "wiring",
  fuse: "fault finding",
  "short circuit": "fault finding",
  breaker: "fault finding",
  meter: "fault finding",
  spark: "fault finding",
  chingari: "fault finding",
  switchboard: "switchboard installation",
  switch: "switchboard installation",
  socket: "switchboard installation",
  plug: "switchboard installation",
  inverter: "inverter installation",
  upsi: "inverter installation",
  ups: "inverter installation",
  lighting: "lighting",
  light: "lighting",
  bulb: "lighting",
  leak: "pipe fitting",
  leakage: "pipe fitting",
  seepage: "pipe fitting",
  tapak: "pipe fitting",
  tap: "faucet repair",
  faucet: "faucet repair",
  nalka: "faucet repair",
  basin: "faucet repair",
  sink: "faucet repair",
  shower: "faucet repair",
  pani: "pipe fitting",
  paani: "pipe fitting",
  pipe: "pipe fitting",
  drain: "drain cleaning",
  naali: "drain cleaning",
  commode: "drain cleaning",
  flush: "drain cleaning",
  toilet: "drain cleaning",
  geyser: "geyser installation",
  gizer: "geyser installation",
  geaser: "geyser installation",
  tank: "water tank installation",
  tanki: "water tank installation",
  motor: "water tank installation",
  pump: "water tank installation",
  compressor: "compressor service",
  "gas refill": "gas refilling",
  "gas refilling": "gas refilling",
  refrigerant: "gas refilling",
  cooler: "ac repair",
  cooling: "ac repair",
  darwaza: "door repair",
  door: "door repair",
  tala: "door repair",
  taala: "door repair",
  lock: "door repair",
  hinge: "door repair",
  khidki: "door repair",
  window: "door repair",
  lakri: "furniture making",
  lakdi: "furniture making",
  wood: "furniture making",
  furniture: "furniture making",
  bed: "furniture making",
  sofa: "furniture making",
  table: "furniture making",
  chair: "furniture making",
  shelf: "furniture making",
  almari: "cabinet repair",
  cabinet: "cabinet repair",
  drawer: "cabinet repair",
  wardrobe: "wardrobe installation",
  kitchen: "kitchen cabinets",
};

const EMERGENCY_KEYWORDS = ["short circuit", "bijli ja rahi", "power outage", "fire", "aag", "gas leak", "gas ki dhani", "khatra", "emergency", "current lag raha", "shock", "آگ", "شارٹ سرکٹ", "چنگاری"];

const URGENT_KEYWORDS = ["fuse", "wiring", "spark", "chamak", "dhani", "smell", "bijli"];

const FLAG_BY_KEYWORD: Array<[string, string]> = [
  ["short circuit", "short circuit"],
  ["bijli ja rahi", "power outage"],
  ["power outage", "power outage"],
  ["fuse", "fuse blowout"],
  ["gas", "gas leak"],
  ["fire", "fire risk"],
  ["aag", "fire risk"],
  ["shock", "electric shock risk"],
  ["current", "electric shock risk"],
  ["آگ", "fire risk"],
  ["شارٹ سرکٹ", "short circuit"],
  ["چنگاری", "sparks"],
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-aware keyword test. Plain `includes` matched "ac" inside "acha" and
 * "nal" inside "final", which flipped categories — word boundaries (with an
 * optional plural) keep "lights"/"pipes" matching without false hits.
 */
function hasKeyword(text: string, keyword: string): boolean {
  // Urdu (non-Latin) keywords rely on listed inflected variants and are
  // matched as plain substrings — the Latin word-boundary rules below do
  // not fit the script's morphology ("پنکھا" vs "پنکھے").
  if (/[^\x00-\x7F]/.test(keyword)) {
    return text.includes(keyword);
  }
  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegex(keyword)}(s|es)?([^a-z0-9]|$)`,
    "i"
  );
  return pattern.test(text);
}

function anyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((k) => hasKeyword(text, k));
}

function matchedSkillsFor(text: string, ruleSkills: string[]): string[] {
  const hits: string[] = [];
  for (const [kw, skill] of Object.entries(SKILL_KEYWORDS)) {
    if (hasKeyword(text, kw) && ruleSkills.includes(skill)) {
      hits.push(skill);
    }
  }
  return Array.from(new Set(hits));
}

export function analyzeJobInput(
  text: string,
  opts?: {
    categoryHint?: WorkerCategory;
    urgencyHint?: UrgencyLevel;
  }
): AnalysisResult {
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
  let bestCategory: WorkerCategory | null = null;
  let bestHits = 0;
  let bestRule: KeywordRule | null = null;

  for (const rule of KEYWORD_RULES) {
    const hits = rule.keywords.filter((k) => hasKeyword(normalized, k)).length;
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

  const keywordUrgency: UrgencyLevel = anyKeyword(normalized, EMERGENCY_KEYWORDS)
    ? "emergency"
    : anyKeyword(normalized, URGENT_KEYWORDS)
      ? "potentially_urgent"
      : "normal";

  const urgency: UrgencyLevel =
    opts?.urgencyHint === "emergency" ? "emergency" : keywordUrgency;

  const safety_flags =
    urgency === "emergency" || urgency === "potentially_urgent"
      ? FLAG_BY_KEYWORD.filter(([kw]) => hasKeyword(normalized, kw))
          .map(([, flag]) => flag)
          .filter((flag, idx, arr) => arr.indexOf(flag) === idx)
      : [];

  // Use skills from the matched rule; fall back to first 2 canonical skills
  const required_skills =
    matchedRule && matchedSkillsFor(normalized, matchedRule.skills).length > 0
      ? matchedSkillsFor(normalized, matchedRule.skills)
      : CANONICAL_SKILLS[category].slice(0, 2);

  const confidence = Math.min(
    0.95,
    0.7 + (bestHits >= 2 ? 0.1 : 0) + (bestHits >= 3 ? 0.05 : 0)
  );

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
export function deriveAnalysisForCategory(
  category: WorkerCategory,
  subcategory: string,
  urgency: UrgencyLevel
): AnalysisResult {
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

export function findEmergencyFlags(text: string): string[] {
  return FLAG_BY_KEYWORD.filter(([kw]) => hasKeyword(text.toLowerCase(), kw))
    .map(([, flag]) => flag);
}
