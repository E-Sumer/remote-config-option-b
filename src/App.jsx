import { useEffect, useMemo, useState } from "react";

const BLACK = "#111827";
const PRIMARY = "#030213";
const SECONDARY_BG = "#ececf0";
const INPUT_BG = "#f3f3f5";
const TEXT = "#111827";
const TEXT_MUTED = "#6B7280";
const PAGE_BG = "#F3F4F6";
const WHITE = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.1)";
const BORDER_DARK = "rgba(0,0,0,0.1)";
const SOFT = "#f9fafb";
const CTA_GREEN = "#22C55E";
const CTA_GREEN_DARK = "#16A34A";
const CTA_GREEN_LIGHT = "#DCFCE7";
const LIVE_GREEN = "#22C55E";
const DRAFT_BG = "#F3F4F6";
const DRAFT_TEXT = "#9CA3AF";
const SHADOW = "0 1px 3px rgba(0,0,0,0.08)";

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDisplayDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatDateOffset(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatDisplayDate(date);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWindow(minCreatedAgo, maxCreatedAgo) {
  const createdAgo = randomInt(minCreatedAgo, maxCreatedAgo);
  const updatedAgo = randomInt(0, createdAgo);

  return {
    created: formatDateOffset(createdAgo),
    updated: formatDateOffset(updatedAgo),
  };
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function parseDisplayDate(value) {
  const [day, month, year] = value.split(".");
  return startOfDay(new Date(Number(year), Number(month) - 1, Number(day)));
}

function toInputDate(value) {
  const [day, month, year] = value.split(".");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-");
  return startOfDay(new Date(Number(year), Number(month) - 1, Number(day)));
}

function addMonths(date, amount) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function getMonthLabel(date) {
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function isSameDay(left, right) {
  if (!left || !right) return false;
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function isWithinRange(date, start, end) {
  if (!start || !end) return false;
  const time = startOfDay(date).getTime();
  return time >= startOfDay(start).getTime() && time <= startOfDay(end).getTime();
}

function getCalendarDays(monthDate) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function slugifyKey(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function createParameterId() {
  return `param_${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyParameter() {
  return {
    id: createParameterId(),
    key: "",
    type: "String",
    description: "",
    value: "",
    collapsed: false,
  };
}

function parseParameterValue(parameter) {
  if (parameter.type === "Boolean") {
    return parameter.value === true || parameter.value === "true";
  }

  if (parameter.type === "Integer" || parameter.type === "Number") {
    return Number(parameter.value || 0);
  }

  if (parameter.type === "JSON") {
    if (!String(parameter.value || "").trim()) {
      return {};
    }

    try {
      return JSON.parse(parameter.value);
    } catch {
      return parameter.value;
    }
  }

  return parameter.value ?? "";
}

function buildRemoteConfigPayload(configKey, parameters) {
  if (!configKey || parameters.length === 0) {
    return {};
  }

  return {
    [configKey]: parameters.reduce((result, parameter) => {
      if (!parameter.key) {
        return result;
      }

      result[parameter.key] = parseParameterValue(parameter);
      return result;
    }, {}),
  };
}

function renderJsonHighlighted(payload) {
  const json = JSON.stringify(payload, null, 2);
  const tokens = json.split(/("(?:\\.|[^"])*"(?=\s*:)|"(?:\\.|[^"])*"|true|false|null|-?\d+(?:\.\d+)?)/g);

  return tokens.map((token, index) => {
    if (!token) {
      return null;
    }

    let color = "#D8E0F2";
    if (/^"(?:\\.|[^"])*"(?=\s*:)$/.test(token)) {
      color = "#79C0FF";
    } else if (/^"(?:\\.|[^"])*"$/.test(token)) {
      color = "#A5D6FF";
    } else if (/^(true|false)$/.test(token)) {
      color = "#FFB86C";
    } else if (/^null$/.test(token)) {
      color = "#B197FC";
    } else if (/^-?\d+(?:\.\d+)?$/.test(token)) {
      color = "#7EE787";
    }

    return <span key={`${token}-${index}`} style={{ color }}>{token}</span>;
  });
}

const initialExperiments = [
  {
    id: 1,
    name: "Welcome message test",
    status: "RUNNING",
    linkedConfigKey: "welcome_message_v2",
    hypothesis: "Personalized greeting increases engagement.",
    metric: "session_duration",
    lift: "+12%",
    confidence: 94,
    users: 45232,
    archived: false,
  },
  {
    id: 2,
    name: "CTA button color test",
    status: "RUNNING",
    linkedConfigKey: "cta_button_config",
    hypothesis: "Green CTA converts better than blue.",
    metric: "purchase_completed",
    lift: "-3%",
    confidence: 76,
    users: 32100,
    archived: false,
  },
  {
    id: 3,
    name: "Promo banner placement",
    status: "winner_declared",
    linkedConfigKey: "promo_banner_enabled",
    hypothesis: "Top banner drives more clicks than bottom.",
    metric: "banner_click",
    lift: "+23%",
    confidence: 99,
    users: 63350,
    archived: false,
    winnerVariant: "variant_b",
    confidenceLevel: 95,
    pValue: 0.032,
    goalMetric: { key: "banner_click", label: "Banner Click", type: "conversion_rate" },
    startDate: "2025-01-05",
    endDate: "2025-01-19",
    durationDays: 14,
    createdBy: "Emre Sumer",
    lastModifiedBy: "Emre Sumer",
    lastModifiedAt: "2025-01-10",
    totalUsers: 63350,
    trafficSplit: { control: 50, variant_b: 50 },
    targeting: "All Users",
    randomizationUnit: "User ID",
    linkedConfigMeta: { name: "Promo Banner Enabled", key: "promo_banner_enabled", controlValue: false, variantBValue: true },
    variants: [
      { id: "control", label: "Control", conversionRate: 0.032, users: 31675, conversions: 1014, isWinner: false },
      { id: "variant_b", label: "Variant B", conversionRate: 0.039, users: 31675, conversions: 1235, uplift: 0.23, upliftAbsolute: 0.007, isWinner: true },
    ],
  },
  {
    id: 4,
    name: "Onboarding flow v3",
    status: "DRAFT",
    linkedConfigKey: "onboarding_flow_v3",
    hypothesis: "Shorter onboarding reduces drop-off.",
    metric: null,
    lift: "—",
    confidence: null,
    users: 0,
    archived: false,
  },
  {
    id: 5,
    name: "Search ranking weights",
    status: "PAUSED",
    linkedConfigKey: "search_algorithm_weight",
    hypothesis: "ML-based ranking improves relevance.",
    metric: "search_result_click",
    lift: "+5%",
    confidence: 72,
    users: 18900,
    archived: false,
  },
  {
    id: 6,
    name: "Dark mode checkout",
    status: "COMPLETED",
    linkedConfigKey: "deleted_dark_mode_config",
    hypothesis: "Dark mode checkout reduces abandonment.",
    metric: "checkout_completed",
    lift: "+9%",
    confidence: 96,
    users: 28440,
    archived: true,
  },
];

const mockSegments = [
  { id: "all_users", name: "All Users" },
  { id: "vip_users", name: "VIP Users" },
  { id: "students", name: "Students" },
  { id: "churn_signal", name: "Churn Signal Segment" },
];

const mockEvents = [
  { id: "session_duration", name: "session_duration", baseline: "Avg. 6m 12s over the last 30 days" },
  { id: "purchase_completed", name: "purchase_completed", baseline: "Avg. 4.8% conversion over the last 30 days" },
  { id: "banner_click", name: "banner_click", baseline: "Avg. 18.4K clicks over the last 30 days" },
  { id: "onboarding_completed", name: "onboarding_completed", baseline: "Avg. 61% completion over the last 30 days" },
  { id: "search_result_click", name: "search_result_click", baseline: "Avg. 27.1K clicks over the last 30 days" },
  { id: "checkout_completed", name: "checkout_completed", baseline: "Avg. 3.9% conversion over the last 30 days" },
];

function createVariantId() {
  return `variant_${Math.random().toString(36).slice(2, 10)}`;
}

function cloneExperimentParameters(parameters = []) {
  return parameters.map((parameter) => ({ ...parameter, id: createParameterId() }));
}

function getVariantLabel(index) {
  if (index === 0) return "Control";
  return `Variant ${String.fromCharCode(65 + index)}`;
}

function buildDefaultVariants(config) {
  if (!config) return [];

  return [
    {
      id: createVariantId(),
      name: "Control",
      traffic: 50,
      locked: true,
      removable: false,
      parameters: cloneExperimentParameters(config.parameters),
    },
    {
      id: createVariantId(),
      name: "Variant B",
      traffic: 50,
      locked: false,
      removable: false,
      parameters: cloneExperimentParameters(config.parameters),
    },
  ];
}

function rebalanceVariantTraffic(variants) {
  if (!variants.length) return variants;

  const base = Math.floor(100 / variants.length);
  let remainder = 100 - (base * variants.length);

  return variants.map((variant, index) => {
    const traffic = base + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    return {
      ...variant,
      name: variant.name || getVariantLabel(index),
      traffic,
    };
  });
}


function createRcVariantId() {
  return `rcv_${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultRcVariant(parameters) {
  return {
    id: createRcVariantId(),
    name: "Default",
    priority: 999,
    isDefault: true,
    segments: [],
    rolloutPercentage: 100,
    parameterOverrides: Object.fromEntries((parameters || []).map((p) => [p.key, p.value])),
    collapsed: false,
  };
}

function stringifyParameterValue(parameter) {
  if (parameter.type === "JSON") return String(parameter.value || "{}");
  if (parameter.type === "Boolean") return String(parameter.value === true || parameter.value === "true");
  return String(parameter.value ?? "");
}

const configDateBuckets = [
  randomDateWindow(0, 1),
  randomDateWindow(2, 7),
  randomDateWindow(8, 30),
  randomDateWindow(31, 90),
  randomDateWindow(91, 180),
  randomDateWindow(181, 330),
];

const initialConfigs = [
  {
    id: 1,
    name: "Welcome Message V2",
    key: "welcome_message_v2",
    status: "Draft",
    ...configDateBuckets[0],
    creator: "Burak Alparslan",
    type: "String",
    deploymentType: "A/B Test Experiment",
    params: 2,
    version: 1.0,
    description: "Controls welcome message variants shown on the home screen.",
    parameters: [
      { id: createParameterId(), key: "headline", type: "String", description: "Primary greeting", value: "Welcome back!", collapsed: false },
      { id: createParameterId(), key: "show_badge", type: "Boolean", description: "Toggle loyalty badge", value: true, collapsed: true },
    ],
  },
  {
    id: 2,
    name: "CTA Button Config",
    key: "cta_button_config",
    status: "Draft",
    ...configDateBuckets[1],
    creator: "Gulsen Hacarlioglugil",
    type: "JSON",
    deploymentType: "Rolled Out",
    params: 2,
    version: 1.3,
    description: "Configures purchase CTA label and color set.",
    parameters: [
      { id: createParameterId(), key: "label", type: "String", description: "Primary CTA copy", value: "Continue", collapsed: false },
      { id: createParameterId(), key: "theme", type: "JSON", description: "Button style tokens", value: JSON.stringify({ bg: "#29C58B", text: "#FFFFFF" }, null, 2), collapsed: true },
    ],
  },
  {
    id: 3,
    name: "Promo Banner Enabled",
    key: "promo_banner_enabled",
    status: "Draft",
    ...configDateBuckets[2],
    creator: "Aylin Yildiz",
    type: "Boolean",
    deploymentType: "A/B Test Experiment",
    params: 1,
    version: 1.1,
    description: "Turns the promo banner experience on or off.",
    parameters: [
      { id: createParameterId(), key: "enabled", type: "Boolean", description: "Banner visibility", value: false, collapsed: false },
    ],
  },
  {
    id: 4,
    name: "Onboarding Flow V3",
    key: "onboarding_flow_v3",
    status: "Live",
    ...configDateBuckets[3],
    creator: "Emre Sumer",
    type: "JSON",
    deploymentType: "Rolled Out",
    params: 2,
    version: 2.0,
    description: "Defines the onboarding screen order and content.",
    parameters: [
      { id: createParameterId(), key: "step_count", type: "Integer", description: "Number of steps", value: 4, collapsed: false },
      { id: createParameterId(), key: "layout", type: "JSON", description: "Layout behavior", value: JSON.stringify({ style: "cards", animation: "fade" }, null, 2), collapsed: true },
    ],
  },
  {
    id: 5,
    name: "Dark Mode Rollout",
    key: "dark_mode_rollout",
    status: "Live",
    ...configDateBuckets[4],
    creator: "Deniz Kaya",
    type: "Boolean",
    deploymentType: "Rolled Out",
    params: 1,
    version: 2.2,
    description: "Controls dark mode eligibility for the workspace.",
    parameters: [
      { id: createParameterId(), key: "enabled", type: "Boolean", description: "Dark mode rollout state", value: true, collapsed: false },
    ],
  },
  {
    id: 6,
    name: "Search Algorithm Weight",
    key: "search_algorithm_weight",
    status: "Live",
    ...configDateBuckets[5],
    creator: "Can Aydin",
    type: "Integer",
    deploymentType: "A/B Test Experiment",
    params: 1,
    version: 3.1,
    description: "Adjusts the weight of the ranking model used in search.",
    parameters: [
      { id: createParameterId(), key: "weight", type: "Integer", description: "Ranking multiplier", value: 12, collapsed: false },
    ],
  },
];

function formatToday() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}.${month}.${year}`;
}

function IconBase({ children, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const GridIcon = () => <IconBase><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></IconBase>;
const HeartIcon = () => <IconBase><path d="M12 20.5s-7-4.4-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10.5c0 5.6-7 10-7 10Z" /></IconBase>;
const DashboardIcon = () => <IconBase><path d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-10h8V3h-8v8Z" /></IconBase>;
const MessageIcon = () => <IconBase><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v5A2.5 2.5 0 0 1 16.5 14H11l-4 4v-4H7.5A2.5 2.5 0 0 1 5 11.5v-5Z" /></IconBase>;
const WrenchIcon = () => <IconBase><path d="m14.7 6.3 3 3M5 19l6.2-6.2a4 4 0 1 1 5.6-5.6L10.6 13 5 19Z" /></IconBase>;
const JourneyIcon = () => <IconBase><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h4a4 4 0 0 0 4-4V8" /></IconBase>;
const MobileIcon = () => <IconBase><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></IconBase>;
const TargetIcon = () => <IconBase><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1.2" /></IconBase>;
const ReportIcon = () => <IconBase><path d="M5 19V9M12 19V5M19 19v-8" /></IconBase>;
const AnalyticsIcon = () => <IconBase><path d="M4 18c2-2.5 4-3.5 6-3s4 2 4 2 2-6 6-9" /></IconBase>;
const SettingsIcon = () => <IconBase><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" /></IconBase>;
const DeveloperIcon = () => <IconBase><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5 10 19" /></IconBase>;
const LogoutIcon = () => <IconBase><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></IconBase>;
const ChevronRightIcon = () => <IconBase><path d="m9 6 6 6-6 6" /></IconBase>;
const ChevronDownIcon = () => <IconBase><path d="m6 9 6 6 6-6" /></IconBase>;
const SearchIcon = () => <IconBase><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.5-3.5" /></IconBase>;
const PlusIcon = () => <IconBase><path d="M12 5v14M5 12h14" /></IconBase>;
const LinkIcon = () => <IconBase><path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13" /><path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 1 1-7-7L7 11" /></IconBase>;
const MoreIcon = () => <IconBase><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></IconBase>;
const EditIcon = () => <IconBase><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></IconBase>;
const CopyIcon = () => <IconBase><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></IconBase>;
const PlayIcon = () => <IconBase><path d="m8 6 10 6-10 6Z" /></IconBase>;
const PauseIcon = () => <IconBase><path d="M8 5v14M16 5v14" /></IconBase>;
const ArchiveIcon = () => <IconBase><path d="M3 7h18" /><path d="M5 7V5h14v2" /><path d="M6 7v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" /><path d="M10 12h4" /></IconBase>;
const InfoIcon = () => <IconBase><circle cx="12" cy="12" r="9" /><path d="M12 10v5" /><path d="M12 7h.01" /></IconBase>;
const FieldInfoIcon = () => <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", border: "1.5px solid #D1D5DB", color: "#9CA3AF", fontSize: 9, marginLeft: 5, lineHeight: 1, fontStyle: "normal", userSelect: "none", flexShrink: 0 }}>i</span>;
const TrashIcon = () => <IconBase><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></IconBase>;
const CheckIcon = () => <IconBase><path d="M20 6 9 17l-5-5" /></IconBase>;
const GripIcon = () => <IconBase><circle cx="9" cy="7" r="1" /><circle cx="15" cy="7" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="17" r="1" /><circle cx="15" cy="17" r="1" /></IconBase>;

const pageTitleStyle = { fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 };
const pageDescriptionStyle = { fontSize: 13, color: TEXT_MUTED, margin: "6px 0 0" };
const cardStyle = { background: WHITE, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 14, boxShadow: SHADOW };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: INPUT_BG, color: TEXT, fontSize: 13, outline: "none" };
const primaryButtonStyle = { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", border: "none", borderRadius: 8, background: "#3B82F6", color: WHITE, fontSize: 13, fontWeight: 500, cursor: "pointer" };
const secondaryButtonStyle = { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 16px", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, background: SECONDARY_BG, color: TEXT, fontSize: 13, fontWeight: 500, cursor: "pointer" };

function Spinner({ size = 14, color = "currentColor" }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}33`,
        borderTopColor: color,
        display: "inline-block",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

function SortIndicator({ active, direction }) {
  return (
    <span style={{ marginLeft: 6, color: active ? TEXT : TEXT_MUTED, fontSize: 11 }}>
      {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

function Toast({ toast }) {
  if (!toast) return null;

  const toneMap = {
    success: { bg: "#DCFCE7", border: "#86EFAC", color: "#166534" },
    error: { bg: "#FEE2E2", border: "#FCA5A5", color: "#991B1B" },
    warning: { bg: "#FEF3C7", border: "#FCD34D", color: "#92400E" },
  };
  const tone = toneMap[toast.type] || toneMap.success;

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 120,
        minWidth: 280,
        maxWidth: 420,
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
        borderRadius: 10,
        padding: "12px 14px",
        boxShadow: SHADOW,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {toast.message}
    </div>
  );
}

function ConfirmModal({ open, title, message, summary, warning, confirmLabel, confirmTone = "danger", loading, onCancel, onConfirm }) {
  if (!open) return null;

  const confirmStyle = confirmTone === "danger"
    ? { background: "#EF4444", color: WHITE, border: "none" }
    : { background: "#3B82F6", color: WHITE, border: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17, 24, 39, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110 }}>
      <div style={{ width: 480, background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`, boxShadow: SHADOW, padding: 24 }}>
        <h3 style={{ margin: "0 0 4px", color: TEXT, fontSize: 18, fontWeight: 700 }}>{title}</h3>
        {message && <p style={{ margin: "0 0 14px", color: TEXT_MUTED, fontSize: 13, lineHeight: 1.6 }}>{message}</p>}
        {summary && (
          <div style={{ marginTop: message ? 0 : 10, marginBottom: 4, borderRadius: 10, border: "1px solid #E5E7EB", background: "#F9FAFB", overflow: "hidden" }}>
            {/* Header rows */}
            {summary.meta && summary.meta.map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "9px 14px", borderBottom: "1px solid #F3F4F6" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 90, flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: TEXT, fontWeight: 500, wordBreak: "break-all" }}>{row.value}</span>
              </div>
            ))}
            {/* Variants section */}
            {summary.variants && summary.variants.length > 0 && (
              <div>
                <div style={{ padding: "8px 14px 4px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Variants</div>
                {summary.variants.map((v, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderTop: "1px solid #F3F4F6" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: v.isDefault ? "#D1D5DB" : "#3B82F6", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: v.isDefault ? TEXT_MUTED : TEXT, flex: 1 }}>{v.name}</span>
                    <span style={{ fontSize: 12, color: TEXT_MUTED, flexShrink: 0 }}>{v.segment}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", background: "#E5E7EB", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>{v.rollout}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {warning && (
          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, border: "1px solid #FCD34D", background: "#FFFBEB", color: "#92400E", fontSize: 13 }}>
            {warning}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onCancel} disabled={loading} style={secondaryButtonStyle}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              ...secondaryButtonStyle,
              ...confirmStyle,
              minWidth: 132,
              justifyContent: "center",
              opacity: loading ? 0.85 : 1,
            }}
          >
            {loading ? <Spinner color="#FFFFFF" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description, ctaLabel, onClick }) {
  return (
    <div style={{ ...cardStyle, padding: "42px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 28, color: TEXT_MUTED, marginBottom: 14 }}>&lt;/&gt;</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: TEXT_MUTED, maxWidth: 520, margin: "0 auto 18px", lineHeight: 1.6 }}>{description}</div>
      {ctaLabel && (
        <button onClick={onClick} style={primaryButtonStyle}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function ComingSoonPlaceholder({ title, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={{ ...secondaryButtonStyle, marginBottom: 20 }}>← Back</button>
      <div style={{ ...cardStyle, padding: "42px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 14, color: TEXT_MUTED }}>Coming soon.</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const palette = {
    RUNNING: { bg: "#EAFBF4", color: CTA_GREEN_DARK, dot: CTA_GREEN, label: "Running" },
    running: { bg: "#EAFBF4", color: CTA_GREEN_DARK, dot: CTA_GREEN, label: "Running" },
    COMPLETED: { bg: "#EEF3FF", color: "#4E5FE2", dot: "#6E7AF0", label: "Completed" },
    completed: { bg: "#EEF3FF", color: "#4E5FE2", dot: "#6E7AF0", label: "Completed" },
    winner_declared: { bg: "#EEF3FF", color: "#4E5FE2", dot: "#6E7AF0", label: "Winner Declared" },
    inconclusive: { bg: "#FFF5E7", color: "#B27612", dot: "#E0A43F", label: "Inconclusive" },
    DRAFT: { bg: DRAFT_BG, color: DRAFT_TEXT, dot: "#C4CAD4", label: "Draft" },
    PAUSED: { bg: "#FFF5E7", color: "#B27612", dot: "#E0A43F", label: "Paused" },
  };
  const current = palette[status] || palette.DRAFT;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: current.bg, color: current.color, fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: current.dot }} />
      {current.label}
    </span>
  );
}

function ConfigStatusBadge({ status }) {
  const palette = {
    Live: { bg: "#DCFCE7", color: "#166534", dot: "#22C55E", pulse: true },
    Draft: { bg: "#F3F4F6", color: "#6B7280", dot: "#9CA3AF" },
    Stopped: { bg: "#FEE2E2", color: "#991B1B", dot: "#EF4444" },
    Paused: { bg: "#FEF3C7", color: "#92400E", dot: "#F59E0B" },
    Running: { bg: "#DCFCE7", color: "#166534", dot: "#22C55E", pulse: true },
    Completed: { bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6" },
  };
  const current = palette[status] || palette.Draft;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minWidth: 56,
      padding: "4px 10px",
      borderRadius: 999,
      background: current.bg,
      color: current.color,
      fontSize: 11,
      fontWeight: 600,
    }}>
      <span className={current.pulse ? "status-dot-pulse" : undefined} style={{ width: 6, height: 6, borderRadius: "50%", background: current.dot }} />
      {status}
    </span>
  );
}

function SidebarItem({ icon, label, active, onClick, trailing }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        border: "none",
        borderRadius: 10,
        background: active ? BLACK : "transparent",
        color: active ? WHITE : TEXT,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        textAlign: "left",
      }}
    >
      <span style={{ width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: active ? 1 : 0.78 }}>
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {trailing}
    </button>
  );
}

function RemoteConfigActionMenu({ config, isOpen, onToggle, onEdit, onClone, onRemove, loadingAction }) {
  const actionItems = [
    { key: "edit", label: "Edit", icon: <EditIcon />, action: () => onEdit(config) },
    { key: "clone", label: "Clone", icon: <CopyIcon />, action: () => onClone(config) },
    { key: "remove", label: "Remove", icon: <TrashIcon />, action: () => onRemove(config) },
  ];

  return (
    <div style={{ position: "relative", display: "inline-flex", justifyContent: "center", width: "100%" }}>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onToggle(config.id);
        }}
        disabled={Boolean(loadingAction)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: `1px solid ${BORDER}`,
          background: WHITE,
          color: TEXT_MUTED,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: loadingAction ? 0.7 : 1,
        }}
        aria-label={`Open actions for ${config.name}`}
      >
        <MoreIcon />
      </button>
      {isOpen && (
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            top: 34,
            right: 0,
            width: 148,
            padding: 8,
            borderRadius: 10,
            background: WHITE,
            border: `1px solid ${BORDER}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.13)",
            zIndex: 200,
          }}
        >
          {actionItems.map((item) => (
            <button
              key={item.key}
              onClick={item.action}
              disabled={Boolean(loadingAction)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                border: "none",
                borderRadius: 8,
                background: "transparent",
                color: item.label === "Remove" ? "#BD3D53" : TEXT,
                cursor: "pointer",
                fontSize: 13,
                textAlign: "left",
                opacity: loadingAction && loadingAction !== item.key ? 0.6 : 1,
              }}
            >
              <span style={{ width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {loadingAction === item.key ? <Spinner size={14} /> : item.icon}
              </span>
              {loadingAction === item.key ? `${item.label}...` : item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeploymentTypeBadge({ deploymentType }) {
  const isAB = deploymentType === "A/B Test Experiment";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        background: isAB ? "#EEF3FF" : "#EAFBF4",
        color: isAB ? "#4E5FE2" : "#15803D",
        border: `1px solid ${isAB ? "#C7D2FB" : "#BBF7D0"}`,
        whiteSpace: "nowrap",
      }}
    >
      {isAB ? (
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="11.5" cy="11.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7.5 4.5h1M7.5 11.5h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <path d="M8 2L10 6H14L11 9L12.5 13.5L8 11L3.5 13.5L5 9L2 6H6L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )}
      {deploymentType || "Rolled Out"}
    </span>
  );
}

function RemoteConfigurationList({
  configs,
  openActionId,
  setOpenActionId,
  onCreate,
  onEdit,
  onClone,
  onRemove,
  onRowClick,
  actionLoading,
}) {
  const dateFilters = ["Today", "Yesterday", "7D", "30D", "3M", "6M", "12M"];
  const [activeDateFilter, setActiveDateFilter] = useState("30D");
  const [lastPresetFilter, setLastPresetFilter] = useState("30D");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(startOfDay(new Date()));
  const [sortBy, setSortBy] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [typeTooltipVisible, setTypeTooltipVisible] = useState(false);

  const customStart = parseInputDate(customStartDate);
  const customEnd = parseInputDate(customEndDate);

  useEffect(() => {
    if (!isCustomPickerOpen) return undefined;

    const closePicker = () => {
      if (activeDateFilter === "Custom" && (!customStartDate || !customEndDate)) {
        setCustomStartDate("");
        setCustomEndDate("");
        setActiveDateFilter(lastPresetFilter);
      }
      setIsCustomPickerOpen(false);
    };

    window.addEventListener("click", closePicker);
    return () => window.removeEventListener("click", closePicker);
  }, [activeDateFilter, customEndDate, customStartDate, isCustomPickerOpen, lastPresetFilter]);

  const filteredConfigs = useMemo(() => {
    const today = startOfDay(new Date());
    const trimmedSearch = searchQuery.trim().toLowerCase();
    const filtered = configs.filter((config) => {
      // Search filter
      if (trimmedSearch && !config.name.toLowerCase().includes(trimmedSearch)) return false;
      // Type filter
      if (typeFilter !== "All" && config.deploymentType !== typeFilter) return false;

      const updatedDate = parseDisplayDate(config.updated);
      const diffInDays = Math.floor((today - updatedDate) / (1000 * 60 * 60 * 24));

      if (activeDateFilter === "Custom") {
        if (customStart && customEnd) {
          return isWithinRange(updatedDate, customStart, customEnd);
        }

        return true;
      }

      switch (activeDateFilter) {
        case "Today":
          return diffInDays === 0;
        case "Yesterday":
          return diffInDays === 1;
        case "7D":
          return diffInDays >= 0 && diffInDays <= 7;
        case "30D":
          return diffInDays >= 0 && diffInDays <= 30;
        case "3M":
          return diffInDays >= 0 && diffInDays <= 90;
        case "6M":
          return diffInDays >= 0 && diffInDays <= 180;
        case "12M":
          return diffInDays >= 0 && diffInDays <= 365;
        default:
          return true;
      }
    });

    const statusOrder = { Live: 0, Draft: 1, Stopped: 2 };
    const typeOrder = { "Rolled Out": 0, "A/B Test Experiment": 1 };
    const sorted = [...filtered].sort((left, right) => {
      let leftValue = left[sortBy];
      let rightValue = right[sortBy];

      if (sortBy === "status") {
        leftValue = statusOrder[left.status] ?? 99;
        rightValue = statusOrder[right.status] ?? 99;
      }

      if (sortBy === "deploymentType") {
        leftValue = typeOrder[left.deploymentType] ?? 99;
        rightValue = typeOrder[right.deploymentType] ?? 99;
      }

      if (sortBy === "created" || sortBy === "updated") {
        leftValue = parseDisplayDate(left[sortBy]).getTime();
        rightValue = parseDisplayDate(right[sortBy]).getTime();
      }

      if (typeof leftValue === "string") {
        const compared = String(leftValue).localeCompare(String(rightValue));
        return sortDir === "asc" ? compared : -compared;
      }

      return sortDir === "asc" ? leftValue - rightValue : rightValue - leftValue;
    });

    return sorted;
  }, [activeDateFilter, configs, customEnd, customStart, searchQuery, sortBy, sortDir, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [activeDateFilter, customEndDate, customStartDate, pageSize, searchQuery, sortBy, sortDir, typeFilter]);

  const totalConfigs = filteredConfigs.length;
  const totalPages = Math.max(1, Math.ceil(totalConfigs / pageSize));
  const pagedConfigs = filteredConfigs.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (column) => {
    if (column === "actions") return;
    if (sortBy === column) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir(column === "updated" ? "desc" : "asc");
  };

  const handleCalendarDateClick = (date) => {
    const clicked = startOfDay(date);

    if (!customStart || (customStart && customEnd)) {
      setCustomStartDate(toInputDate(formatDisplayDate(clicked)));
      setCustomEndDate("");
      return;
    }

    if (clicked.getTime() < customStart.getTime()) {
      setCustomStartDate(toInputDate(formatDisplayDate(clicked)));
      setCustomEndDate(toInputDate(formatDisplayDate(customStart)));
      return;
    }

    setCustomEndDate(toInputDate(formatDisplayDate(clicked)));
  };

  const columns = [
    { key: "status", label: "Status", sortable: true },
    { key: "name", label: "Configuration Name", sortable: true },
    { key: "deploymentType", label: "Type", sortable: true },
    { key: "created", label: "Create Date", sortable: true },
    { key: "updated", label: "Update Date", sortable: true },
    { key: "creator", label: "Creator User", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
  ];

  const renderCalendarMonth = (monthDate) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: PRIMARY }}>{getMonthLabel(monthDate)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} style={{ textAlign: "center", padding: "4px 0" }}>{day}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {getCalendarDays(monthDate).map((date) => {
          const isOutside = date.getMonth() !== monthDate.getMonth();
          const isSelectedStart = isSameDay(date, customStart);
          const isSelectedEnd = isSameDay(date, customEnd);
          const isInRange = isWithinRange(date, customStart, customEnd);

          return (
            <button
              key={date.toISOString()}
              onClick={(event) => {
                event.stopPropagation();
                handleCalendarDateClick(date);
              }}
              style={{
                height: 32,
                borderRadius: 8,
                border: "none",
                background: isSelectedStart || isSelectedEnd ? "#EAF1FF" : isInRange ? "#F4F8FF" : "transparent",
                color: isOutside ? "#C7CDD9" : TEXT,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 5, height: 58, borderRadius: 999, background: "#3B82F6", marginTop: 2 }} />
            <div>
              <h1 style={{ ...pageTitleStyle, color: "#111827", fontSize: 21 }}>Remote Configuration</h1>
              <p style={pageDescriptionStyle}>Control app behavior and features without releasing a new version.</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap", marginTop: 18, position: "relative" }}>
            <button
              onClick={(event) => {
                event.stopPropagation();
                setActiveDateFilter("Custom");
                setIsCustomPickerOpen((current) => !current);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 12px",
                borderRadius: 10,
                border: `1px solid ${activeDateFilter === "Custom" ? "#3B82F6" : "#E5E7EB"}`,
                background: WHITE,
                color: TEXT,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                minWidth: 295,
                boxShadow: "none",
              }}
            >
              <span style={{ fontWeight: 600 }}>Custom</span>
              <span style={{ color: customStartDate ? TEXT : "#B0B8C6" }}>{customStartDate || "Start date"}</span>
              <span style={{ color: "#B0B8C6" }}>→</span>
              <span style={{ color: customEndDate ? TEXT : "#B0B8C6" }}>{customEndDate || "End date"}</span>
            </button>
            {dateFilters.map((filter) => {
              const isPrimary = activeDateFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => {
                    setLastPresetFilter(filter);
                    setActiveDateFilter(filter);
                    setIsCustomPickerOpen(false);
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: `1px solid ${isPrimary ? "#3B82F6" : "#E5E7EB"}`,
                    background: isPrimary ? "#3B82F6" : WHITE,
                    color: isPrimary ? WHITE : TEXT_MUTED,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "none",
                  }}
                >
                  {filter}
                </button>
              );
            })}

            {isCustomPickerOpen && (
              <div
                onClick={(event) => event.stopPropagation()}
                style={{
                  position: "absolute",
                  top: 52,
                  left: 84,
                  width: 640,
                  background: WHITE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 18,
                  boxShadow: "0 18px 40px rgba(23, 30, 50, 0.14)",
                  padding: 16,
                  zIndex: 30,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(event) => {
                      setCustomStartDate(event.target.value);
                      setActiveDateFilter("Custom");
                    }}
                    style={{ ...inputStyle, width: 150, padding: "10px 12px" }}
                  />
                  <span style={{ color: TEXT_MUTED }}>→</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(event) => {
                      setCustomEndDate(event.target.value);
                      setActiveDateFilter("Custom");
                    }}
                    style={{ ...inputStyle, width: 150, padding: "10px 12px" }}
                  />
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button onClick={() => setPickerMonth((current) => addMonths(current, -1))} style={{ ...secondaryButtonStyle, padding: "7px 10px" }}>←</button>
                    <button onClick={() => setPickerMonth((current) => addMonths(current, 1))} style={{ ...secondaryButtonStyle, padding: "7px 10px" }}>→</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {renderCalendarMonth(pickerMonth)}
                  {renderCalendarMonth(addMonths(pickerMonth, 1))}
                </div>
              </div>
            )}
          </div>
        </div>
        <button onClick={onCreate} style={{ ...primaryButtonStyle, background: "#3B82F6" }}>
          New Remote Configuration
        </button>
      </div>

      {/* Search toolbar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ position: "relative", maxWidth: 360 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search by configuration name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              ...inputStyle,
              width: "100%",
              background: WHITE,
              border: `1px solid ${BORDER}`,
              paddingLeft: 32,
              paddingRight: searchQuery ? 32 : 12,
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              title="Clear search"
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#9CA3AF",
                padding: 2,
                lineHeight: 1,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {configs.length === 0 ? (
        <EmptyState
          title="No remote configurations yet"
          description="Create your first configuration to start controlling app behavior without a release."
          ctaLabel="New Remote Configuration"
          onClick={onCreate}
        />
      ) : filteredConfigs.length === 0 ? (
        <div style={{ ...cardStyle, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 6 }}>No configurations found</div>
          <div style={{ fontSize: 13, color: TEXT_MUTED }}>
            No results matching <strong>"{searchQuery}"</strong> — try a different name.
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ ...secondaryButtonStyle, marginTop: 14, padding: "8px 16px" }}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          <div style={{ ...cardStyle, overflow: "visible" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, borderRadius: 12, overflow: "hidden", display: "table" }}>
              <thead>
                <tr style={{ background: WHITE }}>
                  {columns.map((column) => (
                    <th key={column.key} style={{ padding: "16px 18px", textAlign: column.key === "actions" ? "center" : "left", fontSize: 12, fontWeight: 600, color: TEXT_MUTED, borderBottom: `1px solid ${BORDER}` }}>
                      {column.key === "deploymentType" ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={() => handleSort(column.key)}
                            style={{ border: "none", background: "transparent", padding: 0, margin: 0, color: "inherit", fontSize: "inherit", fontWeight: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                          >
                            {column.label}
                            <SortIndicator active={sortBy === column.key} direction={sortDir} />
                          </button>
                          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                            <span
                              onMouseEnter={() => setTypeTooltipVisible(true)}
                              onMouseLeave={() => setTypeTooltipVisible(false)}
                              style={{ display: "inline-flex", alignItems: "center", cursor: "default", color: "#9CA3AF" }}
                            >
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                                <path d="M8 7v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                <circle cx="8" cy="5" r="0.75" fill="currentColor" />
                              </svg>
                            </span>
                            {typeTooltipVisible && (
                              <div style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                left: "50%",
                                transform: "translateX(-50%)",
                                width: 240,
                                background: "#1F2937",
                                color: WHITE,
                                fontSize: 12,
                                lineHeight: 1.5,
                                padding: "9px 12px",
                                borderRadius: 8,
                                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                                zIndex: 300,
                                pointerEvents: "none",
                                whiteSpace: "normal",
                                fontWeight: 400,
                              }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>Deployment Type</div>
                                Shows how this configuration is being used: <strong style={{ color: "#86EFAC" }}>Rolled Out</strong> means it is directly deployed to users, while <strong style={{ color: "#A5B4FC" }}>A/B Test Experiment</strong> means it is part of a running experiment.
                                {/* Tooltip arrow */}
                                <div style={{
                                  position: "absolute",
                                  top: -5,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  width: 10,
                                  height: 10,
                                  background: "#1F2937",
                                  clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                                }} />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : column.sortable ? (
                        <button
                          onClick={() => handleSort(column.key)}
                          style={{ border: "none", background: "transparent", padding: 0, margin: 0, color: "inherit", fontSize: "inherit", fontWeight: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                        >
                          {column.label}
                          <SortIndicator active={sortBy === column.key} direction={sortDir} />
                        </button>
                      ) : column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedConfigs.map((config) => (
                  <tr
                    key={config.id}
                    onClick={() => onRowClick(config)}
                    style={{ borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
                    onMouseEnter={(event) => { event.currentTarget.style.background = "#F9FAFB"; }}
                    onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ padding: "16px 18px" }}><ConfigStatusBadge status={config.status} /></td>
                    <td style={{ padding: "16px 18px", color: TEXT, fontWeight: 500 }}>{config.name}</td>
                    <td style={{ padding: "16px 18px" }}><DeploymentTypeBadge deploymentType={config.deploymentType} /></td>
                    <td style={{ padding: "16px 18px", color: TEXT, fontWeight: 500 }}>{config.created}</td>
                    <td style={{ padding: "16px 18px", color: TEXT, fontWeight: 500 }}>{config.updated}</td>
                    <td style={{ padding: "16px 18px", color: TEXT, fontWeight: 500 }}>{config.creator}</td>
                    <td style={{ padding: "12px 18px", width: 88, textAlign: "center" }} onClick={(event) => event.stopPropagation()}>
                      <RemoteConfigActionMenu
                        config={config}
                        isOpen={openActionId === config.id}
                        onToggle={(id) => setOpenActionId(openActionId === id ? null : id)}
                        onEdit={onEdit}
                        onClone={onClone}
                        onRemove={onRemove}
                        loadingAction={actionLoading?.id === config.id ? actionLoading.type : null}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalConfigs > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14, color: TEXT_MUTED, fontSize: 13 }}>
              <div>
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalConfigs)} of {totalConfigs} configurations
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {totalConfigs > 20 && (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span>Rows per page</span>
                    <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} style={{ ...inputStyle, width: 88, padding: "8px 10px" }}>
                      {[20, 50, 100].map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </label>
                )}
                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} style={{ ...secondaryButtonStyle, padding: "8px 10px", opacity: page === 1 ? 0.5 : 1 }}>Previous</button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        style={{
                          ...secondaryButtonStyle,
                          padding: "8px 12px",
                          background: pageNumber === page ? PRIMARY : WHITE,
                          color: pageNumber === page ? WHITE : TEXT,
                          borderColor: pageNumber === page ? PRIMARY : "rgba(0,0,0,0.1)",
                        }}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} style={{ ...secondaryButtonStyle, padding: "8px 10px", opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RemoteConfigurationForm({
  mode,
  initialValue,
  existingConfigs,
  onCancel,
  onSave,
  onPauseConflictingConfig,
}) {
  const buildInitialForm = () => {
    const params = initialValue?.parameters?.length
      ? initialValue.parameters.map((parameter) => ({ ...parameter }))
      : [];
    return {
      id: initialValue?.id || null,
      name: initialValue?.name || "",
      key: initialValue?.key || "",
      description: initialValue?.description || "",
      creator: initialValue?.creator || "Emre Sumer",
      status: initialValue?.status || "Draft",
      version: initialValue?.version || 1.0,
      rollout: initialValue?.rollout ?? 100,
      selectedSegments: initialValue?.selectedSegments || [],
      parameters: params,
      variants: initialValue?.variants || [createDefaultRcVariant(params)],
    };
  };

  const [form, setForm] = useState(buildInitialForm);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [jsonHidden, setJsonHidden] = useState(false);
  const [copyState, setCopyState] = useState("Copy");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [conflictConfig, setConflictConfig] = useState(null);
  const [keyTouched, setKeyTouched] = useState(Boolean(initialValue?.key));
  const [draftLoading, setDraftLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [liveWarningOpen, setLiveWarningOpen] = useState(false);
  const [zeroRolloutWarning, setZeroRolloutWarning] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [varDragId, setVarDragId] = useState(null);
  const [priorityBannerDismissed, setPriorityBannerDismissed] = useState(false);
  const [openSegmentMenuId, setOpenSegmentMenuId] = useState(null);
  const [openActionMenuKey, setOpenActionMenuKey] = useState(null);
  const [openInlineEditKey, setOpenInlineEditKey] = useState(null);
  const [inlineEditValue, setInlineEditValue] = useState("");
  const [dragHandleVariantId, setDragHandleVariantId] = useState(null);

  useEffect(() => {
    setForm(buildInitialForm());
    setStep(1);
    setErrors({});
    setConflictConfig(null);
    setKeyTouched(Boolean(initialValue?.key));
    setPublishModalOpen(false);
    setLiveWarningOpen(false);
    setZeroRolloutWarning(false);
  }, [initialValue, mode]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timeout = window.setTimeout(() => setToastMessage(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (copyState === "Copy") return undefined;
    const timeout = window.setTimeout(() => setCopyState("Copy"), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const initialSnapshot = useMemo(() => JSON.stringify(buildInitialForm()), [initialValue, mode]);
  const currentSnapshot = JSON.stringify(form);
  const isDirty = initialSnapshot !== currentSnapshot;
  const versionLabel = `v${Number(form.version || 1).toFixed(1)} (${form.status})`;
  const payload = useMemo(() => buildRemoteConfigPayload(form.key, form.parameters), [form.key, form.parameters]);
  const descriptionCount = form.description.length;

  const fieldInputStyle = (fieldName) => ({
    ...inputStyle,
    minHeight: fieldName === "description" ? 80 : undefined,
    borderColor: errors[fieldName] ? "#EF4444" : BORDER_DARK,
    boxShadow: errors[fieldName] ? "0 0 0 3px rgba(239, 68, 68, 0.12)" : "none",
  });

  const setFieldValue = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const parameterErrorFor = (parameterId, field) => errors.parameters?.[parameterId]?.[field];

  const pushToast = (message, type = "success") => {
    setToastType(type);
    setToastMessage(message);
  };

  const showBackConfirmation = () => {
    if (!isDirty) {
      onCancel();
      return;
    }

    const shouldLeave = window.confirm("You have unsaved changes. Are you sure you want to leave?");
    if (shouldLeave) {
      onCancel();
    }
  };

  const scrollToFirstError = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateStepOne = () => {
    const nextErrors = {};
    const trimmedName = form.name.trim();
    const trimmedKey = form.key.trim();
    const duplicateName = existingConfigs.find((config) => config.name.toLowerCase() === trimmedName.toLowerCase() && config.id !== form.id);
    const duplicateParamKeys = new Set();
    const paramKeyMap = new Map();

    if (!trimmedName) {
      nextErrors.name = "Configuration name is required.";
    } else if (duplicateName) {
      nextErrors.name = "A configuration with this name already exists.";
    }

    if (!trimmedKey) {
      nextErrors.key = "Configuration key is required.";
    } else if (!/^[a-z0-9_]+$/.test(trimmedKey)) {
      nextErrors.key = "Key may only contain lowercase letters, numbers, and underscores.";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Description is required.";
    }

    const parameterErrors = {};
    form.parameters.forEach((parameter) => {
      const parameterKey = parameter.key.trim();
      if (parameterKey) {
        if (paramKeyMap.has(parameterKey)) {
          duplicateParamKeys.add(parameterKey);
          duplicateParamKeys.add(paramKeyMap.get(parameterKey));
        } else {
          paramKeyMap.set(parameterKey, parameter.id);
        }
      }
    });

    form.parameters.forEach((parameter) => {
      const entryErrors = {};
      const parameterKey = parameter.key.trim();

      if (!parameterKey) {
        entryErrors.key = "Parameter key is required.";
      } else if (!/^[a-z0-9_]+$/.test(parameterKey)) {
        entryErrors.key = "Key may only contain lowercase letters, numbers, and underscores.";
      } else if (duplicateParamKeys.has(parameter.key) || duplicateParamKeys.has(parameter.id)) {
        entryErrors.key = "This key already exists in this configuration.";
      }

      if (parameter.type === "JSON") {
        try {
          JSON.parse(String(parameter.value || "{}"));
        } catch {
          entryErrors.value = "Value must be valid JSON.";
        }
      }

      if ((parameter.type === "String" || parameter.type === "Number") && String(parameter.value).trim() === "") {
        entryErrors.value = "Value is required.";
      }

      if (Object.keys(entryErrors).length > 0) {
        parameterErrors[parameter.id] = entryErrors;
      }
    });

    if (Object.keys(parameterErrors).length > 0) {
      nextErrors.parameters = parameterErrors;
    }

    setErrors(nextErrors);

    const liveConflict = existingConfigs.find(
      (config) => config.status === "Live" && config.key === trimmedKey && config.id !== form.id,
    );

    if (!nextErrors.key && liveConflict) {
      setConflictConfig(liveConflict);
      return false;
    }

    const isValid = Object.keys(nextErrors).length === 0;
    if (!isValid) {
      scrollToFirstError();
    }
    return isValid;
  };

  const validateStepTwo = () => {
    const nextErrors = {};
    const customVariants = form.variants ? form.variants.filter((v) => !v.isDefault) : [];

    customVariants.forEach((variant, i) => {
      if (!variant.segments.length) {
        nextErrors[`variant_${variant.id}_segments`] = `"${variant.name || `Variant ${i + 1}`}" needs at least one target segment.`;
      }
    });

    const segUsage = {};
    customVariants.forEach((v, i) => {
      v.segments.forEach((s) => {
        if (segUsage[s] !== undefined) {
          nextErrors[`segment_conflict_${s}`] = `Segment "${s}" is used in multiple variants.`;
        } else {
          segUsage[s] = i + 1;
        }
      });
    });

    setErrors((current) => ({ ...current, ...nextErrors }));

    if (Object.keys(nextErrors).length > 0) {
      const count = Object.keys(nextErrors).length;
      setToastMessage(`${count} issue${count > 1 ? "s" : ""} found — fix the highlighted fields below before going live.`);
      setToastType("error");
    }

    return Object.keys(nextErrors).length === 0;
  };

  const handleNameChange = (value) => {
    setForm((current) => {
      const nextState = { ...current, name: value };
      if (!keyTouched) {
        nextState.key = slugifyKey(value);
      }
      return nextState;
    });
    setErrors((current) => ({ ...current, name: undefined, key: undefined }));
  };

  const updateParameter = (parameterId, updater) => {
    setForm((current) => ({
      ...current,
      parameters: current.parameters.map((parameter) => (
        parameter.id === parameterId ? updater(parameter) : parameter
      )),
    }));
    setErrors((current) => ({
      ...current,
      parameters: current.parameters ? { ...current.parameters, [parameterId]: undefined } : undefined,
    }));
  };

  const handleParameterDrop = (targetId) => {
    if (!draggingId || draggingId === targetId) return;
    setForm((current) => {
      const list = [...current.parameters];
      const sourceIndex = list.findIndex((parameter) => parameter.id === draggingId);
      const targetIndex = list.findIndex((parameter) => parameter.id === targetId);
      const [moved] = list.splice(sourceIndex, 1);
      list.splice(targetIndex, 0, moved);
      return { ...current, parameters: list };
    });
    setDraggingId(null);
  };


  const updateVariant = (variantId, updater) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((v) => v.id === variantId ? updater(v) : v),
    }));
  };

  const addVariant = () => {
    setForm((current) => {
      const customs = current.variants.filter((v) => !v.isDefault);
      if (customs.length >= 10) return current;
      const deflt = current.variants.find((v) => v.isDefault);
      const newVariant = {
        id: createRcVariantId(),
        name: `Variant ${customs.length + 1}`,
        priority: customs.length + 1,
        isDefault: false,
        segments: [],
        rolloutPercentage: 100,
        parameterOverrides: deflt ? { ...deflt.parameterOverrides } : {},
        collapsed: false,
      };
      return { ...current, variants: [...customs, newVariant, deflt] };
    });
  };

  const removeVariant = (variantId) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.filter((v) => v.id !== variantId || v.isDefault),
    }));
  };

  const handleVariantDrop = (targetId) => {
    if (!varDragId || varDragId === targetId) return;
    setForm((current) => {
      const customs = current.variants.filter((v) => !v.isDefault);
      const deflt = current.variants.find((v) => v.isDefault);
      const si = customs.findIndex((v) => v.id === varDragId);
      const ti = customs.findIndex((v) => v.id === targetId);
      if (si === -1 || ti === -1) return current;
      const reordered = [...customs];
      const [moved] = reordered.splice(si, 1);
      reordered.splice(ti, 0, moved);
      return { ...current, variants: [...reordered, deflt] };
    });
    setVarDragId(null);
  };

  const handleSaveDraft = async () => {
    const isValid = validateStepOne() && (step === 1 || validateStepTwo());
    if (!isValid) {
      pushToast("Please complete required fields before saving.", "warning");
      return;
    }

    setDraftLoading(true);
    await sleep(450);
    const savedConfig = onSave(
      {
        ...form,
        status: "Draft",
        params: form.parameters.length,
      },
      { keepEditing: true },
    );

    setDraftLoading(false);
    if (savedConfig) {
      setForm((current) => ({
        ...current,
        id: savedConfig.id,
        version: savedConfig.version,
        status: "Draft",
      }));
      pushToast("Draft saved successfully.", "success");
    }
  };

  const proceedToStepTwo = () => {
    setConflictConfig(null);
    setStep(2);
  };

  const handleNext = () => {
    const isValid = validateStepOne();
    if (!isValid) return;
    proceedToStepTwo();
  };

  const openPublishFlow = () => {
    const isStepOneValid = validateStepOne();
    const isStepTwoValid = validateStepTwo();
    if (!isStepOneValid || !isStepTwoValid) return;

    if (mode === "edit" && initialValue?.status === "Live" && isDirty) {
      setLiveWarningOpen(true);
      return;
    }

    setPublishModalOpen(true);
  };

  const publishConfiguration = async () => {
    setPublishLoading(true);
    await sleep(550);

    const savedConfig = onSave(
      {
        ...form,
        status: "Live",
        params: form.parameters.length,
      },
      { keepEditing: false, showDetail: true },
    );

    setPublishLoading(false);
    setPublishModalOpen(false);
    setLiveWarningOpen(false);

    if (savedConfig) {
      pushToast("Configuration is now live.", "success");
    }
  };

  const renderParameterValueInput = (parameter) => {
    if (parameter.collapsed) return null;

    if (parameter.type === "Boolean") {
      return (
        <select
          value={String(parameter.value)}
          onChange={(event) => updateParameter(parameter.id, (current) => ({ ...current, value: event.target.value === "true" }))}
          style={{ ...inputStyle, borderColor: parameterErrorFor(parameter.id, "value") ? "#EF4444" : BORDER_DARK }}
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      );
    }

    if (parameter.type === "JSON") {
      return (
        <textarea
          rows={4}
          value={parameter.value}
          onChange={(event) => updateParameter(parameter.id, (current) => ({ ...current, value: event.target.value }))}
          style={{ ...inputStyle, resize: "vertical", borderColor: parameterErrorFor(parameter.id, "value") ? "#EF4444" : BORDER_DARK, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
          placeholder='e.g. { "theme": "light" }'
        />
      );
    }

    return (
      <input
        type={parameter.type === "Number" ? "number" : "text"}
        value={parameter.value}
        onChange={(event) => updateParameter(parameter.id, (current) => ({ ...current, value: event.target.value }))}
        style={{ ...inputStyle, borderColor: parameterErrorFor(parameter.id, "value") ? "#EF4444" : BORDER_DARK }}
        placeholder={parameter.type === "Number" ? "e.g. 3" : "Enter value"}
      />
    );
  };

  return (
    <div>
      <Toast toast={toastMessage ? { type: toastType, message: toastMessage } : null} />

      <ConfirmModal
        open={liveWarningOpen}
        title="This configuration is currently live."
        message="Changes will be applied immediately to all users receiving it."
        confirmLabel="Save Changes"
        confirmTone="primary"
        loading={publishLoading}
        onCancel={() => setLiveWarningOpen(false)}
        onConfirm={() => {
          setLiveWarningOpen(false);
          setPublishModalOpen(true);
        }}
      />

      <ConfirmModal
        open={publishModalOpen}
        title="Confirm and Go Live"
        summary={(() => {
          const customs = form.variants ? form.variants.filter((v) => !v.isDefault) : [];
          const deflt = form.variants ? form.variants.find((v) => v.isDefault) : null;
          return {
            meta: [
              { label: "Name", value: form.name || "—" },
              { label: "Key", value: form.key || "—" },
              { label: "Parameters", value: String(form.parameters.length) },
              { label: "Variants", value: `${customs.length} custom + 1 default` },
            ],
            variants: [
              ...customs.map((v, i) => ({
                name: `Variant ${i + 1} — ${v.name}`,
                segment: v.segments.length > 0 ? v.segments.join(", ") : "No segment",
                rollout: v.rolloutPercentage,
                isDefault: false,
              })),
              {
                name: "Default Fallback",
                segment: "All unmatched",
                rollout: deflt ? deflt.rolloutPercentage : 100,
                isDefault: true,
              },
            ],
          };
        })()}
        confirmLabel="Confirm and Go Live"
        confirmTone="primary"
        loading={publishLoading}
        onCancel={() => setPublishModalOpen(false)}
        onConfirm={publishConfiguration}
      />

      {conflictConfig && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 20, 35, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }}>
          <div style={{ width: 620, background: WHITE, borderRadius: 16, boxShadow: SHADOW, border: `1px solid ${BORDER}`, padding: 22 }}>
            <h3 style={{ margin: "0 0 8px", color: TEXT, fontSize: 18 }}>Parameter Key Conflict Detected</h3>
            <p style={{ margin: 0, color: TEXT_MUTED, fontSize: 13, lineHeight: 1.7 }}>
              The parameter key you've entered is already in use by the '{conflictConfig.name}' remote configuration, which is currently LIVE. Using duplicate parameter keys across active configurations may cause unexpected behavior and unpredictable value resolution on the client side. To proceed safely, either choose a unique parameter key or take the conflicting configuration offline before continuing.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button style={secondaryButtonStyle} onClick={() => setConflictConfig(null)}>Continue Editing This Configuration</button>
              <button
                style={primaryButtonStyle}
                onClick={() => {
                  onPauseConflictingConfig(conflictConfig.id);
                  proceedToStepTwo();
                }}
              >
                Pause '{conflictConfig.name}' and Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
        <span style={{ color: "#6B7280", fontSize: 13 }}>Platform</span>
        <span style={{ color: "#D1D5DB", fontSize: 13 }}>›</span>
        <span style={{ color: "#3B82F6", fontWeight: 500, fontSize: 13 }}>Remote Configuration</span>
      </div>

      <div style={{ ...cardStyle, padding: "18px 18px 12px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 4, alignSelf: "stretch", borderRadius: 999, background: "#3B82F6" }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 18, color: TEXT, fontWeight: 700 }}>
                {mode === "edit" ? "Edit Remote Configuration" : "Create Remote Configuration"}
              </h1>
              <span style={{ padding: "2px 10px", borderRadius: 6, background: "#EFF6FF", color: "#3B82F6", fontSize: 13, fontWeight: 500 }}>
                {versionLabel}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", color: TEXT_MUTED, fontSize: 13 }}>Create a configuration and control its rollout.</p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", padding: "20px 0", marginBottom: 24 }}>
        {/* Step 1 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          {step === 2 && (
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#22C55E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          )}
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: step === 1 ? "#3B82F6" : "#9CA3AF" }}>Parameters & Keys</div>
            <div style={{ fontSize: 13, color: step === 1 ? "#6B7280" : "#9CA3AF", marginTop: 2, marginLeft: 0 }}>Define the configuration your app will receive.</div>
          </div>
        </div>
        {/* Arrow separator */}
        <div style={{ fontSize: 18, color: "#D1D5DB", margin: "1px 24px 0", flexShrink: 0 }}>→</div>
        {/* Step 2 */}
        <div>
          {step === 2 ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#3B82F6", borderBottom: "2px solid #3B82F6", paddingBottom: 4, display: "inline-block" }}>Targeting &amp; Rollout</div>
              <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Choose who receives the configuration and how it rolls out.</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 16, fontWeight: 400, color: "#9CA3AF" }}>Targeting &amp; Rollout</div>
              <div style={{ fontSize: 13, color: "#9CA3AF", marginTop: 2 }}>Choose who receives the configuration and how it rolls out.</div>
            </>
          )}
        </div>
      </div>

      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: jsonHidden ? "1fr 260px" : "minmax(0, 1fr) 460px", gap: 18 }}>
          <div style={{ ...cardStyle, padding: 18 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, color: TEXT }}>Basic Information</h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: TEXT_MUTED }}>Name your configuration and define the key your app will use to fetch it.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "flex", alignItems: "center", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>CONFIGURATION NAME * <FieldInfoIcon /></label>
                <input value={form.name} onChange={(event) => handleNameChange(event.target.value)} placeholder="e.g. Flight Details UI" style={fieldInputStyle("name")} />
                {errors.name && <div style={{ marginTop: 6, fontSize: 12, color: "#EF4444" }}>{errors.name}</div>}
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>CONFIGURATION KEY * <FieldInfoIcon /></label>
                <input
                  value={form.key}
                  onChange={(event) => {
                    setKeyTouched(true);
                    setFieldValue("key", slugifyKey(event.target.value));
                  }}
                  placeholder="e.g. flight_details_ui"
                  style={fieldInputStyle("key")}
                />
                {errors.key && <div style={{ marginTop: 6, fontSize: 12, color: "#EF4444" }}>{errors.key}</div>}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>DESCRIPTION *</label>
              <textarea
                rows={3}
                maxLength={500}
                value={form.description}
                onChange={(event) => { setFieldValue("description", event.target.value); setErrors((curr) => ({ ...curr, description: undefined })); }}
                placeholder=""
                style={{ ...fieldInputStyle("description"), resize: "vertical" }}
              />
              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {errors.description ? <div style={{ fontSize: 12, color: "#EF4444" }}>{errors.description}</div> : <span />}
                {descriptionCount > 0 && <div style={{ fontSize: 12, color: descriptionCount >= 500 ? "#EF4444" : descriptionCount >= 400 ? "#F59E0B" : TEXT_MUTED }}>{descriptionCount}/500</div>}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 15, color: TEXT }}>Configuration Parameters</h3>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: TEXT_MUTED }}>Define the parameters your application will receive.</p>

              <div style={{ border: `1px dashed ${BORDER_DARK}`, borderRadius: 16, padding: 18, background: SOFT }}>
                {form.parameters.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 12px" }}>
                    <div style={{ color: TEXT_MUTED, marginBottom: 18, fontSize: 26 }}>&lt;/&gt;</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 8 }}>No parameters added yet</div>
                    <div style={{ fontSize: 14, color: TEXT_MUTED, marginBottom: 18 }}>Add your first parameter to define your configuration structure.</div>
                    <button onClick={() => setForm((current) => ({ ...current, parameters: [...current.parameters, createEmptyParameter()] }))} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "none", borderRadius: 8, background: "#3B82F6", color: WHITE, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                      + Add Parameter
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {form.parameters.map((parameter, index) => (
                      <div
                        key={parameter.id}
                        draggable
                        onDragStart={() => setDraggingId(parameter.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleParameterDrop(parameter.id)}
                        style={{ background: WHITE, borderRadius: 12, border: `1px solid ${parameterErrorFor(parameter.id, "key") || parameterErrorFor(parameter.id, "value") ? "#FCA5A5" : BORDER}`, padding: 16 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: parameter.collapsed ? 0 : 16 }}>
                          <span style={{ color: TEXT_MUTED, cursor: "grab" }}><GripIcon /></span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{parameter.key || `Parameter ${index + 1}`}</div>
                            <div style={{ marginTop: 2, fontSize: 12, color: TEXT_MUTED }}>{parameter.type}</div>
                          </div>
                          {/* Chevron — T&R style: plain button, no box */}
                          <button
                            onClick={() => updateParameter(parameter.id, (current) => ({ ...current, collapsed: !current.collapsed }))}
                            style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", borderRadius: 4, transition: "color 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#374151"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "#9CA3AF"; }}
                          >
                            <svg
                              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              style={{ transform: parameter.collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                            >
                              <path d="m6 9 6 6 6-6"/>
                            </svg>
                          </button>
                          {/* Trash — T&R style: plain button, no box, #9CA3AF → #DC2626 on hover */}
                          <button
                            onClick={() => setForm((current) => ({ ...current, parameters: current.parameters.filter((item) => item.id !== parameter.id) }))}
                            style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", borderRadius: 4, transition: "color 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#DC2626"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "#9CA3AF"; }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M6.5 1h3a.5.5 0 0 1 .5.5V2h3.5a.5.5 0 0 1 0 1H13v9.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 12.5V3H2.5a.5.5 0 0 1 0-1H6V1.5a.5.5 0 0 1 .5-.5ZM4 3v9.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V3H4Zm2.5 1.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Zm3 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                            </svg>
                          </button>
                        </div>

                        {!parameter.collapsed && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 14 }}>
                            <div>
                              <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>Parameter Key *</label>
                              <input value={parameter.key} onChange={(event) => updateParameter(parameter.id, (current) => ({ ...current, key: slugifyKey(event.target.value) }))} placeholder="e.g. screen_title" style={{ ...inputStyle, borderColor: parameterErrorFor(parameter.id, "key") ? "#EF4444" : BORDER_DARK }} />
                              {parameterErrorFor(parameter.id, "key") && <div style={{ marginTop: 6, fontSize: 12, color: "#EF4444" }}>{parameterErrorFor(parameter.id, "key")}</div>}
                            </div>
                            <div>
                              <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>Data Type</label>
                              <select
                                value={parameter.type}
                                onChange={(event) => updateParameter(parameter.id, (current) => ({
                                  ...current,
                                  type: event.target.value,
                                  value: event.target.value === "Boolean" ? true : event.target.value === "JSON" ? "{}" : "",
                                }))}
                                style={inputStyle}
                              >
                                <option>String</option>
                                <option>Number</option>
                                <option>Boolean</option>
                                <option>JSON</option>
                              </select>
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>Description</label>
                              <textarea rows={2} value={parameter.description} onChange={(event) => updateParameter(parameter.id, (current) => ({ ...current, description: event.target.value }))} placeholder="Optional parameter description" style={{ ...inputStyle, resize: "vertical" }} />
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>Value *</label>
                              {renderParameterValueInput(parameter)}
                              {parameterErrorFor(parameter.id, "value") && <div style={{ marginTop: 6, fontSize: 12, color: "#EF4444" }}>{parameterErrorFor(parameter.id, "value")}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    <button onClick={() => setForm((current) => ({ ...current, parameters: [...current.parameters, createEmptyParameter()] }))} style={{ ...{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "none", borderRadius: 8, background: "#3B82F6", color: WHITE, fontSize: 14, fontWeight: 600, cursor: "pointer" }, alignSelf: "flex-start" }}>
                      + Add Parameter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {jsonHidden ? (
            /* Minimized JSON panel */
            <div style={{ alignSelf: "start", background: "#111827", borderRadius: 12, border: "1px solid #263246", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Stacked-lines icon */}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="#6B7280"/>
                    <rect x="1" y="5.5" width="8" height="1.5" rx="0.75" fill="#6B7280"/>
                    <rect x="1" y="9" width="10" height="1.5" rx="0.75" fill="#6B7280"/>
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>JSON Output</span>
                  <span style={{ padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.12)", color: "#9CA3AF", fontSize: 10 }}>READ-ONLY</span>
                </div>
                <button
                  onClick={() => setJsonHidden(false)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "#D1D5DB", border: "1px solid rgba(255,255,255,0.15)", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 6C1 6 3 2 6 2C9 2 11 6 11 6C11 6 9 10 6 10C3 10 1 6 1 6Z" stroke="#D1D5DB" strokeWidth="1.3"/>
                    <circle cx="6" cy="6" r="1.5" fill="#D1D5DB"/>
                  </svg>
                  Show
                </button>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>Click Show to expand the JSON preview.</div>
            </div>
          ) : (
            /* Full JSON panel */
            <div style={{ ...cardStyle, padding: 0, alignSelf: "start", overflow: "hidden", background: "#111827", color: WHITE }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 10px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: WHITE }}>JSON Output</span>
                    <span style={{ marginLeft: 8, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.12)", color: "#9CA3AF", fontSize: 11 }}>READ-ONLY</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#9CA3AF" }}>This is the payload your SDK will receive.</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setJsonHidden(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "#D1D5DB", border: "1px solid rgba(255,255,255,0.15)", fontSize: 12, cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 6C1 6 3 2 6 2C9 2 11 6 11 6" stroke="#D1D5DB" strokeWidth="1.3" strokeLinecap="round"/>
                      <line x1="1" y1="10" x2="11" y2="2" stroke="#D1D5DB" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    Hide
                  </button>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                      setCopyState("Copied!");
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.08)", color: "#D1D5DB", border: "1px solid rgba(255,255,255,0.15)", fontSize: 12, cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  >
                    <CopyIcon />{copyState}
                  </button>
                </div>
              </div>
              <div style={{ margin: "0 16px 16px", background: "#0B1220", borderRadius: 12, border: "1px solid #263246", minHeight: 240, display: "flex" }}>
                <pre style={{ margin: 0, padding: "14px 16px", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', flex: 1, overflowX: "auto" }}>
                  {renderJsonHighlighted(payload)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (() => {
        const customVariants = (form.variants || []).filter((v) => !v.isDefault);
        const atMax = customVariants.length >= 10;
        const variantColors = ["#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16", "#06B6D4"];
        const segUsage = {};
        customVariants.forEach((v, i) => { v.segments.forEach((s) => { segUsage[s] = segUsage[s] || []; segUsage[s].push(i + 1); }); });
        // All-Users exclusivity: if any variant has "All Users", block all other segment choices everywhere
        const allUsersSelectedAnywhere = customVariants.some((v) => v.segments.includes("All Users"));

        return (
          <div onClick={() => { setOpenSegmentMenuId(null); setOpenActionMenuKey(null); setOpenInlineEditKey(null); }}>

            {/* Variant cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
              {customVariants.map((variant, idx) => {
                const varColor = variantColors[idx % variantColors.length];
                const conflictSegs = variant.segments.filter((s) => segUsage[s]?.length > 1);
                const hasConflict = conflictSegs.length > 0;
                const segError = errors[`variant_${variant.id}_segments`];
                const availableSegs = mockSegments.filter((s) => !variant.segments.includes(s.name));
                const segMenuOpen = openSegmentMenuId === variant.id;
                const thisVariantHasAllUsers = variant.segments.includes("All Users");
                // Whether this card is draggable (only when handle mousedown)
                const isDraggable = dragHandleVariantId === variant.id;
                return (
                  <div
                    key={variant.id}
                    draggable={isDraggable}
                    onDragStart={(e) => { if (!isDraggable) { e.preventDefault(); return; } setVarDragId(variant.id); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleVariantDrop(variant.id)}
                    onDragEnd={() => setDragHandleVariantId(null)}
                    style={{
                      background: WHITE,
                      borderRadius: 8,
                      border: (hasConflict || segError) ? "1px solid #FECACA" : "1px solid #E5E7EB",
                      borderLeft: (hasConflict || segError) ? "4px solid #EF4444" : `4px solid ${varColor}`,
                      position: "relative",
                    }}
                  >
                    {/* Card header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid #F3F4F6" }}>
                      {/* Grip handle — ONLY this triggers drag */}
                      <svg
                        width="16" height="16" viewBox="0 0 16 16" fill="currentColor"
                        style={{ color: "#D1D5DB", cursor: "grab", flexShrink: 0, userSelect: "none" }}
                        onMouseDown={() => setDragHandleVariantId(variant.id)}
                        onMouseUp={() => setDragHandleVariantId(null)}
                      >
                        <circle cx="5" cy="4" r="1.5"/><circle cx="11" cy="4" r="1.5"/>
                        <circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/>
                        <circle cx="5" cy="12" r="1.5"/><circle cx="11" cy="12" r="1.5"/>
                      </svg>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "#EFF6FF", color: "#3B82F6", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{idx + 1}</span>
                      <input
                        value={variant.name}
                        onChange={(e) => updateVariant(variant.id, (v) => ({ ...v, name: e.target.value }))}
                        placeholder="e.g. VIP Experience"
                        style={{ flex: 1, border: "none", borderBottom: "2px solid transparent", outline: "none", fontSize: 15, fontWeight: 600, color: "#111827", background: "transparent", padding: "2px 0", transition: "border-color 0.15s" }}
                        onFocus={(e) => { e.target.style.borderBottomColor = "#3B82F6"; }}
                        onBlur={(e) => { e.target.style.borderBottomColor = "transparent"; if (!e.target.value.trim()) updateVariant(variant.id, (v) => ({ ...v, name: `Variant ${idx + 1}` })); }}
                      />
                      <button
                        onClick={() => removeVariant(variant.id)}
                        style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", borderRadius: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#DC2626"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#9CA3AF"; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M6.5 1h3a.5.5 0 0 1 .5.5V2h3.5a.5.5 0 0 1 0 1H13v9.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 12.5V3H2.5a.5.5 0 0 1 0-1H6V1.5a.5.5 0 0 1 .5-.5ZM4 3v9.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V3H4Zm2.5 1.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Zm3 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                        </svg>
                      </button>
                    </div>

                    {/* Card body */}
                    {!variant.collapsed && (
                      <div style={{ padding: "0 20px 24px 24px" }}>

                        {/* TARGET SEGMENT */}
                        <div style={{ marginTop: 20 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: segError ? "#EF4444" : "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>TARGET SEGMENT</div>
                          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12 }}>Users matching this segment will receive the values defined below.</div>

                          {/* Segment pills + search dropdown */}
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                            {variant.segments.map((segName) => (
                              <span key={segName} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px 4px 12px", borderRadius: 999, background: "#EFF6FF", color: "#3B82F6", border: "1px solid #BFDBFE", fontSize: 12, fontWeight: 500 }}>
                                {segName}
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateVariant(variant.id, (v) => ({ ...v, segments: v.segments.filter((s) => s !== segName) })); setErrors((curr) => ({ ...curr, [`variant_${variant.id}_segments`]: undefined })); }}
                                  style={{ background: "none", border: "none", color: "#93C5FD", cursor: "pointer", padding: "0 2px", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = "#3B82F6"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = "#93C5FD"; }}
                                >×</button>
                              </span>
                            ))}

                            {/* Segment search dropdown */}
                            <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setOpenSegmentMenuId(segMenuOpen ? null : variant.id)}
                                style={{
                                  display: "flex", alignItems: "center", gap: 8,
                                  padding: "7px 12px",
                                  border: `1px solid ${segMenuOpen ? "#3B82F6" : (segError ? "#FCA5A5" : "#E5E7EB")}`,
                                  borderRadius: 6, background: WHITE, cursor: "pointer", minWidth: 180,
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                  <circle cx="6.5" cy="6.5" r="4.5" stroke="#9CA3AF" strokeWidth="1.5"/>
                                  <path d="M10.5 10.5L14 14" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <span style={{ fontSize: 13, color: "#9CA3AF", flex: 1, textAlign: "left" }}>Search Segments...</span>
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: segMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                                  <path d="M4 6l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>

                              {segMenuOpen && (
                                <div style={{ position: "absolute", left: 0, top: "calc(100% + 4px)", background: WHITE, border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 220, zIndex: 9999, overflow: "hidden" }}>
                                  {availableSegs.length === 0 ? (
                                    <div style={{ padding: "12px 16px", fontSize: 13, color: "#9CA3AF", textAlign: "center" }}>All segments selected</div>
                                  ) : (
                                    availableSegs.map((seg) => {
                                      // "All Users" used in another variant → disabled
                                      const usedInOther = customVariants.some((v, vi) => vi !== idx && v.segments.includes(seg.name));
                                      // If any variant has "All Users" and this segment isn't "All Users" → block it
                                      const blockedByAllUsers = allUsersSelectedAnywhere && !thisVariantHasAllUsers && seg.name !== "All Users";
                                      // "All Users" is globally exclusive: if it's selected anywhere it's "in use"
                                      const allUsersInUse = seg.name === "All Users" && allUsersSelectedAnywhere && !thisVariantHasAllUsers;
                                      const isDisabled = usedInOther || blockedByAllUsers || allUsersInUse;
                                      const disabledLabel = allUsersInUse ? "In use" : (blockedByAllUsers ? "Blocked by All Users" : (usedInOther ? "In use" : null));
                                      return (
                                        <button
                                          key={seg.id}
                                          disabled={isDisabled}
                                          onClick={() => {
                                            if (isDisabled) return;
                                            updateVariant(variant.id, (v) => ({ ...v, segments: [...v.segments, seg.name] }));
                                            setErrors((curr) => ({ ...curr, [`variant_${variant.id}_segments`]: undefined }));
                                            setOpenSegmentMenuId(null);
                                          }}
                                          style={{
                                            display: "flex", alignItems: "center", justifyContent: "space-between",
                                            width: "100%", padding: "10px 14px", border: "none",
                                            background: "none", fontSize: 13,
                                            color: isDisabled ? "#9CA3AF" : "#111827",
                                            cursor: isDisabled ? "not-allowed" : "pointer",
                                            textAlign: "left", opacity: isDisabled ? 0.55 : 1,
                                          }}
                                          onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.background = "#F9FAFB"; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                                        >
                                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }} title={seg.name.length > 13 ? seg.name : undefined}>
                                            {seg.name.length > 13 ? seg.name.slice(0, 13) + "…" : seg.name}
                                          </span>
                                          {disabledLabel && (
                                            <span style={{ fontSize: 11, color: "#9CA3AF", background: "#F3F4F6", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>{disabledLabel}</span>
                                          )}
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {segError && (
                            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#DC2626" }}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1ZM5.25 3.5h1.5v3.5h-1.5V3.5Zm0 4.5h1.5V9.5h-1.5V8Z"/></svg>
                              {segError}
                            </div>
                          )}
                          {hasConflict && !segError && (
                            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#DC2626" }}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1ZM5.25 3.5h1.5v3.5h-1.5V3.5Zm0 4.5h1.5V9.5h-1.5V8Z"/></svg>
                              Segment conflict: {conflictSegs.join(", ")} already targeted by another variant.
                            </div>
                          )}
                        </div>

                        {/* ROLLOUT WITHIN SEGMENT */}
                        <div style={{ marginTop: 20 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>ROLLOUT WITHIN SEGMENT</div>
                          <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 12 }}>Percentage of matched users who receive this variant. The rest fall through to the Default.</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <input
                              type="range" min="0" max="100"
                              value={variant.rolloutPercentage}
                              onChange={(e) => updateVariant(variant.id, (v) => ({ ...v, rolloutPercentage: Number(e.target.value) }))}
                              style={{ flex: 1, height: 6, accentColor: "#3B82F6", cursor: "pointer" }}
                            />
                            <input
                              type="number" min="0" max="100"
                              value={variant.rolloutPercentage}
                              onChange={(e) => updateVariant(variant.id, (v) => ({ ...v, rolloutPercentage: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                              style={{ width: 56, padding: "6px 8px", border: "1px solid #E5E7EB", borderRadius: 6, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#111827", background: WHITE, outline: "none" }}
                            />
                            <span style={{ fontSize: 14, color: "#6B7280" }}>%</span>
                          </div>
                        </div>

                        {/* PARAMETER VALUES FOR THIS VARIANT */}
                        {form.parameters.length > 0 && (
                          <div style={{ marginTop: 20 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>PARAMETER VALUES FOR THIS VARIANT</div>
                            <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "visible" }}>
                              {/* Header */}
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 80px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", borderRadius: "8px 8px 0 0" }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", padding: "12px 16px" }}>KEY</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", padding: "12px 16px" }}>VALUE</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", padding: "12px 16px", textAlign: "right" }}>ACTION</div>
                              </div>
                              {/* Rows */}
                              {form.parameters.map((param, pi) => {
                                const overrideValue = variant.parameterOverrides[param.key] ?? param.value;
                                const isOverridden = String(overrideValue) !== String(param.value);
                                const setOverride = (val) => updateVariant(variant.id, (v) => ({ ...v, parameterOverrides: { ...v.parameterOverrides, [param.key]: val } }));
                                const menuKey = `${variant.id}_${param.key}`;
                                const menuOpen = openActionMenuKey === menuKey;
                                const isEditing = openInlineEditKey === menuKey;
                                const isBoolean = param.type === "Boolean";
                                return (
                                  <div key={param.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 80px", borderTop: pi === 0 ? "none" : "1px solid #F3F4F6", alignItems: "center", position: "relative" }}>
                                    {/* KEY */}
                                    <div style={{ padding: "14px 16px", fontFamily: "ui-monospace, monospace", fontSize: 13, color: "#3B82F6" }}>{param.key}</div>
                                    {/* VALUE — static display or inline editor */}
                                    <div style={{ padding: isEditing ? "8px 16px" : "14px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                                      {isEditing ? (
                                        /* Inline editor */
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }} onClick={(e) => e.stopPropagation()}>
                                          {isBoolean ? (
                                            <select
                                              value={inlineEditValue}
                                              onChange={(e) => setInlineEditValue(e.target.value)}
                                              autoFocus
                                              style={{ flex: 1, padding: "6px 10px", border: "2px solid #3B82F6", borderRadius: 6, fontSize: 13, color: "#111827", background: WHITE, outline: "none", cursor: "pointer" }}
                                            >
                                              <option value="true">True</option>
                                              <option value="false">False</option>
                                            </select>
                                          ) : (
                                            <input
                                              autoFocus
                                              value={inlineEditValue}
                                              onChange={(e) => setInlineEditValue(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") { setOverride(isBoolean ? inlineEditValue === "true" : inlineEditValue); setOpenInlineEditKey(null); }
                                                if (e.key === "Escape") { setOpenInlineEditKey(null); }
                                              }}
                                              style={{ flex: 1, padding: "6px 10px", border: "2px solid #3B82F6", borderRadius: 6, fontSize: 13, color: "#111827", background: WHITE, outline: "none" }}
                                            />
                                          )}
                                          {/* Confirm */}
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setOverride(isBoolean ? inlineEditValue === "true" : inlineEditValue); setOpenInlineEditKey(null); }}
                                            style={{ background: "#3B82F6", border: "none", color: WHITE, borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                                          >Save</button>
                                          {/* Cancel */}
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setOpenInlineEditKey(null); }}
                                            style={{ background: "#F3F4F6", border: "none", color: "#374151", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
                                          >✕</button>
                                        </div>
                                      ) : (
                                        <>
                                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: isOverridden ? "#F59E0B" : "#D1D5DB", flexShrink: 0, display: "inline-block" }} />
                                          {isOverridden ? (
                                            <span style={{ fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{String(overrideValue)}</span>
                                          ) : (
                                            <span style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>"{String(param.value)}" (Default)</span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    {/* ACTION */}
                                    <div style={{ padding: "14px 16px", display: "flex", justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                                      {!isEditing && (
                                        <div style={{ position: "relative" }}>
                                          <button
                                            onClick={() => setOpenActionMenuKey(menuOpen ? null : menuKey)}
                                            style={{ background: menuOpen ? "#F3F4F6" : "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: "4px 8px", fontSize: 16, borderRadius: 6, letterSpacing: 2, lineHeight: 1 }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; e.currentTarget.style.color = "#374151"; }}
                                            onMouseLeave={(e) => { if (!menuOpen) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#9CA3AF"; } }}
                                          >…</button>
                                          {menuOpen && (
                                            <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: WHITE, border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden", minWidth: 120, display: "flex", flexDirection: "column" }}>
                                              {/* Edit action */}
                                              <button
                                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", border: "none", background: "none", fontSize: 13, color: "#374151", cursor: "pointer", whiteSpace: "nowrap", textAlign: "left" }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setOpenActionMenuKey(null);
                                                  setInlineEditValue(String(overrideValue));
                                                  setOpenInlineEditKey(menuKey);
                                                }}
                                              >
                                                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M9.5 1.5L12.5 4.5L4.5 12.5H1.5V9.5L9.5 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                                                Edit
                                              </button>
                                              {/* Divider + Reset — only shown when value is overridden */}
                                              {isOverridden && (
                                                <>
                                                  <div style={{ height: 1, background: "#F3F4F6", flexShrink: 0 }} />
                                                  <button
                                                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", border: "none", background: "none", fontSize: 13, color: "#DC2626", cursor: "pointer", whiteSpace: "nowrap", textAlign: "left" }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = "#FEF2F2"; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                                                    onClick={(e) => { e.stopPropagation(); setOverride(param.value); setOpenActionMenuKey(null); }}
                                                  >
                                                    <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M5 1h4a.5.5 0 0 1 .5.5V2h3a.5.5 0 0 1 0 1h-.5v8.5A1.5 1.5 0 0 1 10.5 13h-7A1.5 1.5 0 0 1 2 11.5V3h-.5a.5.5 0 0 1 0-1h3V1.5A.5.5 0 0 1 5 1Zm-2 2v8.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V3H3Zm2 1.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Zm4 0a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/></svg>
                                                    Reset to default
                                                  </button>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

                        {/* Add Variant button — full width, dashed, with UI tooltip at max */}
            <div style={{ position: "relative", marginBottom: 24 }}>
              <button
                disabled={atMax}
                onClick={() => { if (!atMax) addVariant(); }}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  border: `1.5px dashed ${atMax ? "#E5E7EB" : "#BFDBFE"}`,
                  borderRadius: 8,
                  background: atMax ? "#F9FAFB" : "#F8FBFF",
                  color: atMax ? "#9CA3AF" : "#3B82F6",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: atMax ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!atMax) { e.currentTarget.style.background = "#EFF6FF"; e.currentTarget.style.borderColor = "#3B82F6"; }
                  if (atMax) { e.currentTarget.parentNode.querySelector("[data-max-tooltip]").style.display = "flex"; }
                }}
                onMouseLeave={(e) => {
                  if (!atMax) { e.currentTarget.style.background = "#F8FBFF"; e.currentTarget.style.borderColor = "#BFDBFE"; }
                  if (atMax) { e.currentTarget.parentNode.querySelector("[data-max-tooltip]").style.display = "none"; }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-3.5a.75.75 0 0 1 .75.75v2h2a.75.75 0 0 1 0 1.5h-2v2a.75.75 0 0 1-1.5 0v-2h-2a.75.75 0 0 1 0-1.5h2v-2A.75.75 0 0 1 8 4.5Z"/>
                </svg>
                Add Variant
              </button>
              {/* UI-system tooltip for max-reached state */}
              <div
                data-max-tooltip
                style={{
                  display: "none",
                  position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                  background: "#111827", color: WHITE, fontSize: 12, fontWeight: 500,
                  padding: "6px 12px", borderRadius: 6, whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999,
                  alignItems: "center", gap: 6, pointerEvents: "none",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="6.5" cy="6.5" r="6" stroke="rgba(255,255,255,0.5)"/>
                  <rect x="6" y="5.5" width="1" height="4" rx="0.5" fill="white"/>
                  <rect x="6" y="3.5" width="1" height="1.2" rx="0.5" fill="white"/>
                </svg>
                Maximum 10 variants is allowed
                {/* Arrow */}
                <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
              </div>
            </div>

            {/* DEFAULT FALLBACK divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, borderTop: "1px dashed #D1D5DB" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.06em", textTransform: "uppercase", background: "#F3F4F6", padding: "0 12px", whiteSpace: "nowrap" }}>DEFAULT FALLBACK</span>
              <div style={{ flex: 1, borderTop: "1px dashed #D1D5DB" }} />
            </div>

            {/* Default Experience card */}
            <div style={{ background: WHITE, border: "1px solid #E5E7EB", borderRadius: 8, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <svg style={{ flexShrink: 0, color: "#9CA3AF" }} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H3.5A1.5 1.5 0 0 0 2 7.5v6A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12.5 6h-1V4.5A3.5 3.5 0 0 0 8 1Zm-2 3.5a2 2 0 0 1 4 0V6H6V4.5ZM3.5 7h9a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5ZM8 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>
              </svg>
              {/* Label + info tooltip */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Default Experience</span>
                {/* Info icon with hover tooltip */}
                <div
                  style={{ position: "relative", display: "inline-flex", cursor: "default" }}
                  onMouseEnter={(e) => { e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }}
                  onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/>
                    <rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/>
                    <rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/>
                  </svg>
                  <div style={{
                    visibility: "hidden", opacity: 0,
                    position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                    background: "#111827", color: WHITE, fontSize: 12, fontWeight: 400,
                    padding: "7px 12px", borderRadius: 6, whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999,
                    transition: "opacity 0.15s, visibility 0.15s", pointerEvents: "none",
                  }}>
                    All users will receive the Default until you configure a variant above.
                    <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
                  </div>
                </div>
              </div>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>ALL UNMATCHED USERS</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginLeft: 12 }}>100%</span>
              <svg style={{ color: "#9CA3AF", marginLeft: 4 }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        );
      })()}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <button onClick={step === 1 ? showBackConfirmation : () => setStep(1)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 8, background: WHITE, border: "1px solid #E5E7EB", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Back</button>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSaveDraft} disabled={draftLoading} style={{ ...{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 8, background: WHITE, border: "1px solid #E5E7EB", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }, minWidth: 118, justifyContent: "center" }}>
            {draftLoading ? <Spinner /> : "Save Draft"}
          </button>
          {step === 1 ? (
            <button onClick={handleNext} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 8, background: "#3B82F6", border: "none", color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Next <ChevronRightIcon />
            </button>
          ) : (
            <button onClick={openPublishFlow} disabled={publishLoading} style={{ ...{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 8, background: "#3B82F6", border: "none", color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer" }, minWidth: 148, justifyContent: "center" }}>
              {publishLoading ? <Spinner color="#FFFFFF" /> : "Go Live"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RemoteConfigurationDetail({ config, experiments, onBack, onEdit, onOpenExperiment }) {
  const [configTab, setConfigTab] = useState("configuration");
  const [keysExpanded, setKeysExpanded] = useState(true);
  const [versionExpanded, setVersionExpanded] = useState(true);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [tooltipKey, setTooltipKey] = useState(null);
  const [restartTooltipVisible, setRestartTooltipVisible] = useState(false);

  const isAB = config.deploymentType === "A/B Test Experiment";
  const linkedExperiments = experiments.filter((e) => !e.archived && e.linkedConfigKey === config.key);
  const activeSegments = config.selectedSegments?.length ? config.selectedSegments : [];

  // Variant data with traffic split colours
  const variantColors = ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6"];
  const mockVariants = [
    { id: "control", label: "Control", traffic: 50, value: "Welcome back!", color: variantColors[0] },
    { id: "variant_b", label: "Variant B", traffic: 45, value: "Good to see you again!", color: variantColors[1] },
    { id: "variant_c", label: "Variant C", traffic: 5, value: "Welcome back!", color: variantColors[2] },
  ];
  const controlValue = mockVariants.find((v) => v.id === "control")?.value;
  const rolloutPct = config.rollout ?? 100;
  const displayTitle = config.name;

  const handleCopyKey = () => {
    try { navigator.clipboard.writeText(config.key); } catch (_) {}
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1800);
  };

  // Campaign banner logic
  const hasLinkedCampaign = linkedExperiments.length > 0;
  const showAmberBanner = config.status === "Live" && hasLinkedCampaign;
  const showNeutralBanner = config.status !== "Live" && hasLinkedCampaign;

  // Overview metadata — differentiated by type
  const abOverviewMeta = [
    { label: "TYPE", value: config.type || "String", pill: true },
    { label: "TARGET SEGMENT", value: activeSegments.length ? `${activeSegments.length} rule${activeSegments.length > 1 ? "s" : ""}` : "1 rule" },
    { label: "EXPERIMENT REACH", value: `${rolloutPct}%`, infoTooltip: "The percentage of your total user base eligible to enter this experiment." },
    { label: "CONVERSION GOALS", value: "checkout_started", mono: true },
    { label: "VARIANT COUNT", value: `${mockVariants.length} variants` },
    { label: "CREATED BY", value: config.creator || "John Smith" },
    { label: "CREATED", value: config.created || "2026-02-01" },
    { label: "STATUS", value: config.status, badge: true },
    { label: "VERSION", value: `v${Number(config.version || 1).toFixed(1)}` },
    { label: "LAST EDITED", value: "Just now" },
  ];
  const rolloutOverviewMeta = [
    { label: "TYPE", value: config.type || "String", pill: true },
    { label: "TARGET SEGMENT", value: activeSegments.length ? `${activeSegments.length} rule${activeSegments.length > 1 ? "s" : ""}` : "1 rule" },
    { label: "ROLLOUT STRATEGY", value: "Percentage-Based" },
    { label: "ACTIVE SINCE", value: config.status === "Live" ? (config.updated || config.created || "—") : "—" },
    { label: "CURRENT VALUE", value: (() => { const v = String(config.parameters?.[0]?.value ?? "true"); return v.length > 18 ? v.substring(0, 18) + "…" : v; })(), mono: true },
    { label: "CREATED BY", value: config.creator || "John Smith" },
    { label: "CREATED", value: config.created || "2026-02-01" },
    { label: "STATUS", value: config.status, badge: true },
    { label: "VERSION", value: `v${Number(config.version || 1).toFixed(1)}` },
    { label: "LAST EDITED", value: "Just now" },
  ];
  const overviewMeta = isAB ? abOverviewMeta : rolloutOverviewMeta;

  // Tab style helper
  const tabStyle = (key) => ({
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "9px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: configTab === key ? "1px solid #3B82F6" : `1px solid ${BORDER}`,
    background: configTab === key ? "#3B82F6" : WHITE,
    color: configTab === key ? WHITE : TEXT_MUTED,
    outline: "none",
  });

  const ghostButtonStyle = { ...secondaryButtonStyle, background: WHITE, border: "1px solid #D1D5DB", color: "#374151" };

  // Version History sidebar — rendered in both tabs
  const versionHistorySidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer", borderBottom: versionExpanded ? `1px solid ${BORDER}` : "none" }} onClick={() => setVersionExpanded((v) => !v)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke={TEXT_MUTED} strokeWidth="1.4"/><path d="M8 5v3.5l2.5 1.5" stroke={TEXT_MUTED} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Version History</span>
            <span style={{ background: "#EFF6FF", color: "#3B82F6", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>1</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: versionExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><path d="M4 6l4 4 4-4" stroke={TEXT_MUTED} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        {versionExpanded && (
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flexShrink: 0, marginTop: 2 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#3B82F6", border: "2.5px solid #BFDBFE" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>v{Number(config.version || 1).toFixed(1)} (Current)</span>
                  <ConfigStatusBadge status={config.status} />
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>{config.created || "2026-02-10"} · {config.creator || "John Smith"}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ fontSize: 11, padding: "4px 9px", borderRadius: 6, border: "1px solid #E5E7EB", background: WHITE, color: "#374151", cursor: "pointer", fontWeight: 500 }}>Compare</button>
                  <button style={{ fontSize: 11, padding: "4px 9px", borderRadius: 6, border: "1px solid #E5E7EB", background: WHITE, color: "#374151", cursor: "pointer", fontWeight: 500 }}>Copy link</button>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#9CA3AF", padding: "8px 0 0", borderTop: `1px dashed #E5E7EB`, textAlign: "center" }}>
              Only 1 version exists. Previous versions appear here after edits.
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>

      {/* ── Breadcrumb ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 12, color: TEXT_MUTED }}>
        <span style={{ cursor: "pointer", color: TEXT_MUTED }} onClick={onBack}>Remote Configuration</span>
        <span style={{ color: "#D1D5DB" }}>›</span>
        <span style={{ color: "#3B82F6", fontWeight: 500 }}>{displayTitle}</span>
      </div>

      {/* ── Campaign banners ── */}
      {showAmberBanner && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 10, border: "1px solid #FCD34D", background: "#FFFBEB", marginBottom: 18 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>Used in Active Campaign — </span>
            <span style={{ fontSize: 13, color: "#B45309" }}>Changes to this configuration may impact a live campaign. Review before making modifications.</span>
          </div>
        </div>
      )}
      {showNeutralBanner && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 16px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#F9FAFB", marginBottom: 18 }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1, color: "#9CA3AF" }}>
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M8 7v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
          </svg>
          <span style={{ fontSize: 13, color: "#6B7280" }}>This configuration is referenced by a campaign.</span>
        </div>
      )}

      {/* ── Page title section ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: TEXT }}>{displayTitle}</h1>
          <ConfigStatusBadge status={config.status} />
          <DeploymentTypeBadge deploymentType={config.deploymentType} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <code style={{ fontSize: 12, color: "#6B7280", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", background: "#F3F4F6", padding: "2px 8px", borderRadius: 4, border: "1px solid #E5E7EB" }}>{config.key}</code>
          <div style={{ position: "relative" }}>
            <button
              onClick={handleCopyKey}
              title="Copy key"
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", padding: "3px 5px", display: "inline-flex", alignItems: "center", borderRadius: 4 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; e.currentTarget.style.color = TEXT; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9CA3AF"; }}
            >
              {copiedKey
                ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                : <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="5" y="1.5" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M3 4.5H2.5A1.5 1.5 0 0 0 1 6v8a1.5 1.5 0 0 0 1.5 1.5H10A1.5 1.5 0 0 0 11.5 14v-.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              }
            </button>
            {copiedKey && (
              <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: WHITE, fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 5, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 999 }}>
                Copied!
                <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #1F2937" }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <button onClick={() => setConfigTab("configuration")} style={tabStyle("configuration")}>
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <path d="M9 11.5A2.5 2.5 0 1 0 9 6.5a2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14.7 11a1 1 0 0 0 .2 1.1l.04.04a1.5 1.5 0 1 1-2.12 2.12l-.04-.04a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.91V15a1.5 1.5 0 1 1-3 0v-.07a1 1 0 0 0-.65-.91 1 1 0 0 0-1.1.2l-.04.04a1.5 1.5 0 1 1-2.12-2.12l.04-.04A1 1 0 0 0 4.4 11a1 1 0 0 0-.91-.6H3a1.5 1.5 0 1 1 0-3h.07a1 1 0 0 0 .91-.65 1 1 0 0 0-.2-1.1l-.04-.04A1.5 1.5 0 1 1 5.86 3.5l.04.04A1 1 0 0 0 7 3.74a1 1 0 0 0 .6-.91V3a1.5 1.5 0 1 1 3 0v.07a1 1 0 0 0 .6.91 1 1 0 0 0 1.1-.2l.04-.04a1.5 1.5 0 1 1 2.12 2.12l-.04.04A1 1 0 0 0 14.26 7a1 1 0 0 0 .91.6H15a1.5 1.5 0 1 1 0 3h-.07a1 1 0 0 0-.91.6l-.02-.16Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Configuration
        </button>
        <button onClick={() => setConfigTab("report")} style={tabStyle("report")}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="1.5" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {isAB ? "Insights" : "Details"}
        </button>
      </div>

      {/* ══ CONFIGURATION TAB ══ */}
      {configTab === "configuration" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 18, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Overview card */}
            <div style={{ ...cardStyle, padding: 22 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: TEXT }}>Overview</h3>
              {/* Rollout Coverage hero — only for Rolled Out type */}
              {!isAB && (
                <div style={{ marginBottom: 18, padding: "16px 20px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #DBEAFE" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Rollout Coverage</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: 1, height: 10, borderRadius: 999, background: "#DBEAFE", overflow: "hidden" }}>
                      <div style={{ width: `${rolloutPct}%`, height: "100%", borderRadius: 999, background: "#3B82F6" }} />
                    </div>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#1D4ED8", minWidth: 52, textAlign: "right" }}>{rolloutPct}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#3B82F6", marginTop: 5 }}>of users are receiving this configuration</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
                {overviewMeta.map((item) => (
                  <div key={item.label} style={{ position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em" }}>{item.label}</div>
                      {item.infoTooltip && (
                        <span
                          onMouseEnter={() => setTooltipKey(item.label)}
                          onMouseLeave={() => setTooltipKey(null)}
                          style={{ color: "#9CA3AF", cursor: "default", display: "inline-flex", alignItems: "center" }}
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                            <path d="M8 7v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                            <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
                          </svg>
                          {tooltipKey === item.label && (
                            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: 220, background: "#1F2937", color: WHITE, fontSize: 11, lineHeight: 1.5, padding: "8px 11px", borderRadius: 7, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 300, pointerEvents: "none", fontWeight: 400 }}>
                              {item.infoTooltip}
                              <div style={{ position: "absolute", top: -5, left: 10, width: 10, height: 10, background: "#1F2937", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
                            </div>
                          )}
                        </span>
                      )}
                    </div>
                    {item.pill ? (
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 6, background: "#EFF6FF", color: "#1D4ED8", fontSize: 12, fontWeight: 600 }}>{item.value}</span>
                    ) : item.badge ? (
                      <ConfigStatusBadge status={item.value} />
                    ) : (
                      <div style={{ fontSize: 13, color: TEXT, fontFamily: item.mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit", fontWeight: 500 }}>{item.value}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Keys & Variants (A/B) or Active Value (Rollout) */}
            {isAB ? (
              <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", cursor: "pointer", borderBottom: `1px solid ${BORDER}` }} onClick={() => setKeysExpanded((v) => !v)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>greeting_title</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>{mockVariants.length} variants</span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: keysExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>
                      <path d="M4 6l4 4 4-4" stroke={TEXT_MUTED} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                {keysExpanded && (
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 6 }}>Traffic Distribution</div>
                      <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", gap: 1 }}>
                        {mockVariants.map((v) => <div key={v.id} title={`${v.label}: ${v.traffic}%`} style={{ width: `${v.traffic}%`, height: "100%", background: v.color, minWidth: 2 }} />)}
                      </div>
                      <div style={{ display: "flex", gap: 14, marginTop: 7, flexWrap: "wrap" }}>
                        {mockVariants.map((v) => (
                          <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: v.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: TEXT_MUTED }}>{v.label} <b style={{ color: TEXT }}>{v.traffic}%</b></span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {mockVariants.map((variant) => {
                        const sameAsControl = variant.id !== "control" && variant.value === controlValue;
                        return (
                          <div key={variant.id} style={{ borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT, padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: 2, background: variant.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{variant.label}</span>
                                {sameAsControl && <span style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", background: "#F3F4F6", borderRadius: 4, padding: "2px 7px", border: "1px solid #E5E7EB" }}>same as control</span>}
                              </div>
                              <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>{variant.traffic}%</span>
                            </div>
                            <div style={{ fontSize: 12, color: TEXT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", marginBottom: 10, padding: "6px 8px", background: WHITE, borderRadius: 6, border: `1px solid ${BORDER}` }}>{variant.value}</div>
                            <div style={{ height: 4, borderRadius: 999, background: "#E5E7EB", overflow: "hidden" }}>
                              <div style={{ width: `${variant.traffic}%`, height: "100%", borderRadius: 999, background: variant.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Rolled Out: Active Value card — single deployed value per parameter */
              <div style={{ ...cardStyle, padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>Active Value</h3>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#15803D", background: "#EAFBF4", borderRadius: 6, padding: "3px 9px", border: "1px solid #BBF7D0" }}>Serving to {rolloutPct}% of users</span>
                </div>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: TEXT_MUTED }}>The value currently deployed to your user base.</p>
                {config.parameters?.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {config.parameters.map((param) => (
                      <div key={param.key} style={{ borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT, padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <code style={{ fontSize: 13, fontWeight: 700, color: TEXT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{param.key}</code>
                            <span style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", background: "#F3F4F6", borderRadius: 4, padding: "2px 6px", border: "1px solid #E5E7EB" }}>{param.type}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#15803D", background: "#EAFBF4", borderRadius: 5, padding: "2px 9px", border: "1px solid #BBF7D0" }}>Active Value</span>
                        </div>
                        {param.description && <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 10 }}>{param.description}</div>}
                        <div style={{ fontSize: 12, color: TEXT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", padding: "10px 12px", background: WHITE, borderRadius: 8, border: `1px solid ${BORDER}`, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {param.type === "JSON" ? (() => { try { return JSON.stringify(JSON.parse(String(param.value)), null, 2); } catch (_) { return String(param.value); } })() : String(param.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "20px", textAlign: "center", color: TEXT_MUTED, fontSize: 13, border: `1px dashed ${BORDER}`, borderRadius: 8 }}>No parameters configured yet.</div>
                )}
              </div>
            )}
          </div>
          {/* Right sidebar — Version History always visible */}
          {versionHistorySidebar}
        </div>
      )}

      {/* ══ INSIGHTS / DETAILS TAB ══ */}
      {configTab === "report" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: 18, flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {isAB ? (
              /* ─── A/B Insights ─── */
              <>
                {/* Linked Experiments */}
                <div style={{ ...cardStyle, padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>Linked Experiments</h3>
                    <span style={{ background: "#EFF6FF", color: "#3B82F6", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 9px" }}>{linkedExperiments.length}</span>
                  </div>
                  {linkedExperiments.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {linkedExperiments.map((experiment) => (
                        <div key={experiment.id}>
                          <button
                            onClick={() => onOpenExperiment(experiment)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT, cursor: "pointer", textAlign: "left" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#F0F4FF"; e.currentTarget.style.borderColor = "#BFDBFE"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = SOFT; e.currentTarget.style.borderColor = BORDER; }}
                          >
                            <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{experiment.name}</span>
                              <span style={{ fontSize: 12, color: TEXT_MUTED }}>{experiment.hypothesis}</span>
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                              <StatusBadge status={experiment.status} />
                              <span style={{ color: TEXT_MUTED }}><ChevronRightIcon /></span>
                            </span>
                          </button>
                          {/* Apply Winner Value inline CTA */}
                          {experiment.status === "winner_declared" && (
                            <div style={{ marginTop: 6, padding: "13px 16px", borderRadius: 10, border: "1px solid #A5B4FC", background: "#EEF3FF", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#3730A3", marginBottom: 3 }}>🏆 Winner Declared</div>
                                <div style={{ fontSize: 12, color: "#4338CA", lineHeight: 1.45 }}>Apply the winning variant's value to this configuration and roll it out to all users.</div>
                              </div>
                              <button style={{ ...primaryButtonStyle, background: "#4F46E5", flexShrink: 0, fontSize: 12, padding: "8px 14px" }} onClick={() => console.log("Apply winner:", experiment.id)}>
                                Apply Winner Value
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No linked experiments" description="This configuration has not been used in an A/B test yet." />
                  )}
                </div>

                {/* Experiment Metrics */}
                <div style={{ ...cardStyle, padding: 22 }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: TEXT }}>Experiment Metrics</h3>
                  <p style={{ margin: "0 0 16px", fontSize: 12, color: TEXT_MUTED }}>Data will appear once the experiment has enough participants.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                    {[
                      { label: "Total Participants", value: linkedExperiments.length ? "63,350" : "—", sub: linkedExperiments.length ? "Control: 31,675 · Variant B: 31,675" : "No data yet" },
                      { label: "Statistical Confidence", value: linkedExperiments.length ? "99%" : "—", sub: linkedExperiments.length ? "p-value: 0.032" : "No data yet" },
                      { label: "Control Conv. Rate", value: linkedExperiments.length ? "3.2%" : "—", sub: linkedExperiments.length ? "1,014 conversions" : "No data yet" },
                      { label: "Variant B Conv. Rate", value: linkedExperiments.length ? "3.9%" : "—", sub: linkedExperiments.length ? "+23% uplift vs control" : "No data yet" },
                      { label: "Experiment Duration", value: linkedExperiments.length ? "14 days" : "—", sub: linkedExperiments.length ? "05 Jan → 19 Jan 2025" : "Not yet started" },
                      { label: "Goal Metric", value: linkedExperiments.length ? "banner_click" : "—", sub: "Conversion Rate", mono: true },
                    ].map((stat) => (
                      <div key={stat.label} style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{stat.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: stat.value === "—" ? TEXT_MUTED : TEXT, fontFamily: stat.mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit" }}>{stat.value}</div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 3 }}>{stat.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Change Log */}
                <div style={{ ...cardStyle, padding: 22 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: TEXT }}>Change Log</h3>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {[
                      { time: "2025-01-10 · 14:32", user: "Emre Sumer", summary: "Variant B traffic changed from 40% → 45%" },
                      { time: "2025-01-08 · 09:15", user: "Emre Sumer", summary: "Experiment goal metric set to banner_click" },
                      { time: "2025-01-07 · 11:00", user: "Aylin Yildiz", summary: "Initial configuration created" },
                    ].map((entry, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < 2 ? 14 : 0, borderBottom: i < 2 ? `1px solid ${BORDER}` : "none", marginBottom: i < 2 ? 14 : 0 }}>
                        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#D1D5DB", marginTop: 5, flexShrink: 0 }} />
                          {i < 2 && <div style={{ width: 1, flex: 1, background: "#E5E7EB", minHeight: 16 }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, color: TEXT, fontWeight: 500, marginBottom: 3 }}>{entry.summary}</div>
                          <div style={{ fontSize: 11, color: TEXT_MUTED }}>{entry.time} · {entry.user}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* ─── Rolled Out Details ─── */
              <>
                {/* Rollout Adoption metrics */}
                <div style={{ ...cardStyle, padding: 22 }}>
                  <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: TEXT }}>Rollout Adoption</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, marginBottom: 14 }}>
                    {[
                      { label: "Users Receiving Config", value: config.status === "Live" ? "47,210" : "—", sub: config.status === "Live" ? "of ~50,000 target" : "Config is not live", green: config.status === "Live" },
                      { label: "Fetch Success Rate", value: config.status === "Live" ? "99.7%" : "—", sub: config.status === "Live" ? "Last 24 hours" : "No data yet", green: config.status === "Live" },
                    ].map((stat) => (
                      <div key={stat.label} style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{stat.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: stat.green ? "#15803D" : TEXT_MUTED }}>{stat.value}</div>
                        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 3 }}>{stat.sub}</div>
                      </div>
                    ))}
                  </div>
                  {/* Coverage vs target progress */}
                  <div style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT, marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Rollout Coverage vs. Target</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 999, background: "#E5E7EB", overflow: "hidden" }}>
                        <div style={{ width: config.status === "Live" ? "94.4%" : "0%", height: "100%", borderRadius: 999, background: "#22C55E" }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, minWidth: 44 }}>{config.status === "Live" ? "94.4%" : "0%"}</span>
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 5 }}>47,210 reached / 50,000 target</div>
                  </div>
                  {/* Adoption sparkline */}
                  <div style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Adoption Over Time</div>
                    {config.status === "Live" ? (
                      <svg width="100%" height="52" viewBox="0 0 300 52" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25"/>
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02"/>
                          </linearGradient>
                        </defs>
                        <path d="M0 48 C40 44 60 36 90 26 S140 14 180 10 S250 5 300 4" stroke="#3B82F6" strokeWidth="2" fill="none" strokeLinecap="round"/>
                        <path d="M0 48 C40 44 60 36 90 26 S140 14 180 10 S250 5 300 4 L300 52 L0 52Z" fill="url(#sparkGrad)"/>
                      </svg>
                    ) : (
                      <div style={{ fontSize: 12, color: TEXT_MUTED, textAlign: "center", padding: "12px 0" }}>No data — configuration is not live yet.</div>
                    )}
                  </div>
                </div>

                {/* Rollout Health card */}
                <div style={{ ...cardStyle, padding: 22 }}>
                  <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: TEXT }}>Rollout Health</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                    {[
                      { label: "Current Value", value: String(config.parameters?.[0]?.value ?? "true"), mono: true },
                      { label: "Target Segment", value: "All Users" },
                      { label: "Rollout Percentage", value: `${rolloutPct}%` },
                      { label: "Last Value Change", value: config.updated || "—" },
                      { label: "Platforms", value: "iOS · Android · Web" },
                      { label: "Environment", value: "Production" },
                    ].map((item) => (
                      <div key={item.label} style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{item.label}</div>
                        <div style={{ fontSize: 13, color: TEXT, fontWeight: 500, fontFamily: item.mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit", wordBreak: "break-all" }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rollout Timeline */}
                <div style={{ ...cardStyle, padding: 22 }}>
                  <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: TEXT }}>Rollout Timeline</h3>
                  {[
                    { label: "Created", date: config.created || "—", desc: `Created by ${config.creator || "unknown"}`, color: "#9CA3AF" },
                    { label: "First Deployed", date: config.updated || "—", desc: `Rolled out to ${rolloutPct}% of users`, color: "#3B82F6" },
                    { label: "Current", date: "Now", desc: `${rolloutPct}% rollout · ${config.status}`, color: config.status === "Live" ? "#22C55E" : "#9CA3AF", isCurrent: true },
                  ].map((event, i, arr) => (
                    <div key={event.label} style={{ display: "flex", gap: 14 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", background: event.color, marginTop: 3, flexShrink: 0, border: event.isCurrent ? `3px solid ${event.color}40` : "none", boxSizing: "content-box" }} />
                        {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: "#E5E7EB", minHeight: 28 }} />}
                      </div>
                      <div style={{ paddingBottom: i < arr.length - 1 ? 20 : 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{event.label}</span>
                          <span style={{ fontSize: 11, color: TEXT_MUTED }}>{event.date}</span>
                        </div>
                        <div style={{ fontSize: 12, color: TEXT_MUTED }}>{event.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Linked Experiments — only shown if present for Rollout type */}
                {linkedExperiments.length > 0 && (
                  <div style={{ ...cardStyle, padding: 22 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>Linked Experiments</h3>
                      <span style={{ background: "#EFF6FF", color: "#3B82F6", borderRadius: 999, fontSize: 11, fontWeight: 700, padding: "2px 9px" }}>{linkedExperiments.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {linkedExperiments.map((experiment) => (
                        <button key={experiment.id} onClick={() => onOpenExperiment(experiment)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT, cursor: "pointer", textAlign: "left" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#F0F4FF"; e.currentTarget.style.borderColor = "#BFDBFE"; }} onMouseLeave={(e) => { e.currentTarget.style.background = SOFT; e.currentTarget.style.borderColor = BORDER; }}>
                          <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{experiment.name}</span>
                            <span style={{ fontSize: 12, color: TEXT_MUTED }}>{experiment.hypothesis}</span>
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            <StatusBadge status={experiment.status} />
                            <span style={{ color: TEXT_MUTED }}><ChevronRightIcon /></span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Right sidebar — Version History always visible */}
          {versionHistorySidebar}
        </div>
      )}

      {/* ── Sticky footer ── */}
      <div style={{ position: "sticky", bottom: 0, marginTop: 24, padding: "14px 0", background: WHITE, borderTop: "2px solid #E5E7EB", boxShadow: "0 -4px 16px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, zIndex: 40 }}>
        <button onClick={onBack} style={ghostButtonStyle}>Back</button>
        <button onClick={() => onEdit(config)} style={{ ...ghostButtonStyle, display: "inline-flex", alignItems: "center", gap: 7 }}>
          <EditIcon />
          Edit
        </button>
        <div style={{ position: "relative" }}>
          <button
            style={{ ...primaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 7 }}
            onClick={() => console.log(isAB ? "Restart Experiment" : "Update Rollout", config.key)}
            onMouseEnter={() => setRestartTooltipVisible(true)}
            onMouseLeave={() => setRestartTooltipVisible(false)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 8a6 6 0 0 1 10.5-4H10.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 8a6 6 0 0 1-10.5 4H5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12.5 4V7H9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3.5 9v3h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {isAB ? "Restart Experiment" : "Update Rollout"}
          </button>
          {restartTooltipVisible && (
            <div style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, width: 230, background: "#1F2937", color: WHITE, fontSize: 12, lineHeight: 1.5, padding: "8px 12px", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 300, pointerEvents: "none" }}>
              {isAB ? "Resets experiment data and restarts the traffic split." : "Adjust the rollout value, percentage, or target segment."}
              <div style={{ position: "absolute", bottom: -5, right: 14, width: 10, height: 10, background: "#1F2937", clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExperimentActionMenu({ experiment, isOpen, onToggle, actions, loadingAction }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", justifyContent: "center", width: "100%" }}>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onToggle(experiment.id);
        }}
        disabled={Boolean(loadingAction)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: `1px solid ${BORDER}`,
          background: WHITE,
          color: TEXT_MUTED,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: loadingAction ? 0.7 : 1,
        }}
      >
        <MoreIcon />
      </button>
      {isOpen && (
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            top: 34,
            right: 0,
            width: 166,
            padding: 8,
            borderRadius: 10,
            background: WHITE,
            border: `1px solid ${BORDER}`,
            boxShadow: SHADOW,
            zIndex: 30,
          }}
        >
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={action.onClick}
              disabled={Boolean(loadingAction)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                border: "none",
                borderRadius: 8,
                background: "transparent",
                color: action.destructive ? "#DC2626" : TEXT,
                cursor: "pointer",
                fontSize: 13,
                textAlign: "left",
                opacity: loadingAction && loadingAction !== action.key ? 0.6 : 1,
              }}
            >
              <span style={{ width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                {loadingAction === action.key ? <Spinner size={14} /> : action.icon}
              </span>
              {loadingAction === action.key ? `${action.label}...` : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ExperimentList({
  experiments,
  configs,
  openActionId,
  setOpenActionId,
  onCreateNew,
  onOpenReport,
  onOpenEditor,
  onOpenRemoteConfig,
  onPause,
  onResume,
  onArchive,
  onClone,
  onLaunch,
  onDeleteDraft,
  actionLoading,
}) {
  const [filter, setFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("users");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [upliftTooltipOpen, setUpliftTooltipOpen] = useState(false);

  const configMap = useMemo(() => new Map(configs.map((config) => [config.key, config])), [configs]);
  const hasArchived = experiments.some((experiment) => experiment.archived);
  const filters = ["ALL", "RUNNING", "COMPLETED", "DRAFT", "PAUSED", ...(hasArchived ? ["ARCHIVED"] : [])];

  const counts = useMemo(() => ({
    ALL: experiments.filter((experiment) => !experiment.archived).length,
    RUNNING: experiments.filter((experiment) => !experiment.archived && experiment.status === "RUNNING").length,
    COMPLETED: experiments.filter((experiment) => !experiment.archived && experiment.status === "COMPLETED").length,
    DRAFT: experiments.filter((experiment) => !experiment.archived && experiment.status === "DRAFT").length,
    PAUSED: experiments.filter((experiment) => !experiment.archived && experiment.status === "PAUSED").length,
    ARCHIVED: experiments.filter((experiment) => experiment.archived).length,
  }), [experiments]);

  const visibleExperiments = useMemo(() => {
    const filtered = experiments.filter((experiment) => {
      if (filter === "ARCHIVED") return experiment.archived;
      if (filter === "ALL") return !experiment.archived;
      return !experiment.archived && experiment.status === filter;
    });

    const sorted = [...filtered].sort((left, right) => {
      const resolveValue = (experiment) => {
        if (sortBy === "config") return experiment.linkedConfigKey || "";
        if (sortBy === "metric") return experiment.metric || "";
        if (sortBy === "lift") return experiment.lift === "—" ? -999 : Number(String(experiment.lift).replace("%", ""));
        return experiment[sortBy];
      };

      const leftValue = resolveValue(left);
      const rightValue = resolveValue(right);

      if (typeof leftValue === "string") {
        const compared = leftValue.localeCompare(String(rightValue));
        return sortDir === "asc" ? compared : -compared;
      }
      return sortDir === "asc" ? leftValue - rightValue : rightValue - leftValue;
    });

    return sorted;
  }, [experiments, filter, sortBy, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [filter, pageSize, sortBy, sortDir]);

  const total = visibleExperiments.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedExperiments = visibleExperiments.slice((page - 1) * pageSize, page * pageSize);
  const activeExperiments = experiments.filter((experiment) => !experiment.archived && (experiment.status === "RUNNING" || experiment.status === "PAUSED"));
  const winningVariants = experiments.filter((experiment) => !experiment.archived && typeof experiment.confidence === "number" && experiment.confidence >= 95 && String(experiment.lift).startsWith("+")).length;
  const stats = [
    { label: "Active Experiments", value: activeExperiments.length, sub: "running or paused", color: CTA_GREEN_DARK },
    { label: "Total Users in Tests", value: activeExperiments.reduce((sum, experiment) => sum + experiment.users, 0).toLocaleString(), sub: "across active experiments", color: PRIMARY },
    { label: "Winning Variants", value: winningVariants, sub: "statistically significant", color: PRIMARY },
  ];

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir(column === "users" ? "desc" : "asc");
  };

  const renderEmptyState = () => {
    if (filter === "ALL") {
      return (
        <EmptyState
          title="No experiments yet"
          description="Create your first experiment to start testing hypotheses and measuring lift."
          ctaLabel="Create your first experiment"
          onClick={onCreateNew}
        />
      );
    }

    const label = filter === "ARCHIVED" ? "archived" : filter.toLowerCase();
    return (
      <EmptyState
        title={`No ${label} experiments.`}
        description="No experiments match the current filter."
      />
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 5, height: 58, borderRadius: 999, background: "#3B82F6", marginTop: 2, flexShrink: 0 }} />
          <div>
            <h1 style={pageTitleStyle}>A/B Testing</h1>
            <p style={pageDescriptionStyle}>Create experiments, test hypotheses, and measure impact on your key metrics.</p>
          </div>
        </div>
        <button onClick={onCreateNew} style={primaryButtonStyle}>
          <PlusIcon />
          New Experiment
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {stats.map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>{item.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: TEXT }}>{item.value}</div>
            <div style={{ fontSize: 11, color: item.color, fontWeight: 600, marginTop: 2 }}>{item.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {filters.map((filterName) => (
          <button
            key={filterName}
            onClick={() => setFilter(filterName)}
            style={{
              padding: "7px 12px",
              borderRadius: 999,
              border: `1px solid ${filter === filterName ? "#3B82F6" : "rgba(0,0,0,0.1)"}`,
              background: filter === filterName ? "#3B82F6" : WHITE,
              color: filter === filterName ? WHITE : TEXT_MUTED,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>{filterName === "ALL" ? "All" : filterName.charAt(0) + filterName.slice(1).toLowerCase()}</span>
            <span style={{ padding: "1px 7px", borderRadius: 999, background: filter === filterName ? WHITE : SOFT, color: filter === filterName ? TEXT : TEXT_MUTED }}>
              {counts[filterName]}
            </span>
          </button>
        ))}
      </div>

      {total === 0 ? renderEmptyState() : (
        <>
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: WHITE }}>
                  {[
                    { key: "status", label: "Status" },
                    { key: "name", label: "Experiment" },
                    { key: "config", label: "Linked Config" },
                    { key: "metric", label: "Goal Metric" },
                    { key: "lift", label: "Uplift" },
                    { key: "users", label: "Users" },
                    { key: "actions", label: "Actions", sortable: false },
                  ].map((column) => (
                    <th key={column.key} style={{ padding: "14px 16px", textAlign: column.key === "actions" ? "center" : "left", fontSize: 12, fontWeight: 600, color: TEXT_MUTED, borderBottom: `1px solid ${BORDER}` }}>
                      {column.sortable === false ? column.label : (
                        <button onClick={() => handleSort(column.key)} style={{ border: "none", background: "transparent", padding: 0, margin: 0, color: "inherit", fontSize: "inherit", fontWeight: "inherit", cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                          {column.label}
                          {column.key === "lift" && (
                            <span
                              onMouseEnter={() => setUpliftTooltipOpen(true)}
                              onMouseLeave={() => setUpliftTooltipOpen(false)}
                              style={{ position: "relative", display: "inline-flex", alignItems: "center", color: "#94A3B8", marginLeft: 6 }}
                            >
                              <InfoIcon />
                              {upliftTooltipOpen && (
                                <span style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", width: 220, padding: "10px 12px", borderRadius: 10, background: "#111827", color: WHITE, fontSize: 12, fontWeight: 500, lineHeight: 1.5, boxShadow: SHADOW, zIndex: 20 }}>
                                  Uplift shows the relative change in the goal metric compared with the control variant.
                                </span>
                              )}
                            </span>
                          )}
                          <SortIndicator active={sortBy === column.key} direction={sortDir} />
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedExperiments.map((experiment) => {
                  const linkedConfig = configMap.get(experiment.linkedConfigKey);
                  const liftColor = experiment.lift === "—" ? TEXT_MUTED : String(experiment.lift).startsWith("-") ? "#DC2626" : "#16A34A";

                  const actionsByStatus = {
                    RUNNING: [
                      { key: "pause", label: "Pause", icon: <PauseIcon />, onClick: () => onPause(experiment) },
                      { key: "view", label: "View Report", icon: <ReportIcon />, onClick: () => onOpenReport(experiment) },
                      { key: "edit", label: "Edit", icon: <EditIcon />, onClick: () => onOpenEditor(experiment) },
                    ],
                    PAUSED: [
                      { key: "resume", label: "Resume", icon: <PlayIcon />, onClick: () => onResume(experiment) },
                      { key: "view", label: "View Report", icon: <ReportIcon />, onClick: () => onOpenReport(experiment) },
                      { key: "edit", label: "Edit", icon: <EditIcon />, onClick: () => onOpenEditor(experiment) },
                      { key: "archive", label: "Archive", icon: <ArchiveIcon />, onClick: () => onArchive(experiment) },
                    ],
                    COMPLETED: [
                      { key: "view", label: "View Report", icon: <ReportIcon />, onClick: () => onOpenReport(experiment) },
                      { key: "clone", label: "Clone", icon: <CopyIcon />, onClick: () => onClone(experiment) },
                      { key: "archive", label: "Archive", icon: <ArchiveIcon />, onClick: () => onArchive(experiment) },
                    ],
                    DRAFT: [
                      { key: "edit", label: "Edit", icon: <EditIcon />, onClick: () => onOpenEditor(experiment) },
                      { key: "launch", label: "Launch", icon: <PlayIcon />, onClick: () => onLaunch(experiment) },
                      { key: "delete", label: "Delete", icon: <TrashIcon />, onClick: () => onDeleteDraft(experiment), destructive: true },
                    ],
                  };

                  return (
                    <tr
                      key={experiment.id}
                      onClick={() => onOpenReport(experiment)}
                      style={{ cursor: "pointer", borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={(event) => { event.currentTarget.style.background = "#F9FAFB"; }}
                      onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "14px 16px" }}><StatusBadge status={experiment.status} /></td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: TEXT }}>{experiment.name}</div>
                        <div style={{ marginTop: 3, color: TEXT_MUTED, fontSize: 11 }}>{experiment.hypothesis}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {linkedConfig ? (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenRemoteConfig(linkedConfig.key);
                            }}
                            style={{ border: "none", background: "transparent", padding: 0, color: TEXT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, cursor: "pointer" }}
                          >
                            {linkedConfig.key}
                          </button>
                        ) : (
                          <span style={{ color: "#DC2626", fontSize: 12 }}>Config removed</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", color: experiment.metric ? TEXT_MUTED : "#D97706", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                        {experiment.metric || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", color: liftColor, fontWeight: 700 }}>{experiment.lift}</td>
                      <td style={{ padding: "14px 16px", color: TEXT }}>{Number(experiment.users || 0).toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }} onClick={(event) => event.stopPropagation()}>
                        <ExperimentActionMenu
                          experiment={experiment}
                          isOpen={openActionId === experiment.id}
                          onToggle={(id) => setOpenActionId(openActionId === id ? null : id)}
                          actions={actionsByStatus[experiment.status] || []}
                          loadingAction={actionLoading?.scope === "experiment" && actionLoading?.id === experiment.id ? actionLoading.type : null}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 14, color: TEXT_MUTED, fontSize: 13 }}>
            <div>
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} experiments
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {total > 20 && (
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span>Rows per page</span>
                  <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} style={{ ...inputStyle, width: 88, padding: "8px 10px" }}>
                    {[20, 50, 100].map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
              )}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} style={{ ...secondaryButtonStyle, padding: "8px 10px", opacity: page === 1 ? 0.5 : 1 }}>Previous</button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => setPage(pageNumber)}
                      style={{
                        ...secondaryButtonStyle,
                        padding: "8px 12px",
                        background: pageNumber === page ? PRIMARY : WHITE,
                        color: pageNumber === page ? WHITE : TEXT,
                        borderColor: pageNumber === page ? PRIMARY : "rgba(0,0,0,0.1)",
                      }}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} style={{ ...secondaryButtonStyle, padding: "8px 10px", opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SearchableSelect({
  label,
  required = false,
  placeholder,
  options,
  selectedValue,
  onSelect,
  error,
  emptyMessage,
  renderEmpty,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((option) => option.value === selectedValue) || null;
  const filteredOptions = options.filter((option) => (
    option.label.toLowerCase().includes(search.toLowerCase())
    || (option.subLabel || "").toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <div style={{ position: "relative" }}>
      <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>{label}{required ? " *" : ""}</label>
      <button
        onClick={() => setOpen((current) => !current)}
        type="button"
        style={{
          ...inputStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          textAlign: "left",
          borderColor: error ? "#EF4444" : BORDER_DARK,
          boxShadow: error ? "0 0 0 3px rgba(239, 68, 68, 0.12)" : "none",
        }}
      >
        <span>
          {selectedOption ? (
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: TEXT, fontWeight: 600 }}>{selectedOption.label}</span>
              {selectedOption.subLabel && <span style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{selectedOption.subLabel}</span>}
            </span>
          ) : (
            <span style={{ color: TEXT_MUTED }}>{placeholder}</span>
          )}
        </span>
        <span style={{ color: TEXT_MUTED }}><ChevronDownIcon /></span>
      </button>
      {error && <div style={{ marginTop: 6, fontSize: 12, color: "#EF4444" }}>{error}</div>}

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 40, background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`, boxShadow: SHADOW, overflow: "hidden" }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${BORDER}`, position: "relative" }}>
            <span style={{ position: "absolute", left: 24, top: 22, color: TEXT_MUTED }}><SearchIcon /></span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", padding: 8 }}>
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value);
                  setOpen(false);
                  setSearch("");
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  borderRadius: 10,
                  background: selectedValue === option.value ? "#ececf0" : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ color: TEXT, fontWeight: 600 }}>{option.label}</span>
                {option.subLabel && <span style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{option.subLabel}</span>}
              </button>
            )) : (
              <div style={{ padding: 12 }}>
                {renderEmpty ? renderEmpty() : <div style={{ fontSize: 13, color: TEXT_MUTED }}>{emptyMessage}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateExperiment({
  configs,
  experiments,
  onBack,
  onOpenRemoteConfigCreate,
  onSaveDraft,
  onLaunchExperiment,
}) {
  const eligibleConfigs = useMemo(
    () => configs.filter((config) => config.status === "Live" || config.status === "Draft"),
    [configs],
  );

  const [form, setForm] = useState({
    id: null,
    name: "",
    linkedConfigKey: "",
    hypothesis: "",
    primaryMetric: "",
    variants: [],
  });
  const [errors, setErrors] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [launchLoading, setLaunchLoading] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [draftConfigWarningOpen, setDraftConfigWarningOpen] = useState(false);
  const [runningConflict, setRunningConflict] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify({
    id: null,
    name: "",
    linkedConfigKey: "",
    hypothesis: "",
    primaryMetric: "",
    variants: [],
  }));
  const currentSnapshot = JSON.stringify(form);
  const isDirty = currentSnapshot !== savedSnapshot;

  const selectedConfig = eligibleConfigs.find((config) => config.key === form.linkedConfigKey) || null;
  const selectedMetric = mockEvents.find((event) => event.id === form.primaryMetric) || null;
  const hypothesisCount = form.hypothesis.length;
  const trafficTotal = form.variants.reduce((sum, variant) => sum + Number(variant.traffic || 0), 0);

  useEffect(() => {
    if (!selectedConfig) return;
    setForm((current) => {
      if (current.variants.length > 0) return current;
      return { ...current, variants: buildDefaultVariants(selectedConfig) };
    });
  }, [selectedConfig]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, traffic: undefined }));
  };

  const updateVariant = (variantId, updater) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant) => (variant.id === variantId ? updater(variant) : variant)),
    }));
    setErrors((current) => ({ ...current, traffic: undefined }));
  };

  const updateVariantParameter = (variantId, parameterId, updater) => {
    updateVariant(variantId, (variant) => ({
      ...variant,
      parameters: variant.parameters.map((parameter) => (parameter.id === parameterId ? updater(parameter) : parameter)),
    }));
  };

  const syncVariantsForConfig = (configKey) => {
    const config = eligibleConfigs.find((item) => item.key === configKey) || null;
    setForm((current) => ({
      ...current,
      linkedConfigKey: configKey,
      variants: config ? buildDefaultVariants(config) : [],
    }));
    setErrors((current) => ({
      ...current,
      linkedConfigKey: undefined,
      traffic: undefined,
    }));
  };

  const addVariant = () => {
    setForm((current) => {
      const nextVariants = [
        ...current.variants,
        {
          id: createVariantId(),
          name: getVariantLabel(current.variants.length),
          traffic: 0,
          locked: false,
          removable: true,
          parameters: cloneExperimentParameters(selectedConfig?.parameters || []),
        },
      ];
      return { ...current, variants: rebalanceVariantTraffic(nextVariants) };
    });
  };

  const removeVariant = (variantId) => {
    setForm((current) => ({
      ...current,
      variants: rebalanceVariantTraffic(current.variants.filter((variant) => variant.id !== variantId)),
    }));
    setErrors((current) => ({ ...current, traffic: undefined }));
  };

  const showBackConfirmation = () => {
    if (!isDirty) {
      onBack();
      return;
    }
    const shouldLeave = window.confirm("You have unsaved changes. Are you sure you want to leave?");
    if (shouldLeave) onBack();
  };

  const validate = (mode) => {
    const nextErrors = {};
    const trimmedName = form.name.trim();
    const duplicateName = experiments.find((experiment) => experiment.name.toLowerCase() === trimmedName.toLowerCase() && experiment.id !== form.id);
    const launchMode = mode === "launch";

    if (!trimmedName) {
      nextErrors.name = "Experiment name is required.";
    } else if (duplicateName) {
      nextErrors.name = "An experiment with this name already exists.";
    }

    if (launchMode && !form.linkedConfigKey) {
      nextErrors.linkedConfigKey = "You must link a remote configuration to run an experiment.";
    }

    if (launchMode && !form.hypothesis.trim()) {
      nextErrors.hypothesis = "A hypothesis is required to launch an experiment.";
    }

    if (launchMode && !form.primaryMetric) {
      nextErrors.primaryMetric = "A primary metric is required to launch an experiment.";
    }

    if (launchMode && form.variants.length < 2) {
      nextErrors.traffic = "At least two variants are required to launch an experiment.";
    } else if (launchMode && trafficTotal !== 100) {
      nextErrors.traffic = "Traffic allocation must sum to exactly 100%.";
    } else if (launchMode && Number(form.variants[0]?.traffic || 0) === 0) {
      nextErrors.traffic = "Control cannot be set to 0%.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!validate("draft")) return;
    setSaveLoading(true);
    const saved = await onSaveDraft({
      ...form,
      name: form.name.trim(),
      hypothesis: form.hypothesis.trim(),
    });
    setSaveLoading(false);
    if (saved) {
      const nextForm = {
        ...form,
        id: saved.id,
      };
      setForm(nextForm);
      setSavedSnapshot(JSON.stringify(nextForm));
    }
  };

  const handleLaunchClick = () => {
    if (!validate("launch")) return;

    const conflictingExperiment = experiments.find((experiment) => (
      experiment.status === "RUNNING"
      && experiment.linkedConfigKey === form.linkedConfigKey
      && experiment.id !== form.id
    ));
    if (conflictingExperiment) {
      setRunningConflict(conflictingExperiment);
      return;
    }

    if (selectedConfig?.status === "Draft") {
      setDraftConfigWarningOpen(true);
      return;
    }

    setConfirmModalOpen(true);
  };

  const submitLaunch = async (publishConfig = false) => {
    setLaunchLoading(true);
    await onLaunchExperiment({
      ...form,
      name: form.name.trim(),
      hypothesis: form.hypothesis.trim(),
    }, { publishConfig });
    setLaunchLoading(false);
    setConfirmModalOpen(false);
    setDraftConfigWarningOpen(false);
  };

  return (
    <div>
      <ConfirmModal
        open={confirmModalOpen}
        title="Confirm and Launch"
        message={`Name: ${form.name}\nLinked Config: ${form.linkedConfigKey}\nGoal Metric: ${form.primaryMetric}\nVariants: ${form.variants.length}\nTraffic Total: ${trafficTotal}%`}
        confirmLabel="Confirm and Launch"
        confirmTone="primary"
        loading={launchLoading}
        onCancel={() => setConfirmModalOpen(false)}
        onConfirm={() => submitLaunch(false)}
      />

      <ConfirmModal
        open={draftConfigWarningOpen}
        title="Linked configuration is not live yet"
        message={`The linked configuration '${selectedConfig?.name || ""}' is not live yet. Launching this experiment will also publish the configuration.`}
        confirmLabel="Publish Config and Launch"
        confirmTone="primary"
        loading={launchLoading}
        onCancel={() => setDraftConfigWarningOpen(false)}
        onConfirm={() => submitLaunch(true)}
      />

      <ConfirmModal
        open={Boolean(runningConflict)}
        title="This configuration is already being tested"
        message={`This configuration is already being tested in '${runningConflict?.name || ""}'. A configuration can only run in one experiment at a time.`}
        confirmLabel="OK"
        confirmTone="primary"
        onCancel={() => setRunningConflict(null)}
        onConfirm={() => setRunningConflict(null)}
      />

      <div style={{ marginBottom: 24 }}>
        <h1 style={pageTitleStyle}>New Experiment</h1>
        <p style={pageDescriptionStyle}>Define your hypothesis, pick a remote config and launch an experiment.</p>
      </div>

      <div style={{ ...cardStyle, padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>EXPERIMENT NAME *</label>
            <input
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="e.g. Homepage hero message test"
              style={{ ...inputStyle, borderColor: errors.name ? "#EF4444" : BORDER_DARK, boxShadow: errors.name ? "0 0 0 3px rgba(239, 68, 68, 0.12)" : "none" }}
            />
            {errors.name && <div style={{ marginTop: 6, fontSize: 12, color: "#EF4444" }}>{errors.name}</div>}
          </div>

          <SearchableSelect
            label="LINKED REMOTE CONFIG"
            required={false}
            placeholder="Select a remote configuration"
            options={eligibleConfigs.map((config) => ({ value: config.key, label: config.name, subLabel: config.key }))}
            selectedValue={form.linkedConfigKey}
            onSelect={syncVariantsForConfig}
            error={errors.linkedConfigKey}
            emptyMessage="No configurations available."
            renderEmpty={() => (
              <div>
                <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 10 }}>No configurations available. Create a remote configuration first.</div>
                <button type="button" onClick={onOpenRemoteConfigCreate} style={{ ...secondaryButtonStyle, padding: "8px 12px" }}>Create Remote Configuration</button>
              </div>
            )}
          />

          {eligibleConfigs.length === 0 && (
            <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #FCD34D", background: "#FFFBEB", color: "#92400E", fontSize: 13 }}>
              No configurations available. Create a remote configuration first.
            </div>
          )}

          {selectedConfig && (
            <div style={{ padding: 16, borderRadius: 12, border: `1px solid ${BORDER}`, background: SOFT }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{selectedConfig.name}</div>
                  <div style={{ marginTop: 3, fontSize: 12, color: TEXT_MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{selectedConfig.key}</div>
                </div>
                <ConfigStatusBadge status={selectedConfig.status} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                {selectedConfig.parameters.map((parameter) => (
                  <div key={parameter.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, background: WHITE }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{parameter.key}</div>
                    <div style={{ marginTop: 2, fontSize: 11, color: TEXT_MUTED }}>{parameter.type}</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: TEXT_MUTED, fontFamily: parameter.type === "JSON" ? "ui-monospace, SFMono-Regular, Menlo, monospace" : "inherit", whiteSpace: "pre-wrap" }}>
                      {stringifyParameterValue(parameter)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>HYPOTHESIS</label>
            <textarea
              value={form.hypothesis}
              maxLength={280}
              onChange={(event) => setField("hypothesis", event.target.value)}
              rows={4}
              placeholder="e.g. Changing the CTA button color to green will increase purchase conversion by 10%"
              style={{ ...inputStyle, resize: "vertical", borderColor: errors.hypothesis ? "#EF4444" : BORDER_DARK, boxShadow: errors.hypothesis ? "0 0 0 3px rgba(239, 68, 68, 0.12)" : "none" }}
            />
            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {errors.hypothesis ? <div style={{ fontSize: 12, color: "#EF4444" }}>{errors.hypothesis}</div> : <span />}
              <div style={{ fontSize: 12, color: hypothesisCount >= 280 ? "#EF4444" : TEXT_MUTED }}>{hypothesisCount}/280</div>
            </div>
          </div>

          <SearchableSelect
            label="PRIMARY METRIC"
            required={true}
            placeholder="Select a tracked event"
            options={mockEvents.map((event) => ({ value: event.id, label: event.name }))}
            selectedValue={form.primaryMetric}
            onSelect={(value) => setField("primaryMetric", value)}
            error={errors.primaryMetric}
            emptyMessage="No events available."
          />

          {selectedMetric && (
            <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "#ececf0", color: PRIMARY, fontSize: 13 }}>
              Baseline reference: {selectedMetric.baseline}
            </div>
          )}

          {selectedConfig && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: TEXT }}>Variants</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: TEXT_MUTED }}>Control uses the current config values. Edit only the non-control variants.</p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  disabled={form.variants.length >= 4}
                  style={{ ...secondaryButtonStyle, opacity: form.variants.length >= 4 ? 0.5 : 1 }}
                >
                  + Add Variant
                </button>
              </div>

              <div style={{ marginBottom: 14, padding: "12px 14px", borderRadius: 10, border: `1px solid ${trafficTotal === 100 ? "#86EFAC" : "#FCA5A5"}`, background: trafficTotal === 100 ? "#F0FDF4" : "#FEF2F2", color: trafficTotal === 100 ? "#166534" : "#B91C1C", fontSize: 13, fontWeight: 600 }}>
                Traffic allocation total: {trafficTotal}% {trafficTotal === 100 ? "(Ready to launch)" : "(Must equal 100%)"}
              </div>
              {errors.traffic && <div style={{ marginBottom: 12, fontSize: 12, color: "#EF4444" }}>{errors.traffic}</div>}

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {form.variants.map((variant, variantIndex) => (
                  <div key={variant.id} style={{ ...cardStyle, padding: 18, background: variant.locked ? "#FAFBFF" : WHITE }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 120px", gap: 12, flex: 1 }}>
                        <input
                          value={variant.name}
                          onChange={(event) => updateVariant(variant.id, (current) => ({ ...current, name: event.target.value }))}
                          disabled={variant.locked}
                          style={{ ...inputStyle, background: variant.locked ? "#F3F4F6" : WHITE }}
                        />
                        <div style={{ position: "relative" }}>
                          <input
                            type="number"
                            min={variantIndex === 0 ? "1" : "0"}
                            max="100"
                            value={variant.traffic}
                            onChange={(event) => updateVariant(variant.id, (current) => ({ ...current, traffic: Number(event.target.value) }))}
                            style={inputStyle}
                          />
                          <span style={{ position: "absolute", right: 12, top: 12, color: TEXT_MUTED, fontSize: 12 }}>%</span>
                        </div>
                      </div>
                      {variant.removable ? (
                        <button type="button" onClick={() => removeVariant(variant.id)} style={{ ...secondaryButtonStyle, color: "#DC2626" }}>
                          <TrashIcon />
                        </button>
                      ) : (
                        <span style={{ padding: "6px 10px", borderRadius: 999, background: variant.locked ? "#ececf0" : "#ececf0", color: variant.locked ? TEXT_MUTED : PRIMARY, fontSize: 12, fontWeight: 700 }}>
                          {variant.locked ? "Read-only" : "Required"}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                      {variant.parameters.map((parameter) => (
                        <div key={parameter.id} style={{ padding: 14, borderRadius: 12, border: `1px solid ${BORDER}`, background: SOFT }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_MUTED, marginBottom: 8 }}>{parameter.key}</div>
                          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>{parameter.type}</div>
                          {parameter.type === "Boolean" ? (
                            <select
                              value={String(parameter.value === true || parameter.value === "true")}
                              disabled={variant.locked}
                              onChange={(event) => updateVariantParameter(variant.id, parameter.id, (current) => ({ ...current, value: event.target.value === "true" }))}
                              style={{ ...inputStyle, background: variant.locked ? "#F3F4F6" : WHITE }}
                            >
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          ) : parameter.type === "JSON" ? (
                            <textarea
                              rows={4}
                              value={String(parameter.value)}
                              disabled={variant.locked}
                              onChange={(event) => updateVariantParameter(variant.id, parameter.id, (current) => ({ ...current, value: event.target.value }))}
                              style={{ ...inputStyle, resize: "vertical", background: variant.locked ? "#F3F4F6" : WHITE, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            />
                          ) : (
                            <input
                              type={parameter.type === "Integer" || parameter.type === "Number" ? "number" : "text"}
                              value={parameter.value}
                              disabled={variant.locked}
                              onChange={(event) => updateVariantParameter(variant.id, parameter.id, (current) => ({ ...current, value: event.target.value }))}
                              style={{ ...inputStyle, background: variant.locked ? "#F3F4F6" : WHITE }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Sticky footer */}
      <div style={{ position: "sticky", bottom: 0, marginTop: 24, padding: "14px 0", background: PAGE_BG, borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 40 }}>
        <button onClick={showBackConfirmation} style={{ ...secondaryButtonStyle }}>← Back to experiments</button>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={handleSaveDraft} disabled={saveLoading} style={{ ...secondaryButtonStyle, minWidth: 118, justifyContent: "center" }}>
            {saveLoading ? <Spinner /> : "Save Draft"}
          </button>
          <button type="button" onClick={handleLaunchClick} disabled={launchLoading} style={{ ...primaryButtonStyle, minWidth: 160, justifyContent: "center" }}>
            {launchLoading ? <Spinner color="#FFFFFF" /> : "Launch Experiment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Code pill helper ────────────────────────────────────────────────────────
function CodePill({ children }) {
  return (
    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, color: "#6B7280", background: "#F3F4F6", borderRadius: 4, padding: "2px 6px", display: "inline-block" }}>
      {children}
    </span>
  );
}

// ─── Stop Experiment Confirmation Modal ──────────────────────────────────────
function StopExperimentModal({ open, experimentName, onCancel, onConfirm }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="stop-exp-title" style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ width: 460, background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v5M8 11v1" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <h3 id="stop-exp-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: TEXT }}>Stop experiment?</h3>
        </div>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#4B5563", lineHeight: 1.65 }}>
          You are about to permanently stop <b>"{experimentName}"</b>. This will halt all data collection and cannot be undone. The experiment will be marked as stopped.
        </p>
        <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", fontSize: 13, marginBottom: 22 }}>
          ⛔ This action is irreversible. Stopped experiments cannot be restarted.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={secondaryButtonStyle}>Cancel</button>
          <button onClick={onConfirm} style={{ ...primaryButtonStyle, background: "#DC2626", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="1.5"/></svg>
            Stop Experiment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Apply Winner Modal ───────────────────────────────────────────────────────
function ApplyWinnerModal({ open, experiment, onCancel, onConfirm }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  const configKey = experiment.linkedConfigMeta?.key || experiment.linkedConfigKey || "—";
  const winnerValue = experiment.linkedConfigMeta?.variantBValue;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="apply-winner-title" style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ width: 480, background: WHITE, borderRadius: 14, border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,0.15)", padding: 28 }}>
        <h3 id="apply-winner-title" style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: TEXT }}>Apply Variant B as the winner?</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "#4B5563", lineHeight: 1.65 }}>
          This will update the Remote Config key <CodePill>{configKey}</CodePill> to the winning variant's value (<CodePill>{String(winnerValue)}</CodePill>) for 100% of users. This action can be reversed from the Remote Config settings.
        </p>
        <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #FCD34D", background: "#FEF3C7", color: "#92400E", fontSize: 13, marginBottom: 20 }}>
          ⚠ This will override your current Remote Config live value.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={secondaryButtonStyle}>Cancel</button>
          <button
            onClick={onConfirm}
            style={{ ...primaryButtonStyle, gap: 8 }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7.5L5.5 11L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Apply &amp; Roll Out
          </button>
        </div>
      </div>
    </div>
  );
}

function ExperimentDetail({ experiment, onBack, onOpenRemoteConfig, linkedConfig }) {
  const [tab, setTab] = useState("results");
  const [applyWinnerOpen, setApplyWinnerOpen] = useState(false);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [barTooltip, setBarTooltip] = useState(null);
  const [metricKeyVisible, setMetricKeyVisible] = useState(false);
  const [upliftTooltipVisible, setUpliftTooltipVisible] = useState(false);

  const isWinnerDeclared = experiment.status === "winner_declared";
  const isRunning = experiment.status === "RUNNING" || experiment.status === "running";

  // Variant data
  const expVariants = experiment.variants || [];
  const controlVariant = expVariants.find((v) => v.id === "control") || {
    id: "control", label: "Control", conversionRate: 0.032,
    users: Math.round((experiment.users || 0) / 2),
    conversions: Math.round((experiment.users || 0) / 2 * 0.032), isWinner: false,
  };
  const variantB = expVariants.find((v) => v.id === "variant_b") || null;
  const baselineRate = controlVariant.conversionRate * 100;
  const liftValue = experiment.lift === "—" ? 0 : Number(String(experiment.lift).replace("%", ""));
  const variantBRate = Number((variantB ? variantB.conversionRate * 100 : baselineRate * (1 + liftValue / 100)).toFixed(2));
  const variantBUsers = variantB ? variantB.users : Math.max(0, Math.round((experiment.users || 0) / 2));
  const variantBConversions = variantB ? variantB.conversions : Math.round(variantBUsers * variantBRate / 100);
  const deltaAbs = (variantBRate - baselineRate).toFixed(2);
  const deltaAbsDisplay = Number(deltaAbs).toFixed(1);

  // Auto-scale chart axis to amplify real difference
  const chartPad = Math.max(0.4, Math.abs(variantBRate - baselineRate) * 0.6);
  const chartMin = Math.max(0, Math.min(baselineRate, variantBRate) - chartPad);
  const chartMax = Math.max(baselineRate, variantBRate) + chartPad;
  const barPct = (rate) => Math.max(0, Math.min(100, ((rate - chartMin) / (chartMax - chartMin)) * 100));
  const axisStep = Number(((chartMax - chartMin) / 4).toFixed(1));
  const axisTicks = [0, 1, 2, 3, 4].map((i) => Number((chartMin + axisStep * i).toFixed(1)));

  // Goal metric
  const goalMetric = experiment.goalMetric || {
    key: experiment.metric || "—",
    label: experiment.metric ? experiment.metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—",
  };

  // Date helpers
  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const startLabel = fmtDate(experiment.startDate);
  const endLabel = fmtDate(experiment.endDate);
  const durationLabel = experiment.durationDays ? `${experiment.durationDays} days` : "—";

  // Dynamic status summary
  const statusSummary = isWinnerDeclared
    ? `Experiment ran for ${durationLabel} · Statistically significant result detected (${experiment.confidenceLevel || 95}% confidence)`
    : isRunning
    ? `Experiment running${experiment.durationDays ? ` for ${durationLabel}` : ""} · Collecting data`
    : `Experiment ${experiment.status?.toLowerCase() || "completed"} · ${durationLabel}`;

  const tabIds = ["results", "config", "settings"];
  const tabLabels = { results: "Results", config: "Config", settings: "Settings" };

  useEffect(() => {
    if (!exportMenuOpen) return;
    const close = () => setExportMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [exportMenuOpen]);

  return (
    <div>
      <ApplyWinnerModal open={applyWinnerOpen} experiment={experiment} onCancel={() => setApplyWinnerOpen(false)}
        onConfirm={() => { console.log(`Winner applied: ${experiment.linkedConfigMeta?.key} = ${experiment.linkedConfigMeta?.variantBValue}`); setApplyWinnerOpen(false); }}
      />
      <StopExperimentModal open={stopConfirmOpen} experimentName={experiment.name} onCancel={() => setStopConfirmOpen(false)}
        onConfirm={() => { console.log("Experiment stopped:", experiment.id); setStopConfirmOpen(false); }}
      />

      {/* ── Breadcrumb ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 14, fontSize: 12, color: "#6B7280" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", padding: 0, color: "#6B7280", cursor: "pointer", fontSize: 12 }}>Experiments</button>
        <span style={{ color: "#D1D5DB" }}>›</span>
        <span style={{ color: "#374151", fontWeight: 500 }}>{experiment.name}</span>
      </div>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={pageTitleStyle}>{experiment.name}</h1>
            <StatusBadge status={experiment.status} />
          </div>
          {/* Dynamic status summary (replaces static hypothesis) */}
          {isWinnerDeclared ? (
            <p style={{ margin: "5px 0 2px", fontSize: 13, color: "#16A34A", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7.5L5.5 11L12 4" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Hypothesis confirmed — Variant B outperformed Control by {liftValue}% ({experiment.confidenceLevel || 95}% confidence)
            </p>
          ) : null}
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280" }}>{statusSummary}</p>
          {/* Meta row */}
          <div style={{ marginTop: 5, fontSize: 12, color: "#6B7280", display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
            {startLabel !== "—" && <span>Started: {startLabel}</span>}
            {startLabel !== "—" && endLabel !== "—" && <span style={{ color: "#D1D5DB" }}>·</span>}
            {endLabel !== "—" && <span>Completed: {endLabel}</span>}
            {experiment.createdBy && <><span style={{ color: "#D1D5DB" }}>·</span><span>Created by: {experiment.createdBy}</span></>}
          </div>
        </div>

        {/* Action button cluster */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {/* Lifecycle controls — left group */}
          {isRunning && (
            <div style={{ display: "flex", gap: 6, paddingRight: 10, borderRight: "1px solid #E5E7EB" }}>
              <button style={{ ...secondaryButtonStyle, background: "#FFFBEB", borderColor: "#FDE68A", color: "#92400E", padding: "9px 14px" }}>
                Pause
              </button>
              <button
                onClick={() => setStopConfirmOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", border: "none", borderRadius: 8, background: "#DC2626", color: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="8" height="8" rx="1.5"/></svg>
                Stop
              </button>
            </div>
          )}
          {/* Apply Winner — primary CTA */}
          {isWinnerDeclared && (
            <button onClick={() => setApplyWinnerOpen(true)} style={{ ...primaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 7 }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7.5L5.5 11L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Apply Winner
            </button>
          )}
          {/* Utility controls — right group */}
          <div style={{ display: "flex", gap: 6, paddingLeft: isRunning || isWinnerDeclared ? 4 : 0 }}>
            {/* Export dropdown */}
            <div style={{ position: "relative" }}>
              <button onClick={(e) => { e.stopPropagation(); setExportMenuOpen((o) => !o); }}
                style={{ ...secondaryButtonStyle, gap: 7, padding: "9px 14px" }} aria-label="Export results">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Export
              </button>
              {exportMenuOpen && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: WHITE, border: "1px solid #E5E7EB", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, minWidth: 190, overflow: "hidden" }}>
                  {[{ label: "Export as PDF", icon: "📄" }, { label: "Download CSV", icon: "⬇" }, { label: "Copy shareable link", icon: "🔗" }].map((opt) => (
                    <button key={opt.label} onClick={() => { console.log(opt.label); setExportMenuOpen(false); }}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "10px 14px", border: "none", background: "none", fontSize: 13, color: TEXT, cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                    >{opt.icon} {opt.label}</button>
                  ))}
                </div>
              )}
            </div>
            {/* Copy link — labelled text button */}
            <button aria-label="Copy link to this experiment" onClick={() => { console.log("Copy link"); }}
              style={{ ...secondaryButtonStyle, gap: 7, padding: "9px 12px" }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="11" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4.4 7.8L9.7 10.4M9.7 3.6L4.4 6.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Copy link
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div role="tablist" aria-label="Experiment sections" style={{ display: "flex", gap: 8, marginBottom: 20, marginTop: 18 }}>
        {tabIds.map((item) => (
          <button key={item} role="tab" aria-selected={tab === item} aria-controls={`tabpanel-${item}`} id={`tab-${item}`}
            onClick={() => setTab(item)}
            onKeyDown={(e) => {
              const idx = tabIds.indexOf(item);
              if (e.key === "ArrowRight") { e.preventDefault(); setTab(tabIds[(idx + 1) % tabIds.length]); }
              if (e.key === "ArrowLeft") { e.preventDefault(); setTab(tabIds[(idx + tabIds.length - 1) % tabIds.length]); }
            }}
            style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${tab === item ? "#3B82F6" : "#E5E7EB"}`, background: tab === item ? "#3B82F6" : WHITE, color: tab === item ? WHITE : "#4B5563", cursor: "pointer", fontSize: 13, fontWeight: 600, outline: "none" }}
          >{tabLabels[item]}</button>
        ))}
      </div>

      {/* ══ RESULTS TAB ══ */}
      {tab === "results" && (
        <div id="tabpanel-results" role="tabpanel" aria-labelledby="tab-results">

          {/* Stat cards — 3 supporting + 1 hero uplift */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr) 1.45fr", gap: 12, marginBottom: 20 }}>
            {/* Users Exposed */}
            <div style={{ ...cardStyle, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: "#4B5563", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Users Exposed</div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, color: TEXT }}>{(experiment.totalUsers || experiment.users || 0).toLocaleString()}</div>
              <div style={{ marginTop: 2, fontSize: 11, color: "#4B5563" }}>Across all variants</div>
            </div>
            {/* Goal Metric — demoted, key hidden behind toggle */}
            <div style={{ ...cardStyle, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: "#4B5563", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>Goal Metric</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT }}>{goalMetric.label}</div>
              <button onClick={() => setMetricKeyVisible((v) => !v)}
                style={{ marginTop: 5, fontSize: 11, color: "#6B7280", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>
                {metricKeyVisible ? "Hide key" : "Show key"}
              </button>
              {metricKeyVisible && <div style={{ marginTop: 4 }}><CodePill>{goalMetric.key}</CodePill></div>}
            </div>
            {/* Control Rate */}
            <div style={{ ...cardStyle, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: "#4B5563", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Control Rate</div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, color: TEXT }}>{baselineRate.toFixed(1)}%</div>
              <div style={{ marginTop: 2, fontSize: 11, color: "#4B5563" }}>Baseline conversion rate</div>
            </div>
            {/* HERO: Uplift card */}
            <div style={{ ...cardStyle, padding: "18px 20px", background: "#F0FDF4", borderLeft: "4px solid #16A34A" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <div style={{ fontSize: 11, color: "#15803D", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Uplift</div>
                <span style={{ position: "relative", display: "inline-flex" }}
                  onMouseEnter={() => setUpliftTooltipVisible(true)}
                  onMouseLeave={() => setUpliftTooltipVisible(false)}>
                  <span style={{ fontSize: 12, color: "#86EFAC", cursor: "default" }}>ⓘ</span>
                  {upliftTooltipVisible && (
                    <span style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: WHITE, fontSize: 11, padding: "8px 12px", borderRadius: 8, width: 230, lineHeight: 1.6, zIndex: 60, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", pointerEvents: "none" }}>
                      <b>Uplift = (Variant Rate − Control Rate) / Control Rate</b><br/>
                      Relative improvement of the winning variant's conversion rate over the control group.
                    </span>
                  )}
                </span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#16A34A", lineHeight: 1.1, marginBottom: 4 }}>{experiment.lift}</div>
              <div style={{ fontSize: 12, color: "#15803D", fontWeight: 600 }}>vs control</div>
              <div style={{ marginTop: 5, fontSize: 11, color: "#166534" }}>
                {experiment.confidenceLevel || 95}% confidence · p &lt; {(experiment.pValue || 0.05).toFixed(3)}
              </div>
              {isWinnerDeclared && (
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => setApplyWinnerOpen(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, background: "#16A34A", color: WHITE, border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7.5L5.5 11L12 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Apply Winner
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Variant Performance chart */}
          <div style={{ ...cardStyle, padding: 24, marginBottom: 20 }}>
            <div style={{ marginBottom: 18 }}>
              <h3 style={{ margin: "0 0 4px", color: TEXT, fontSize: 15, fontWeight: 700 }}>Variant Performance</h3>
              <div style={{ fontSize: 12, color: "#6B7280" }}>Conversion rate by variant ({goalMetric.label}) · Auto-scaled axis</div>
            </div>
            <div role="img" aria-label={`Bar chart comparing conversion rates: Control ${baselineRate.toFixed(1)}%, Variant B ${variantBRate.toFixed(1)}%`}>
              {[
                { id: "control", name: "Control", rate: baselineRate, users: controlVariant.users, conversions: controlVariant.conversions, isWinner: false, striped: true },
                { id: "variant_b", name: "Variant B", rate: variantBRate, users: variantBUsers, conversions: variantBConversions, isWinner: isWinnerDeclared, striped: false },
              ].map((variant, index) => {
                const pct = barPct(variant.rate);
                const isHovered = barTooltip?.variantId === variant.id;
                const barColor = variant.id === "control" ? "#6B7280" : "#16A34A";
                // Diagonal stripes for Control (accessibility: shape+colour, not colour alone)
                const barBg = variant.striped
                  ? `repeating-linear-gradient(45deg, #6B7280 0px, #6B7280 4px, #9CA3AF 4px, #9CA3AF 8px)`
                  : barColor;
                return (
                  <div key={variant.id} style={{ padding: "13px 0", borderBottom: index === 0 ? `1px solid ${BORDER}` : "none", position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}
                      aria-label={`${variant.name}: ${variant.rate.toFixed(1)}% conversion, ${variant.users.toLocaleString()} users`}
                      onMouseEnter={(e) => setBarTooltip({ variantId: variant.id, x: e.clientX, y: e.clientY })}
                      onMouseMove={(e) => setBarTooltip({ variantId: variant.id, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setBarTooltip(null)}
                    >
                      {/* Colour + pattern swatch (accessibility) */}
                      <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 3, background: barBg, flexShrink: 0, border: "1px solid rgba(0,0,0,0.08)" }} />
                      <div style={{ width: 100, fontSize: 13, fontWeight: 600, color: TEXT, display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                        {variant.name}
                        {variant.isWinner && <span style={{ background: "#DCFCE7", color: "#15803D", borderRadius: 999, fontSize: 11, fontWeight: 600, padding: "2px 8px" }}>Winner</span>}
                      </div>
                      <div style={{ flex: 1, height: 14, borderRadius: 4, background: "#F3F4F6", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: barBg, transition: "width 0.5s ease" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120, justifyContent: "flex-end" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: variant.id === "control" ? "#4B5563" : "#15803D" }}>{variant.rate.toFixed(1)}%</span>
                        {variant.id === "variant_b" && (
                          <span style={{ background: "#DCFCE7", color: "#15803D", borderRadius: 999, fontSize: 11, fontWeight: 600, padding: "2px 7px" }} title={`+${deltaAbsDisplay} percentage points`}>
                            +{deltaAbsDisplay}pp
                          </span>
                        )}
                      </div>
                      <div style={{ minWidth: 90, fontSize: 12, color: "#4B5563", textAlign: "right", flexShrink: 0 }}>{variant.users.toLocaleString()} users</div>
                    </div>
                    {/* Hover tooltip */}
                    {isHovered && (
                      <div style={{ position: "fixed", left: barTooltip.x + 14, top: barTooltip.y - 12, background: "#1F2937", color: WHITE, borderRadius: 10, padding: "10px 14px", fontSize: 12, zIndex: 999, pointerEvents: "none", minWidth: 210, boxShadow: "0 6px 20px rgba(0,0,0,0.28)", lineHeight: 1.8 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{variant.name}</div>
                        <div>Conversion rate: <b>{variant.rate.toFixed(2)}%</b></div>
                        <div>Users: <b>{variant.users.toLocaleString()}</b></div>
                        <div>Conversions: <b>~{(variant.conversions || 0).toLocaleString()}</b></div>
                        {variant.id === "variant_b" && (
                          <div style={{ marginTop: 5, paddingTop: 5, borderTop: "1px solid rgba(255,255,255,0.1)", color: "#86EFAC" }}>
                            vs Control: +{deltaAbsDisplay} percentage points (+{liftValue}% relative)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Auto-scaled axis ticks */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingLeft: 128 }}>
                {axisTicks.map((t) => (
                  <div key={t} style={{ fontSize: 10, color: "#4B5563" }}>{t.toFixed(1)}%</div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: SOFT, fontSize: 12, color: "#4B5563", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span aria-hidden="true" style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "repeating-linear-gradient(45deg, #6B7280 0px, #6B7280 4px, #9CA3AF 4px, #9CA3AF 8px)", border: "1px solid rgba(0,0,0,0.08)" }} />
                <b>Control</b> uses a striped pattern ·
                <span aria-hidden="true" style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "#16A34A" }} />
                <b>Variant B</b> uses a solid fill — both are distinguishable without relying on colour alone.
              </div>
            </div>
          </div>

          {/* Configuration card (renamed from "Linked Config") */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "#4B5563", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 5 }}>Configuration</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                  {linkedConfig?.name || experiment.linkedConfigMeta?.name || experiment.linkedConfigKey || "Config removed"}
                </div>
                <div style={{ marginTop: 4 }}><CodePill>{experiment.linkedConfigKey || "—"}</CodePill></div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>This experiment uses the following remote config to serve variants to users.</div>
              </div>
              <button onClick={() => onOpenRemoteConfig(experiment.linkedConfigKey)} title="Opens Remote Config detail view"
                style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                View Config
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5.5 2.5H2A1.5 1.5 0 0 0 .5 4v8A1.5 1.5 0 0 0 2 13.5h8A1.5 1.5 0 0 0 11.5 12V8.5M8.5.5h5v5M13.5.5 6.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIG TAB ══ */}
      {tab === "config" && (
        <div id="tabpanel-config" role="tabpanel" aria-labelledby="tab-config" style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 16, color: TEXT, fontWeight: 700 }}>Tested Configuration</h3>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "#4B5563" }}>Shows the remote config key and the values assigned to each variant during the experiment run.</p>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: `1px solid ${BORDER}`, paddingBottom: 8, marginBottom: 4 }}>
            {["Parameter Key", "Type", "Control Value", "Variant B Value"].map((h) => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>
          {experiment.linkedConfigMeta ? (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "14px 0", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center" }}><CodePill>enabled</CodePill></div>
              <div style={{ fontSize: 13, color: TEXT, alignSelf: "center" }}>Boolean</div>
              <div style={{ fontSize: 13, color: TEXT, alignSelf: "center" }}>{String(experiment.linkedConfigMeta.controlValue)}</div>
              <div style={{ fontSize: 13, color: "#16A34A", fontWeight: 600, alignSelf: "center" }}>{String(experiment.linkedConfigMeta.variantBValue)}</div>
            </div>
          ) : linkedConfig ? (
            linkedConfig.parameters.map((parameter) => (
              <div key={parameter.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "14px 0", borderBottom: `1px solid ${BORDER}` }}>
                <div><CodePill>{parameter.key}</CodePill></div>
                <div style={{ fontSize: 13, color: TEXT, alignSelf: "center" }}>{parameter.type}</div>
                <div style={{ fontSize: 13, color: TEXT, alignSelf: "center" }}>{stringifyParameterValue(parameter)}</div>
                <div style={{ fontSize: 13, color: TEXT_MUTED, alignSelf: "center" }}>—</div>
              </div>
            ))
          ) : (
            <div style={{ padding: "14px 0", fontSize: 13, color: "#B91C1C" }}>The linked configuration has been removed.</div>
          )}
        </div>
      )}

      {/* ══ SETTINGS TAB ══ */}
      {tab === "settings" && (
        <div id="tabpanel-settings" role="tabpanel" aria-labelledby="tab-settings" style={{ ...cardStyle, padding: 24 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 16, color: TEXT, fontWeight: 700 }}>Experiment Settings</h3>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "#4B5563" }}>Campaign setup and tracking configuration.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 12, border: "1px solid #E5E7EB", background: WHITE }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Goal Metric</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>{goalMetric.label}</div>
              <CodePill>{goalMetric.key}</CodePill>
            </div>
            <div style={{ padding: 16, borderRadius: 12, border: "1px solid #E5E7EB", background: WHITE }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Linked Config Key</div>
              <CodePill>{experiment.linkedConfigKey || "—"}</CodePill>
            </div>
            {[
              { label: "Traffic Split", value: `${experiment.trafficSplit?.control ?? 50}% / ${experiment.trafficSplit?.variant_b ?? 50}%` },
              { label: "Targeting", value: experiment.targeting || "All Users" },
              { label: "Start Date", value: startLabel },
              { label: "End Date", value: endLabel },
              { label: "Duration", value: durationLabel },
              { label: "Randomization", value: experiment.randomizationUnit || "User ID" },
              { label: "Created By", value: experiment.createdBy || "—" },
              { label: "Last Modified By", value: experiment.lastModifiedBy ? `${experiment.lastModifiedBy} · ${fmtDate(experiment.lastModifiedAt)}` : "—" },
            ].map((item) => (
              <div key={item.label} style={{ padding: 16, borderRadius: 12, border: "1px solid #E5E7EB", background: WHITE }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky footer */}
      <div style={{ position: "sticky", bottom: 0, marginTop: 24, padding: "14px 0", background: WHITE, borderTop: "1px solid #E5E7EB", boxShadow: "0 -3px 12px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", zIndex: 40 }}>
        <button onClick={onBack} style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 7, background: WHITE, border: "1px solid #D1D5DB", color: "#374151" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 12L4 7L9 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to experiments
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeMenu, setActiveMenu] = useState("remote_config");
  const [remoteConfigView, setRemoteConfigView] = useState("list");
  const [abView, setAbView] = useState("list");
  const [abPlaceholderTitle, setAbPlaceholderTitle] = useState("");
  const [selectedExperimentReport, setSelectedExperimentReport] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);
  const [selectedConfigReport, setSelectedConfigReport] = useState(null);
  const [configs, setConfigs] = useState(initialConfigs);
  const [experiments, setExperiments] = useState(initialExperiments);
  const [openActionId, setOpenActionId] = useState(null);
  const [experienceHovered, setExperienceHovered] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [removeModal, setRemoveModal] = useState({ open: false, config: null });
  const [deleteExperimentModal, setDeleteExperimentModal] = useState({ open: false, experiment: null });

  useEffect(() => {
    const handleClick = () => setOpenActionId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const goToRemoteConfigList = () => {
    setActiveMenu("remote_config");
    setRemoteConfigView("list");
    setEditingConfig(null);
    setSelectedConfigReport(null);
  };

  const goToRemoteConfigCreate = () => {
    setActiveMenu("remote_config");
    setRemoteConfigView("create");
    setEditingConfig(null);
  };

  const goToRemoteConfigEdit = (config) => {
    setActiveMenu("remote_config");
    setRemoteConfigView("edit");
    setEditingConfig(config);
    setSelectedConfigReport(null);
    setOpenActionId(null);
  };

  const goToRemoteConfigDetail = (config) => {
    setActiveMenu("remote_config");
    setRemoteConfigView("detail");
    setSelectedConfigReport(config);
    setOpenActionId(null);
  };

  const pauseConflictingConfig = (configId) => {
    setConfigs((current) => current.map((item) => (
      item.id === configId ? { ...item, status: "Stopped", updated: formatToday() } : item
    )));
    setToast({ type: "warning", message: "Conflicting live configuration was stopped." });
  };

  const handleSaveConfig = (form, options = {}) => {
    const today = formatToday();
    let savedConfig;

    if (remoteConfigView === "edit" && editingConfig) {
      savedConfig = {
        ...editingConfig,
        ...form,
        updated: today,
        params: form.parameters?.length || 0,
      };
      setConfigs((current) => current.map((item) => (
        item.id === editingConfig.id
          ? savedConfig
          : item
      )));
      setEditingConfig(savedConfig);
    } else {
      const nextId = Math.max(...configs.map((item) => item.id), 0) + 1;
      savedConfig = {
        id: nextId,
        ...form,
        created: today,
        updated: today,
        version: form.version || 1.0,
        params: form.parameters?.length || 0,
      };
      setConfigs((current) => [
        savedConfig,
        ...current,
      ]);
      setEditingConfig(savedConfig);
    }

    if (options.showDetail) {
      goToRemoteConfigDetail(savedConfig);
    } else if (!options.keepEditing) {
      goToRemoteConfigList();
    }

    return savedConfig;
  };

  const handleCloneConfig = async (config) => {
    setLoadingAction({ scope: "config", id: config.id, type: "clone" });
    await sleep(600);
    const today = formatToday();
    const nextId = Math.max(...configs.map((item) => item.id), 0) + 1;
    setConfigs((current) => [
      {
        ...config,
        id: nextId,
        name: `${config.name} (Copy)`,
        key: `${config.key}_copy`,
        status: "Draft",
        created: today,
        updated: today,
      },
      ...current,
    ]);
    setOpenActionId(null);
    setLoadingAction(null);
    setToast({ type: "success", message: "Configuration cloned successfully." });
  };

  const handleRemoveConfig = (config) => {
    setRemoveModal({ open: true, config });
    setOpenActionId(null);
  };

  const confirmRemoveConfig = async () => {
    const { config } = removeModal;
    if (!config) return;
    setLoadingAction({ scope: "config", id: config.id, type: "remove" });
    await sleep(650);
    setConfigs((current) => current.filter((item) => item.id !== config.id));
    setLoadingAction(null);
    setRemoveModal({ open: false, config: null });
    setToast({ type: "success", message: "Configuration removed." });
  };

  const openRemoteConfigFromExperiment = (configKey) => {
    const config = configs.find((item) => item.key === configKey);
    if (config) {
      goToRemoteConfigDetail(config);
    } else {
      goToRemoteConfigList();
    }
  };

  const openExperimentPlaceholder = (title) => {
    setActiveMenu("ab_testing");
    setSelectedExperimentReport(null);
    setAbPlaceholderTitle(title);
    setAbView("placeholder");
    setOpenActionId(null);
  };

  const openExperimentReport = (experiment) => {
    setActiveMenu("ab_testing");
    setSelectedExperimentReport(experiment);
    setAbView("detail");
    setOpenActionId(null);
  };

  const updateExperiment = (experimentId, updater) => {
    setExperiments((current) => current.map((experiment) => (
      experiment.id === experimentId ? updater(experiment) : experiment
    )));
  };

  const handlePauseExperiment = async (experiment) => {
    setLoadingAction({ scope: "experiment", id: experiment.id, type: "pause" });
    await sleep(450);
    updateExperiment(experiment.id, (current) => ({ ...current, status: "PAUSED" }));
    setLoadingAction(null);
    setOpenActionId(null);
    setToast({ type: "success", message: "Experiment paused." });
  };

  const handleResumeExperiment = async (experiment) => {
    setLoadingAction({ scope: "experiment", id: experiment.id, type: "resume" });
    await sleep(450);
    updateExperiment(experiment.id, (current) => ({ ...current, status: "RUNNING" }));
    setLoadingAction(null);
    setOpenActionId(null);
    setToast({ type: "success", message: "Experiment resumed." });
  };

  const handleArchiveExperiment = async (experiment) => {
    setLoadingAction({ scope: "experiment", id: experiment.id, type: "archive" });
    await sleep(450);
    updateExperiment(experiment.id, (current) => ({ ...current, archived: true }));
    setLoadingAction(null);
    setOpenActionId(null);
    setToast({ type: "success", message: "Experiment archived." });
  };

  const handleCloneExperiment = async (experiment) => {
    setLoadingAction({ scope: "experiment", id: experiment.id, type: "clone" });
    await sleep(500);
    const nextId = Math.max(...experiments.map((item) => item.id), 0) + 1;
    setExperiments((current) => [
      {
        ...experiment,
        id: nextId,
        name: `${experiment.name} (Copy)`,
        status: "DRAFT",
        users: 0,
        confidence: null,
        lift: "—",
        archived: false,
      },
      ...current,
    ]);
    setLoadingAction(null);
    setOpenActionId(null);
    setToast({ type: "success", message: "Experiment cloned as draft." });
  };

  const handleLaunchExperiment = async (experiment) => {
    setLoadingAction({ scope: "experiment", id: experiment.id, type: "launch" });
    await sleep(500);
    updateExperiment(experiment.id, (current) => ({ ...current, status: "RUNNING", users: current.users || 1200 }));
    setLoadingAction(null);
    setOpenActionId(null);
    setToast({ type: "success", message: "Draft experiment launched." });
  };

  const handleDeleteExperimentDraft = (experiment) => {
    setDeleteExperimentModal({ open: true, experiment });
    setOpenActionId(null);
  };

  const confirmDeleteExperimentDraft = async () => {
    const { experiment } = deleteExperimentModal;
    if (!experiment) return;
    setLoadingAction({ scope: "experiment", id: experiment.id, type: "delete" });
    await sleep(450);
    setExperiments((current) => current.filter((item) => item.id !== experiment.id));
    setLoadingAction(null);
    setDeleteExperimentModal({ open: false, experiment: null });
    setToast({ type: "success", message: "Draft experiment deleted." });
  };

  const saveNewExperimentDraft = async (form) => {
    await sleep(450);
    let savedExperiment;

    if (form.id) {
      savedExperiment = {
        ...experiments.find((experiment) => experiment.id === form.id),
        ...form,
        status: "DRAFT",
        archived: false,
        confidence: null,
        lift: "—",
        users: 0,
      };
      setExperiments((current) => current.map((experiment) => (
        experiment.id === form.id ? savedExperiment : experiment
      )));
    } else {
      const nextId = Math.max(...experiments.map((experiment) => experiment.id), 0) + 1;
      savedExperiment = {
        id: nextId,
        name: form.name,
        status: "DRAFT",
        linkedConfigKey: form.linkedConfigKey || null,
        hypothesis: form.hypothesis,
        metric: form.primaryMetric || null,
        lift: "—",
        confidence: null,
        users: 0,
        archived: false,
        variants: form.variants,
      };
      setExperiments((current) => [savedExperiment, ...current]);
    }

    setToast({ type: "success", message: "Experiment saved as draft." });
    return savedExperiment;
  };

  const launchNewExperiment = async (form, options = {}) => {
    await sleep(550);
    const today = formatToday();
    let launchedExperiment;

    if (options.publishConfig && form.linkedConfigKey) {
      setConfigs((current) => current.map((config) => (
        config.key === form.linkedConfigKey ? { ...config, status: "Live", updated: today } : config
      )));
    }

    if (form.id) {
      launchedExperiment = {
        ...experiments.find((experiment) => experiment.id === form.id),
        ...form,
        status: "RUNNING",
        linkedConfigKey: form.linkedConfigKey,
        metric: form.primaryMetric,
        users: 0,
        confidence: null,
        lift: "—",
        archived: false,
        variants: form.variants,
      };
      setExperiments((current) => current.map((experiment) => (
        experiment.id === form.id ? launchedExperiment : experiment
      )));
    } else {
      const nextId = Math.max(...experiments.map((experiment) => experiment.id), 0) + 1;
      launchedExperiment = {
        id: nextId,
        name: form.name,
        status: "RUNNING",
        linkedConfigKey: form.linkedConfigKey,
        hypothesis: form.hypothesis,
        metric: form.primaryMetric,
        lift: "—",
        confidence: null,
        users: 0,
        archived: false,
        variants: form.variants,
      };
      setExperiments((current) => [launchedExperiment, ...current]);
    }

    setToast({ type: "success", message: options.publishConfig ? "Configuration published and experiment launched." : "Experiment launched." });
    openExperimentReport(launchedExperiment);
    return launchedExperiment;
  };

  const renderMainContent = () => {
    if (activeMenu === "remote_config") {
      if (remoteConfigView === "create" || remoteConfigView === "edit") {
        return (
          <RemoteConfigurationForm
            mode={remoteConfigView}
            initialValue={editingConfig}
            existingConfigs={configs}
            onCancel={goToRemoteConfigList}
            onSave={handleSaveConfig}
            onPauseConflictingConfig={pauseConflictingConfig}
          />
        );
      }

      if (remoteConfigView === "detail" && selectedConfigReport) {
        const activeConfig = configs.find((config) => config.id === selectedConfigReport.id) || selectedConfigReport;
        return (
          <RemoteConfigurationDetail
            config={activeConfig}
            experiments={experiments}
            onBack={goToRemoteConfigList}
            onEdit={goToRemoteConfigEdit}
            onOpenExperiment={openExperimentReport}
          />
        );
      }

      return (
        <RemoteConfigurationList
          configs={configs}
          openActionId={openActionId}
          setOpenActionId={setOpenActionId}
          onCreate={goToRemoteConfigCreate}
          onEdit={goToRemoteConfigEdit}
          onClone={handleCloneConfig}
          onRemove={handleRemoveConfig}
          onRowClick={goToRemoteConfigDetail}
          actionLoading={loadingAction?.scope === "config" ? loadingAction : null}
        />
      );
    }

    if (abView === "create") {
      return (
        <CreateExperiment
          configs={configs}
          experiments={experiments}
          onBack={() => setAbView("list")}
          onOpenRemoteConfigCreate={goToRemoteConfigCreate}
          onSaveDraft={saveNewExperimentDraft}
          onLaunchExperiment={launchNewExperiment}
        />
      );
    }

    if (abView === "detail" && selectedExperimentReport) {
      return (
        <ExperimentDetail
          experiment={selectedExperimentReport}
          linkedConfig={configs.find((config) => config.key === selectedExperimentReport.linkedConfigKey) || null}
          onBack={() => {
            setAbView("list");
            setSelectedExperimentReport(null);
          }}
          onOpenRemoteConfig={openRemoteConfigFromExperiment}
        />
      );
    }

    if (abView === "placeholder") {
      return (
        <ComingSoonPlaceholder
          title={abPlaceholderTitle || "Experiment Report"}
          onBack={() => {
            setAbView("list");
            setAbPlaceholderTitle("");
            setSelectedExperimentReport(null);
          }}
        />
      );
    }

    return (
      <ExperimentList
        experiments={experiments}
        configs={configs}
        openActionId={openActionId}
        setOpenActionId={setOpenActionId}
        onCreateNew={() => setAbView("create")}
        onOpenReport={openExperimentReport}
        onOpenEditor={(experiment) => openExperimentPlaceholder(`${experiment.name} Editor`)}
        onOpenRemoteConfig={openRemoteConfigFromExperiment}
        onPause={handlePauseExperiment}
        onResume={handleResumeExperiment}
        onArchive={handleArchiveExperiment}
        onClone={handleCloneExperiment}
        onLaunch={handleLaunchExperiment}
        onDeleteDraft={handleDeleteExperimentDraft}
        actionLoading={loadingAction}
      />
    );
  };

  return (
    <>
      <ConfirmModal
        open={removeModal.open}
        title={`Are you sure you want to remove '${removeModal.config?.name || ""}'?`}
        message="This action cannot be undone."
        warning={removeModal.config?.status === "Live" ? "This configuration is currently live and serving users. Removing it will immediately stop delivery." : null}
        confirmLabel={removeModal.config?.status === "Live" ? "Stop and Remove" : "Remove"}
        loading={loadingAction?.scope === "config" && loadingAction?.type === "remove" && loadingAction?.id === removeModal.config?.id}
        onCancel={() => setRemoveModal({ open: false, config: null })}
        onConfirm={confirmRemoveConfig}
      />
      <ConfirmModal
        open={deleteExperimentModal.open}
        title="Delete this experiment?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        loading={loadingAction?.scope === "experiment" && loadingAction?.type === "delete" && loadingAction?.id === deleteExperimentModal.experiment?.id}
        onCancel={() => setDeleteExperimentModal({ open: false, experiment: null })}
        onConfirm={confirmDeleteExperimentDraft}
      />
      <Toast toast={toast} />
      <div style={{ display: "flex", minHeight: "100vh", background: PAGE_BG, fontFamily: '"Inter", sans-serif' }}>
      <aside style={{ width: 222, background: WHITE, borderRight: `1px solid ${BORDER}`, padding: "14px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 18px 14px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLACK, letterSpacing: -0.5 }}>netmera</div>
        </div>

        <div style={{ padding: "14px 14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px 12px" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#2894FF", color: WHITE, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <GridIcon />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: 0.5 }}>APP</div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>NetmeraMain</div>
            </div>
            <div style={{ marginLeft: "auto", color: TEXT_MUTED }}><ChevronDownIcon /></div>
          </div>

          <div style={{ position: "relative", marginBottom: 10 }}>
            <span style={{ position: "absolute", left: 11, top: 10, color: TEXT_MUTED }}><SearchIcon /></span>
            <input placeholder="Search" style={{ ...inputStyle, paddingLeft: 34, background: PAGE_BG, borderColor: BORDER }} />
          </div>
        </div>

        <div style={{ padding: "4px 8px 0", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <SidebarItem icon={<HeartIcon />} label="Favorites" />
            <SidebarItem icon={<DashboardIcon />} label="Dashboard" />
            <SidebarItem icon={<MessageIcon />} label="Messages" trailing={<ChevronRightIcon />} />
            <SidebarItem icon={<WrenchIcon />} label="Web Tools" trailing={<ChevronRightIcon />} />
            <SidebarItem icon={<JourneyIcon />} label="Journeys" trailing={<ChevronRightIcon />} />
            <SidebarItem icon={<MobileIcon />} label="Mobile Inapp" trailing={<ChevronRightIcon />} />
            <SidebarItem icon={<TargetIcon />} label="Targeting" trailing={<ChevronRightIcon />} />
            <SidebarItem icon={<ReportIcon />} label="Reports" trailing={<ChevronRightIcon />} />
            <SidebarItem icon={<AnalyticsIcon />} label="Analytics" trailing={<ChevronRightIcon />} />

            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setExperienceHovered(true)}
              onMouseLeave={() => setExperienceHovered(false)}
            >
              <SidebarItem
                icon={<LinkIcon />}
                label="Experiences"
                active={activeMenu === "remote_config" || activeMenu === "ab_testing"}
                trailing={<ChevronDownIcon />}
              />

              {experienceHovered && (
                <div style={{ position: "absolute", left: "100%", top: 0, marginLeft: 12, width: 180, padding: 8, borderRadius: 12, background: WHITE, border: `1px solid ${BORDER}`, boxShadow: SHADOW, zIndex: 40 }}>
                  {[
                    { key: "remote_config", label: "Remote Configuration", action: goToRemoteConfigList },
                    {
                      key: "ab_testing",
                      label: "A/B Test",
                      action: () => {
                        setActiveMenu("ab_testing");
                        setAbView("list");
                      },
                    },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={item.action}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 10px",
                        border: "none",
                        borderRadius: 9,
                        background: activeMenu === item.key ? PAGE_BG : "transparent",
                        color: TEXT,
                        cursor: "pointer",
                        fontSize: 13,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ color: TEXT_MUTED }}><LinkIcon /></span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      <span style={{ color: TEXT_MUTED }}><HeartIcon /></span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <SidebarItem icon={<SettingsIcon />} label="Settings" trailing={<ChevronRightIcon />} />
            <SidebarItem icon={<DeveloperIcon />} label="Developers" trailing={<ChevronRightIcon />} />
          </div>
        </div>

        <div style={{ padding: "0 12px" }}>
          <button style={{ ...secondaryButtonStyle, width: "100%", justifyContent: "center", marginBottom: 12 }}>
            <LogoutIcon />
            Logout
          </button>
          <div style={{ padding: "10px 8px", borderTop: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, color: TEXT }}>ES</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>Emre Sumer</div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Europe/Istanbul</div>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "30px 28px 36px" }}>
        {renderMainContent()}
      </main>
      </div>
    </>
  );
}