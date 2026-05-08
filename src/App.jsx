import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { App as AntApp, Button, Alert, Tag, message as antdMessage, DatePicker, Modal, Select, Segmented, Typography } from "antd";
const { Title: AntTitle, Text: AntText, Paragraph: AntParagraph } = Typography;
import dayjs from "dayjs";

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

function formatPrettyDate(ddmmyyyy) {
  if (!ddmmyyyy) return "—";
  const [day, month, year] = ddmmyyyy.split(".");
  if (!day || !month || !year) return ddmmyyyy;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeDateLabel(ddmmyyyy) {
  if (!ddmmyyyy) return "";
  const [day, month, year] = ddmmyyyy.split(".");
  if (!day || !month || !year) return "";
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 60) return "1 month ago";
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)} years ago`;
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
    linkedConfigKey: "product_page_layout",
    hypothesis: "Personalized greeting increases engagement.",
    metric: "session_duration",
    lift: "+12%",
    confidence: 94,
    users: 45232,
    archived: false,
    createdAt: "2025-03-10",
    updatedAt: "2025-04-28",
    createdBy: "Emre Sumer",
    trafficSplit: { control: 50, variant_b: 50 },
    variants: [
      { id: "control", label: "Control", conversionRate: 0.032, users: 22616, conversions: 723, parameterOverrides: { hero_image_size: "large", show_reviews: "true", cta_label: "Add to Cart", related_limit: "4" } },
      { id: "variant_b", label: "Variant B", conversionRate: 0.037, users: 22616, conversions: 837, uplift: 0.12, parameterOverrides: { hero_image_size: "small", show_reviews: "false", cta_label: "Buy Now", related_limit: "6" } },
    ],
  },
  {
    id: 2,
    name: "CTA button color test",
    status: "RUNNING",
    linkedConfigKey: "cart_checkout_config",
    hypothesis: "Green CTA converts better than blue.",
    metric: "purchase_completed",
    lift: "-3%",
    confidence: 76,
    users: 32100,
    archived: false,
    createdAt: "2025-02-14",
    updatedAt: "2025-04-20",
    createdBy: "Ahmet Seyyar",
  },
  {
    id: 3,
    name: "Promo banner placement",
    status: "COMPLETED",
    linkedConfigKey: "search_results_display",
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
    createdAt: "2024-12-20",
    updatedAt: "2025-01-19",
    createdBy: "Emre Sumer",
    lastModifiedBy: "Emre Sumer",
    lastModifiedAt: "2025-01-10",
    totalUsers: 63350,
    trafficSplit: { control: 50, variant_b: 50 },
    targeting: "All Users",
    randomizationUnit: "User ID",
    linkedConfigMeta: { name: "Search Results Display", key: "search_results_display", controlValue: false, variantBValue: true },
    variants: [
      { id: "control", label: "Control", conversionRate: 0.032, users: 31675, conversions: 1014, isWinner: false, parameterOverrides: { page_size: "20", show_filters: "true", layout: "grid" } },
      { id: "variant_b", label: "Variant B", conversionRate: 0.039, users: 31675, conversions: 1235, uplift: 0.23, upliftAbsolute: 0.007, isWinner: true, parameterOverrides: { page_size: "20", show_filters: "false", layout: "list" } },
    ],
  },
  {
    id: 4,
    name: "Onboarding flow v3",
    status: "DRAFT",
    linkedConfigKey: "onboarding_flow_config",
    hypothesis: "Shorter onboarding reduces drop-off.",
    metric: null,
    lift: "—",
    confidence: null,
    users: 0,
    archived: false,
    createdAt: "2025-04-30",
    updatedAt: "2025-05-01",
    createdBy: "Ecemnaz Canbaz",
  },
  {
    id: 5,
    name: "Search ranking weights",
    status: "RUNNING",
    linkedConfigKey: "product_page_layout",
    hypothesis: "ML-based ranking improves relevance.",
    metric: "search_result_click",
    lift: "+5%",
    confidence: 72,
    users: 18900,
    archived: false,
    createdAt: "2025-03-22",
    updatedAt: "2025-04-15",
    createdBy: "Burak Alparslan",
    trafficSplit: { control: 50, variant_b: 50 },
    variants: [
      { id: "control", label: "Control", conversionRate: 0.028, users: 9450, conversions: 265, parameterOverrides: { hero_image_size: "large", show_reviews: "true", cta_label: "Add to Cart", related_limit: "4" } },
      { id: "variant_b", label: "Variant B", conversionRate: 0.031, users: 9450, conversions: 293, uplift: 0.05, parameterOverrides: { hero_image_size: "medium", show_reviews: "true", cta_label: "Shop Now", related_limit: "8" } },
    ],
  },
  {
    id: 6,
    name: "Dark mode checkout",
    status: "COMPLETED",
    linkedConfigKey: "cart_checkout_config",
    hypothesis: "Dark mode checkout reduces abandonment.",
    metric: "checkout_completed",
    lift: "+9%",
    confidence: 96,
    users: 28440,
    archived: true,
    createdAt: "2024-11-08",
    updatedAt: "2025-01-02",
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

const mockSchemas = [
  {
    id: "s1",
    name: "Product Page Layout",
    key: "product_page_layout",
    description: "Controls layout variants for product detail pages.",
    sdks: ["iOS", "Android"],
    parameters: [
      { id: "sp1", key: "hero_image_size", type: "String", description: "Size of the hero image area", defaultValue: "large" },
      { id: "sp2", key: "show_reviews", type: "Boolean", description: "Toggle customer review section", defaultValue: "true" },
      { id: "sp3", key: "cta_label", type: "String", description: "Label on the primary CTA button", defaultValue: "Add to Cart" },
      { id: "sp4", key: "related_limit", type: "Integer", description: "Number of related products shown", defaultValue: "4" },
    ],
    variants: [
      { id: "rcv_default", name: "Default Experience", isDefault: true, priority: 999, segments: [], rolloutPercentage: 100, parameterOverrides: { hero_image_size: "large", show_reviews: "true", cta_label: "Add to Cart", related_limit: "4" } },
    ],
    created: formatDateOffset(18),
    updated: formatDateOffset(3),
    createdBy: "Emre Sumer",
    status: "Active",
  },
  {
    id: "s2",
    name: "Onboarding Flow Config",
    key: "onboarding_flow_config",
    description: "Defines steps and copy used in the onboarding sequence.",
    sdks: ["iOS", "Android", "React Native"],
    parameters: [
      { id: "sp5", key: "skip_enabled", type: "Boolean", description: "Allow users to skip onboarding", defaultValue: "false" },
      { id: "sp6", key: "steps_count", type: "Integer", description: "Total number of onboarding steps", defaultValue: "4" },
      { id: "sp7", key: "welcome_title", type: "String", description: "Title text on the welcome screen", defaultValue: "Welcome aboard!" },
      { id: "sp8", key: "progress_style", type: "String", description: "Style of progress indicator (dots | bar)", defaultValue: "dots" },
      { id: "sp9", key: "animation_speed", type: "Float", description: "Transition animation duration in seconds", defaultValue: "0.35" },
      { id: "sp10", key: "show_social_proof", type: "Boolean", description: "Show testimonials on last step", defaultValue: "true" },
    ],
    created: formatDateOffset(55),
    updated: formatDateOffset(10),
    createdBy: "Burak Alparslan",
    status: "Draft",
  },
  {
    id: "s3",
    name: "Search Results Display",
    key: "search_results_display",
    description: "Manages pagination and display options for search result pages.",
    sdks: ["Web"],
    parameters: [
      { id: "sp11", key: "page_size", type: "Integer", description: "Number of results per page", defaultValue: "20" },
      { id: "sp12", key: "show_filters", type: "Boolean", description: "Show faceted filter sidebar", defaultValue: "true" },
      { id: "sp13", key: "layout", type: "String", description: "Results layout (grid | list)", defaultValue: "grid" },
    ],
    created: formatDateOffset(32),
    updated: formatDateOffset(7),
    createdBy: "Ecemnaz Canbaz",
    status: "Active",
  },
  {
    id: "s4",
    name: "Cart Checkout Config",
    key: "cart_checkout_config",
    description: "Feature flags and copy for the cart and checkout funnel.",
    sdks: ["iOS", "Android", "Web"],
    parameters: [
      { id: "sp14", key: "express_checkout", type: "Boolean", description: "Enable one-tap express checkout", defaultValue: "false" },
      { id: "sp15", key: "promo_banner", type: "String", description: "Promotional banner text (empty = hidden)", defaultValue: "" },
      { id: "sp16", key: "trust_badges", type: "Boolean", description: "Show security / trust badges", defaultValue: "true" },
      { id: "sp17", key: "upsell_limit", type: "Integer", description: "Max upsell items shown in cart", defaultValue: "3" },
      { id: "sp18", key: "delivery_eta_label", type: "String", description: "Delivery estimate copy below CTA", defaultValue: "Ships in 2-3 days" },
    ],
    created: formatDateOffset(72),
    updated: formatDateOffset(14),
    createdBy: "Ahmet Seyyar",
    status: "Draft",
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
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width={480}
      title={<AntTitle level={4} style={{ margin: 0 }}>{title}</AntTitle>}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>Cancel</Button>,
        <Button
          key="confirm"
          type="primary"
          danger={confirmTone === "danger"}
          loading={loading}
          onClick={onConfirm}
          style={confirmTone !== "danger" ? { background: "#3B82F6", borderColor: "#3B82F6" } : {}}
        >
          {confirmLabel}
        </Button>,
      ]}
    >
      {message && <AntParagraph type="secondary" style={{ marginBottom: summary || warning ? 12 : 0 }}>{message}</AntParagraph>}
      {summary && (
        <div style={{ marginBottom: warning ? 12 : 0, borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB", overflow: "hidden" }}>
          {summary.meta && summary.meta.map((row, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "9px 14px", borderBottom: "1px solid #F3F4F6" }}>
              <AntText style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 90, flexShrink: 0 }}>{row.label}</AntText>
              <AntText style={{ fontSize: 13, fontWeight: 500, wordBreak: "break-all" }}>{row.value}</AntText>
            </div>
          ))}
          {summary.variants && summary.variants.length > 0 && (
            <div>
              <div style={{ padding: "8px 14px 4px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rollout Groups</div>
              {summary.variants.map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderTop: "1px solid #F3F4F6" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: v.isDefault ? "#D1D5DB" : "#3B82F6", flexShrink: 0 }} />
                  <AntText style={{ fontSize: 13, color: v.isDefault ? TEXT_MUTED : TEXT, flex: 1 }}>{v.name}</AntText>
                  <AntText type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>{v.segment}</AntText>
                  <Tag style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{v.rollout}%</Tag>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {warning && <Alert type="warning" message={warning} showIcon style={{ marginTop: summary ? 0 : 4 }} />}
    </Modal>
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
    DRAFT: { bg: DRAFT_BG, color: DRAFT_TEXT, dot: "#C4CAD4", label: "Draft" },
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
  const isActive = status === "Live" || status === "Active" || status === "Rolled Out";
  const styles = isActive
    ? { bg: "#DCFCE7", color: "#166534", dot: "#22C55E" }
    : { bg: "#F3F4F6", color: "#6B7280", dot: "#9CA3AF" };
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      minWidth: 56,
      padding: "4px 10px",
      borderRadius: 999,
      background: styles.bg,
      color: styles.color,
      fontSize: 11,
      fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: styles.dot }} />
      {isActive ? "Active" : "Draft"}
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
          border: "none",
          background: "transparent",
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
            zIndex: 9999,
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
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");

  const customStart = parseInputDate(customStartDate);
  const customEnd = parseInputDate(customEndDate);

  const filteredConfigs = useMemo(() => {
    const today = startOfDay(new Date());
    const trimmedSearch = searchQuery.trim().toLowerCase();
    const filtered = configs.filter((config) => {
      // Search filter
      if (trimmedSearch && !config.name.toLowerCase().includes(trimmedSearch)) return false;

      const createdDate = parseDisplayDate(config.created);
      const diffInDays = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));

      if (activeDateFilter === "Custom") {
        if (customStart && customEnd) {
          return isWithinRange(createdDate, customStart, customEnd);
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
    const sorted = [...filtered].sort((left, right) => {
      let leftValue = left[sortBy];
      let rightValue = right[sortBy];

      if (sortBy === "status") {
        leftValue = statusOrder[left.status] ?? 99;
        rightValue = statusOrder[right.status] ?? 99;
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
  }, [activeDateFilter, configs, customEnd, customStart, searchQuery, sortBy, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [activeDateFilter, customEndDate, customStartDate, pageSize, searchQuery, sortBy, sortDir]);

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

  const columns = [
    { key: "checkbox", label: "", sortable: false },
    { key: "status", label: "Status", sortable: true },
    { key: "name", label: "Rollout Name", sortable: true },
    { key: "created", label: "Create Date", sortable: true },
    { key: "updated", label: "Update Date", sortable: true },
    { key: "creator", label: "Creator", sortable: true },
    { key: "actions", label: "", sortable: false },
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 5, alignSelf: "stretch", borderRadius: 999, background: "#3B82F6", flexShrink: 0 }} />
          <div>
            <h1 style={pageTitleStyle}>Feature Rollouts</h1>
            <p style={pageDescriptionStyle}>Roll out configuration changes to specific segments or your entire user base.</p>
          </div>
        </div>
        <Button type="primary" onClick={onCreate} style={{ flexShrink: 0 }}>+ New Rollout</Button>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "0 0 250px" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input type="text" placeholder="Search by rollout name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, width: "100%", background: WHITE, border: `1px solid ${BORDER}`, paddingLeft: 30, paddingRight: searchQuery ? 28 : 10, fontSize: 12, boxSizing: "border-box", height: 34 }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", padding: 2, fontSize: 14, display: "flex", alignItems: "center" }}>×</button>}
        </div>
        <div style={{ width: 1, height: 22, background: "#E5E7EB", flexShrink: 0 }} />
        {/* Custom button */}
        <button
          onClick={() => { setActiveDateFilter("Custom"); }}
          style={{ padding: "5px 12px", height: 34, borderRadius: 8, border: `1px solid ${activeDateFilter === "Custom" ? "#3B82F6" : "#E5E7EB"}`, background: activeDateFilter === "Custom" ? "#EFF6FF" : WHITE, color: activeDateFilter === "Custom" ? "#1D4ED8" : TEXT_MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Custom
        </button>
        {/* Date range picker */}
        <DatePicker.RangePicker
          placeholder={["Start date", "End date"]}
          value={customStartDate && customEndDate ? [dayjs(customStartDate), dayjs(customEndDate)] : null}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setCustomStartDate(dates[0].format("YYYY-MM-DD"));
              setCustomEndDate(dates[1].format("YYYY-MM-DD"));
              setActiveDateFilter("Custom");
            } else {
              setCustomStartDate("");
              setCustomEndDate("");
            }
          }}
          size="small"
          style={{ height: 34, borderRadius: 8, fontSize: 12, borderColor: activeDateFilter === "Custom" ? "#3B82F6" : "#E5E7EB" }}
          separator={<span style={{ color: TEXT_MUTED }}>→</span>}
        />
        {/* Preset filters */}
        {dateFilters.map((f) => {
          const isPrimary = activeDateFilter === f;
          return (
            <button key={f} onClick={() => { setActiveDateFilter(f); setCustomStartDate(""); setCustomEndDate(""); }}
              style={{ padding: "5px 10px", height: 34, borderRadius: 8, border: `1px solid ${isPrimary ? "#3B82F6" : "#E5E7EB"}`, background: isPrimary ? "#3B82F6" : WHITE, color: isPrimary ? WHITE : TEXT_MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {f}
            </button>
          );
        })}
      </div>


      {configs.length === 0 ? (
        <EmptyState title="No rollouts yet" description="Create your first rollout to start delivering configuration changes." ctaLabel="+ New Rollout" onClick={onCreate} />
      ) : filteredConfigs.length === 0 ? (
        <div style={{ ...cardStyle, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 6 }}>No rollouts found</div>
          <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 14 }}>No results for the current search or date filter — try adjusting your filters.</div>
          <button onClick={() => { setSearchQuery(""); setActiveDateFilter("30D"); setCustomStartDate(""); setCustomEndDate(""); }} style={{ ...secondaryButtonStyle, padding: "8px 16px" }}>Clear filters</button>
        </div>
      ) : (
        <>
          <div style={{ ...cardStyle, overflow: "visible" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, borderRadius: 12, overflow: "visible", display: "table" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, background: SOFT }}>
                  {[
                    { key: "status", label: "Status", sortable: true },
                    { key: "name", label: "Rollout Name", sortable: true },
                    { key: "created", label: "Create Date", sortable: true },
                    { key: "updated", label: "Last Updated", sortable: true },
                    { key: "creator", label: "Creator User", sortable: true },
                    { key: "actions", label: "Actions", sortable: false },
                  ].map((col) => (
                    <th key={col.key} style={{ padding: "11px 16px", textAlign: col.key === "actions" ? "center" : "left", fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedConfigs.map((config, idx) => (
                  <tr key={config.id} onClick={() => onRowClick(config)}
                    style={{ borderBottom: idx < pagedConfigs.length - 1 ? `1px solid ${BORDER}` : "none", cursor: "pointer", transition: "background 0.12s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = SOFT; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
                    <td style={{ padding: "14px 16px" }}><SchemaStatusBadge status={config.status} /></td>
                    <td style={{ padding: "14px 16px", maxWidth: 280 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{config.name}</div>
                      {config.description && <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 260 }}>{config.description}</div>}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: TEXT_MUTED, whiteSpace: "nowrap" }}>{config.created}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: TEXT_MUTED, whiteSpace: "nowrap" }}>{config.updated}</td>
                    <td style={{ padding: "14px 16px", fontSize: 12, color: TEXT_MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
                      {config.creator}
                    </td>
                    <td style={{ padding: "10px 16px", width: 88, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
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
              <div>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalConfigs)} of {totalConfigs} rollouts</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {totalConfigs > 20 && (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    Rows per page
                    <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} style={{ ...inputStyle, width: 88, padding: "8px 10px" }}>
                      {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                )}
                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setPage((c) => Math.max(1, c - 1))} disabled={page === 1} style={{ ...secondaryButtonStyle, padding: "8px 10px", opacity: page === 1 ? 0.5 : 1 }}>Previous</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pn) => (
                      <button key={pn} onClick={() => setPage(pn)} style={{ ...secondaryButtonStyle, padding: "8px 12px", background: pn === page ? PRIMARY : WHITE, color: pn === page ? WHITE : TEXT, borderColor: pn === page ? PRIMARY : "rgba(0,0,0,0.1)" }}>{pn}</button>
                    ))}
                    <button onClick={() => setPage((c) => Math.min(totalPages, c + 1))} disabled={page === totalPages} style={{ ...secondaryButtonStyle, padding: "8px 10px", opacity: page === totalPages ? 0.5 : 1 }}>Next</button>
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
  schemas = [],
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
  // config.id === schema.id, so use id as fallback for pre-populating the config key dropdown
  const [selectedSchemaId, setSelectedSchemaId] = useState(initialValue?.schemaId || initialValue?.id || null);
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
  const [defaultExpanded, setDefaultExpanded] = useState(false);
  const [configKeyOpen, setConfigKeyOpen] = useState(false);

  useEffect(() => {
    setForm(buildInitialForm());
    setStep(1);
    setErrors({});
    setConflictConfig(null);
    setKeyTouched(Boolean(initialValue?.key));
    setSelectedSchemaId(initialValue?.schemaId || initialValue?.id || null);
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
    background: WHITE,
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

    Modal.confirm({
      title: "Unsaved changes",
      content: "You have unsaved changes. Are you sure you want to leave?",
      okText: "Leave",
      cancelText: "Stay",
      okButtonProps: { danger: true },
      onOk: () => onCancel(),
    });
  };

  const scrollToFirstError = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateStepOne = () => {
    const nextErrors = {};
    const trimmedName = form.name.trim();
    const trimmedKey = form.key.trim();
    const duplicateName = existingConfigs.find(
      (config) => config.name.toLowerCase() === trimmedName.toLowerCase() && config.id !== form.id,
    );

    if (!trimmedName) {
      nextErrors.name = "Rollout name is required.";
    } else if (duplicateName) {
      nextErrors.name = "A rollout with this name already exists.";
    }

    if (!trimmedKey) {
      nextErrors.key = "Please select a config from the library.";
    }

    setErrors(nextErrors);

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
        nextErrors[`variant_${variant.id}_segments`] = `"${variant.name || `Rollout Group ${i + 1}`}" needs at least one target segment.`;
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
        name: `Rollout Group ${customs.length + 1}`,
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
    const isValid = validateStepOne();
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
    <div style={{ paddingBottom: 80 }}>
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
              { label: "Rollout Groups", value: `${customs.length} custom + 1 default` },
            ],
            variants: [
              ...customs.map((v, i) => ({
                name: `Rollout Group ${i + 1} — ${v.name}`,
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

      <Modal
        open={!!conflictConfig}
        onCancel={() => setConflictConfig(null)}
        width={620}
        title={<AntTitle level={4} style={{ margin: 0 }}>Parameter Key Conflict Detected</AntTitle>}
        footer={[
          <Button key="edit" onClick={() => setConflictConfig(null)}>Continue Editing This Configuration</Button>,
          <Button
            key="pause"
            type="primary"
            onClick={() => {
              onPauseConflictingConfig(conflictConfig.id);
              proceedToStepTwo();
            }}
          >
            Pause '{conflictConfig?.name}' and Continue
          </Button>,
        ]}
      >
        <AntParagraph type="secondary" style={{ lineHeight: 1.7, marginBottom: 0 }}>
          The parameter key you've entered is already in use by the '<AntText strong>{conflictConfig?.name}</AntText>' remote configuration, which is currently LIVE. Using duplicate parameter keys across active configurations may cause unexpected behavior and unpredictable value resolution on the client side. To proceed safely, either choose a unique parameter key or take the conflicting configuration offline before continuing.
        </AntParagraph>
      </Modal>

      {/* Page header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 5, alignSelf: "stretch", borderRadius: 999, background: "#3B82F6", flexShrink: 0 }} />
          <div>
            <h1 style={pageTitleStyle}>{mode === "edit" ? "Edit Feature Rollout" : "New Feature Rollout"}</h1>
            <p style={pageDescriptionStyle}>Choose a config from the library and define who receives it.</p>
          </div>
        </div>
      </div>

      {/* Config Selection Card */}
      <div style={{ ...cardStyle, padding: 20, marginBottom: 0 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: TEXT }}>Select Configuration</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: TEXT_MUTED }}>Choose a config from the library to roll out.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>
              ROLLOUT NAME *
              <div style={{ position: "relative", display: "inline-flex", cursor: "default" }} onMouseEnter={(e) => { e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }} onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/><rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/><rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/></svg>
                <div style={{ visibility: "hidden", opacity: 0, position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#111827", color: WHITE, fontSize: 12, fontWeight: 400, padding: "7px 12px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999, transition: "opacity 0.15s, visibility 0.15s", pointerEvents: "none" }}>
                  Give this rollout a memorable name to identify it in the list.
                  <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
                </div>
              </div>
            </label>
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Product Page Layout Rollout"
              style={fieldInputStyle("name")}
            />
            {errors.name && <div style={{ marginTop: 6, fontSize: 12, color: "#EF4444" }}>{errors.name}</div>}
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>
              CONFIG KEY *
              <div style={{ position: "relative", display: "inline-flex", cursor: "default" }} onMouseEnter={(e) => { e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }} onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/><rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/><rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/></svg>
                <div style={{ visibility: "hidden", opacity: 0, position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#111827", color: WHITE, fontSize: 12, fontWeight: 400, padding: "7px 12px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999, transition: "opacity 0.15s, visibility 0.15s", pointerEvents: "none" }}>
                  Choose which config from your library this rollout will serve.
                  <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
                </div>
              </div>
            </label>
            {/* Custom dropdown — uses fieldInputStyle so height is guaranteed identical to ROLLOUT NAME */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setConfigKeyOpen((v) => !v)}
                style={{ ...fieldInputStyle("key"), display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", appearance: "none", WebkitAppearance: "none", textAlign: "left", fontFamily: "inherit" }}
              >
                <span style={{ flex: 1, color: selectedSchemaId ? TEXT : "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedSchemaId ? (() => { const s = schemas.find((s) => s.id === selectedSchemaId); return s ? `${s.name} (${s.key})` : "Select a config from library..."; })() : "Select a config from library..."}
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "#9CA3AF", transition: "transform 0.2s", transform: configKeyOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {configKeyOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setConfigKeyOpen(false)} />
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 260, overflowY: "auto" }}>
                    {schemas.length === 0
                      ? <div style={{ padding: "10px 14px", fontSize: 13, color: "#9CA3AF" }}>No configs available</div>
                      : schemas.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedSchemaId(s.id);
                            setFieldValue("key", s.key);
                            setFieldValue("parameters", (s.parameters || []).map((p) => ({ id: p.id, key: p.key, type: p.type, description: p.description || "", value: p.defaultValue ?? "", collapsed: false })));
                            setConfigKeyOpen(false);
                          }}
                          style={{ padding: "10px 14px", fontSize: 13, color: selectedSchemaId === s.id ? "#3B82F6" : TEXT, background: selectedSchemaId === s.id ? "#EFF6FF" : "transparent", cursor: "pointer" }}
                          onMouseEnter={(e) => { if (selectedSchemaId !== s.id) e.currentTarget.style.background = "#F9FAFB"; }}
                          onMouseLeave={(e) => { if (selectedSchemaId !== s.id) e.currentTarget.style.background = "transparent"; }}
                        >
                          {s.name} ({s.key})
                        </div>
                      ))
                    }
                  </div>
                </>
              )}
            </div>
            {errors.key && <div style={{ marginTop: 6, fontSize: 12, color: "#EF4444" }}>{errors.key}</div>}
          </div>
        </div>

        {/* Description field */}
        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>DESCRIPTION</label>
          <textarea
            value={form.description}
            onChange={(e) => setFieldValue("description", e.target.value)}
            placeholder="Brief description of what this rollout does…"
            rows={3}
            style={{ ...fieldInputStyle("description"), resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
          />
          <div style={{ marginTop: 4, fontSize: 11, color: TEXT_MUTED, textAlign: "right" }}>{form.description.length} / 300</div>
        </div>
      </div>

      {(() => {
        const customVariants = (form.variants || []).filter((v) => !v.isDefault);
        const atMax = customVariants.length >= 10;
        const variantColors = ["#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16", "#06B6D4"];
        const segUsage = {};
        customVariants.forEach((v, i) => { v.segments.forEach((s) => { segUsage[s] = segUsage[s] || []; segUsage[s].push(i + 1); }); });
        // All-Users exclusivity: if any variant has "All Users", block all other segment choices everywhere
        const allUsersSelectedAnywhere = customVariants.some((v) => v.segments.includes("All Users"));

        return (
          <div style={{ marginTop: 24 }} onClick={() => { setOpenSegmentMenuId(null); setOpenActionMenuKey(null); setOpenInlineEditKey(null); }}>

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
                        onBlur={(e) => { e.target.style.borderBottomColor = "transparent"; if (!e.target.value.trim()) updateVariant(variant.id, (v) => ({ ...v, name: `Rollout Group ${idx + 1}` })); }}
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
                              style={{ width: 72, padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 6, textAlign: "center", fontSize: 14, fontWeight: 700, color: "#111827", background: WHITE, outline: "none" }}
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
                Add Rollout Group
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
            <div style={{ background: WHITE, border: "1px solid #E5E7EB", borderRadius: 8 }}>
              <button
                onClick={() => setDefaultExpanded((v) => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", borderRadius: "8px 8px 0 0" }}
              >
                <svg style={{ flexShrink: 0, color: "#9CA3AF" }} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H3.5A1.5 1.5 0 0 0 2 7.5v6A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12.5 6h-1V4.5A3.5 3.5 0 0 0 8 1Zm-2 3.5a2 2 0 0 1 4 0V6H6V4.5ZM3.5 7h9a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5ZM8 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>
                </svg>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Default Experience</span>
                  <div
                    style={{ position: "relative", display: "inline-flex", cursor: "default" }}
                    onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }}
                    onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/>
                      <rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/>
                      <rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/>
                    </svg>
                    <div style={{ visibility: "hidden", opacity: 0, position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#111827", color: WHITE, fontSize: 12, fontWeight: 400, padding: "7px 12px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999, transition: "opacity 0.15s, visibility 0.15s", pointerEvents: "none" }}>
                      All users will receive the Default until you configure a variant above.
                      <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
                    </div>
                  </div>
                </div>
                <span style={{ padding: "3px 10px", borderRadius: 999, background: "#F3F4F6", color: "#6B7280", border: "1px solid #E5E7EB", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>ALL UNMATCHED USERS</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginLeft: 12 }}>100%</span>
                {/* Chevron: right = collapsed, down = expanded */}
                <svg style={{ color: "#9CA3AF", marginLeft: 4, flexShrink: 0, transition: "transform 0.2s", transform: defaultExpanded ? "rotate(90deg)" : "rotate(0deg)" }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {defaultExpanded && form.parameters.length > 0 && (
                <div style={{ borderTop: "1px solid #F3F4F6", padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>DEFAULT PARAMETER VALUES</div>
                  <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, letterSpacing: "0.06em", textTransform: "uppercase", padding: "10px 14px" }}>KEY</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, letterSpacing: "0.06em", textTransform: "uppercase", padding: "10px 14px" }}>DEFAULT VALUE</div>
                    </div>
                    {form.parameters.map((param, i) => (
                      <div key={param.id} style={{ display: "grid", gridTemplateColumns: "1fr 2fr", borderBottom: i < form.parameters.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                        <div style={{ padding: "10px 14px" }}>
                          <code style={{ fontSize: 12, color: "#4F46E5", background: "#EEF2FF", border: "1px solid #C7D2FB", borderRadius: 4, padding: "1px 6px" }}>{param.key}</code>
                        </div>
                        <div style={{ padding: "10px 14px", fontSize: 13, color: TEXT_MUTED }}>{String(param.value)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {defaultExpanded && form.parameters.length === 0 && (
                <div style={{ borderTop: "1px solid #F3F4F6", padding: "14px 16px", fontSize: 13, color: TEXT_MUTED }}>
                  Select a config above to see its default values.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Fixed footer ── */}
      <div style={{ position: "fixed", bottom: 0, left: 222, right: 0, padding: "14px 28px", background: WHITE, borderTop: "2px solid #E5E7EB", boxShadow: "0 -4px 16px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, zIndex: 40 }}>
        <Button onClick={showBackConfirmation}>Back</Button>
        <div style={{ display: "flex", gap: 10 }}>
          <Button onClick={handleSaveDraft} disabled={draftLoading} style={{ minWidth: 118 }}>
            {draftLoading ? <Spinner /> : "Save Draft"}
          </Button>
          <Button type="primary" onClick={openPublishFlow} disabled={publishLoading} style={{ minWidth: 100 }}>
            {publishLoading ? <Spinner color="#FFFFFF" /> : "Go Live"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RemoteConfigurationDetail({ config, experiments, onBack, onEdit, onOpenExperiment }) {
  const [copiedKey, setCopiedKey] = useState(false);

  const linkedExperiments = experiments.filter((e) => !e.archived && e.linkedConfigKey === config.key);
  const activeSegments = config.selectedSegments?.length ? config.selectedSegments : [];
  const rolloutPct = config.rollout ?? 100;
  const displayTitle = config.name;

  const handleCopyKey = () => {
    try { navigator.clipboard.writeText(config.key); } catch (_) {}
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1800);
  };

  const ghostButtonStyle = { ...secondaryButtonStyle, background: WHITE, border: "1px solid #D1D5DB", color: "#374151" };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>

      {/* ── Page header (matches Config Library style) ── */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 5, alignSelf: "stretch", borderRadius: 999, background: "#3B82F6", flexShrink: 0 }} />
        <div>
          <h1 style={pageTitleStyle}>{displayTitle}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 13, color: TEXT_MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{config.key}</span>
            <ConfigStatusBadge status={config.status} />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>

            {/* Overview card — grouped sections */}
            <div style={{ ...cardStyle, padding: 22 }}>
              <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: TEXT }}>Overview</h3>

              {/* Section: Rollout Setup */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Rollout Setup</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
                {[
                  { label: "ROLLOUT %", value: `${rolloutPct}%` },
                  { label: "TARGET SEGMENT", value: activeSegments.length ? `${activeSegments.length} rule${activeSegments.length > 1 ? "s" : ""}` : "All Users" },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: 20 }} />

              {/* Section: Tracking */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Tracking</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 20 }}>
                {[
                  { label: "STATUS", badge: true },
                  { label: "ACTIVE SINCE", value: config.status === "Live" ? formatPrettyDate(config.updated || config.created) || "—" : "—" },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{item.label}</div>
                    {item.badge
                      ? <ConfigStatusBadge status={config.status} />
                      : <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{item.value}</div>
                    }
                  </div>
                ))}
              </div>

              <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: 20 }} />

              {/* Section: Audit */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Audit</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
                {[
                  { label: "CREATED BY", value: config.creator || "John Smith" },
                  { label: "CREATED", value: formatPrettyDate(config.created) || "—" },
                  { label: "LAST UPDATED", value: formatPrettyDate(config.updated) || "—" },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rollout Groups card */}
            <div style={{ ...cardStyle, padding: 22 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: TEXT }}>Rollout Groups</h3>
              {config.variants?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {config.variants.map((variant) => (
                    <div key={variant.id} style={{ borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT, overflow: "hidden" }}>
                      {/* Group header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: WHITE }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: variant.isDefault ? "#D1D5DB" : "#3B82F6", flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{variant.name}</span>
                          {variant.isDefault && <span style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", background: "#F3F4F6", borderRadius: 4, padding: "2px 6px", border: "1px solid #E5E7EB" }}>Default</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: TEXT_MUTED }}>{variant.segments?.length ? `${variant.segments.length} segment rule${variant.segments.length > 1 ? "s" : ""}` : "All Unmatched Users"}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8", background: "#EFF6FF", borderRadius: 6, padding: "3px 9px", border: "1px solid #BFDBFE" }}>{variant.rolloutPercentage ?? 100}%</span>
                        </div>
                      </div>
                      {/* Parameter overrides */}
                      {config.parameters?.length > 0 && (
                        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                          {config.parameters.map((param) => {
                            const overrideVal = variant.parameterOverrides?.[param.key];
                            const displayVal = overrideVal !== undefined ? overrideVal : param.value ?? param.defaultValue ?? "—";
                            return (
                              <div key={param.key} style={{ display: "grid", gridTemplateColumns: "160px 68px 1fr", alignItems: "center", gap: 8 }}>
                                <code style={{ fontSize: 12, fontWeight: 700, color: "#4F46E5", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{param.key}</code>
                                <span style={{ fontSize: 10, fontWeight: 600, color: "#6B7280", background: "#F3F4F6", borderRadius: 4, padding: "1px 5px", border: "1px solid #E5E7EB", textAlign: "center", whiteSpace: "nowrap" }}>{param.type}</span>
                                <span style={{ fontSize: 12, color: TEXT, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", background: WHITE, borderRadius: 6, border: `1px solid ${BORDER}`, padding: "3px 8px", wordBreak: "break-all" }}>{String(displayVal)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: TEXT_MUTED, fontSize: 13, border: `1px dashed ${BORDER}`, borderRadius: 8 }}>No rollout groups configured yet.</div>
              )}
            </div>
          </div>

      {/* ── Footer (matches Config Library style) ── */}
      <div style={{ position: "sticky", bottom: 0, background: WHITE, borderTop: `1px solid ${BORDER}`, padding: "14px 0", marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Button onClick={onBack} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>}>
          Back
        </Button>
        <Button type="primary" onClick={() => onEdit(config)} icon={<EditIcon />}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function ExperimentActionMenu({ experiment, isOpen, onToggle, actions, loadingAction }) {
  const btnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const handleToggle = (event) => {
    event.stopPropagation();
    if (!isOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    onToggle(experiment.id);
  };

  return (
    <div style={{ position: "relative", display: "inline-flex", justifyContent: "center", width: "100%" }}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        disabled={Boolean(loadingAction)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          border: "none",
          background: "transparent",
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
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={(e) => { e.stopPropagation(); onToggle(experiment.id); }} />
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "fixed",
              top: menuPos.top,
              right: menuPos.right,
              width: 190,
              padding: 8,
              borderRadius: 10,
              background: WHITE,
              border: `1px solid ${BORDER}`,
              boxShadow: SHADOW,
              zIndex: 9999,
            }}
          >
            {actions.map((action) => {
              const isDisabled = Boolean(loadingAction) || action.disabled;
              return (
                <div key={action.key} style={{ position: "relative" }}
                  onMouseEnter={(e) => { if (action.disabled && action.tooltip) { const tip = e.currentTarget.querySelector(".action-tip"); if (tip) { tip.style.visibility = "visible"; tip.style.opacity = "1"; } } }}
                  onMouseLeave={(e) => { if (action.disabled && action.tooltip) { const tip = e.currentTarget.querySelector(".action-tip"); if (tip) { tip.style.visibility = "hidden"; tip.style.opacity = "0"; } } }}
                >
                  <button
                    onClick={isDisabled ? undefined : action.onClick}
                    disabled={isDisabled}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 10px",
                      border: "none",
                      borderRadius: 8,
                      background: "transparent",
                      color: action.disabled ? "#C4CAD4" : action.destructive ? "#DC2626" : TEXT,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      fontSize: 13,
                      textAlign: "left",
                      opacity: loadingAction && loadingAction !== action.key ? 0.6 : 1,
                    }}
                  >
                    <span style={{ width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {loadingAction === action.key ? <Spinner size={14} /> : action.icon}
                    </span>
                    <span style={{ whiteSpace: "nowrap" }}>{loadingAction === action.key ? `${action.label}...` : action.label}</span>
                  </button>
                  {action.disabled && action.tooltip && (
                    <div className="action-tip" style={{ visibility: "hidden", opacity: 0, position: "absolute", right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)", background: "#1F2937", color: WHITE, fontSize: 11, padding: "5px 8px", borderRadius: 6, whiteSpace: "nowrap", pointerEvents: "none", transition: "opacity 0.15s", zIndex: 99999 }}>
                      {action.tooltip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
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
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [colTooltip, setColTooltip] = useState(null);
  const [colTooltipPos, setColTooltipPos] = useState({ x: 0, y: 0 });

  const configMap = useMemo(() => new Map(configs.map((config) => [config.key, config])), [configs]);
  const filters = ["ALL", "RUNNING", "COMPLETED", "DRAFT"];

  const isRunningStatus = (s) => s === "RUNNING" || s === "running";
  const isCompletedStatus = (s) => s === "COMPLETED" || s === "completed";

  const counts = useMemo(() => ({
    ALL: experiments.filter((experiment) => !experiment.archived).length,
    RUNNING: experiments.filter((experiment) => !experiment.archived && isRunningStatus(experiment.status)).length,
    COMPLETED: experiments.filter((experiment) => !experiment.archived && isCompletedStatus(experiment.status)).length,
    DRAFT: experiments.filter((experiment) => !experiment.archived && experiment.status === "DRAFT").length,
  }), [experiments]);

  const visibleExperiments = useMemo(() => {
    const filtered = experiments.filter((experiment) => {
      if (filter === "ALL") return !experiment.archived;
      if (filter === "RUNNING") return !experiment.archived && isRunningStatus(experiment.status);
      if (filter === "COMPLETED") return !experiment.archived && isCompletedStatus(experiment.status);
      return !experiment.archived && experiment.status === filter;
    });

    const sorted = [...filtered].sort((left, right) => {
      const resolveValue = (experiment) => {
        if (sortBy === "config") return experiment.linkedConfigKey || "";
        if (sortBy === "metric") return experiment.metric || "";
        if (sortBy === "createdAt") return experiment.createdAt || "";
        if (sortBy === "updatedAt") return experiment.updatedAt || "";
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
  const activeExperiments = experiments.filter((experiment) => !experiment.archived && experiment.status === "RUNNING");
  const winningVariants = experiments.filter((experiment) => !experiment.archived && typeof experiment.confidence === "number" && experiment.confidence >= 95 && String(experiment.lift).startsWith("+")).length;
  const stats = [
    { label: "Active Experiments", value: activeExperiments.length, tooltip: "Experiments currently running or paused." },
    { label: "Total Users in Tests", value: activeExperiments.reduce((sum, experiment) => sum + experiment.users, 0).toLocaleString(), tooltip: "Total unique users enrolled across all active experiments." },
    { label: "Winning Variants", value: winningVariants, tooltip: "Variants with statistically significant positive uplift." },
  ];

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir(column === "updatedAt" || column === "createdAt" ? "desc" : "asc");
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
            <h1 style={pageTitleStyle}>A/B Tests</h1>
            <p style={pageDescriptionStyle}>Create experiments, test hypotheses, and measure impact on your key metrics.</p>
          </div>
        </div>
        <Button type="primary" onClick={onCreateNew} icon={<PlusIcon />}>
          New Experiment
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {stats.map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: TEXT_MUTED, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {item.label}
              <div style={{ position: "relative", display: "inline-flex", cursor: "default" }} onMouseEnter={(e) => { e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }} onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/><rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/><rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/></svg>
                <div style={{ visibility: "hidden", opacity: 0, position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#111827", color: WHITE, fontSize: 12, fontWeight: 400, padding: "7px 12px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999, transition: "opacity 0.15s, visibility 0.15s", pointerEvents: "none", textTransform: "none", letterSpacing: "normal" }}>
                  {item.tooltip}
                  <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: TEXT }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={filters.map((f) => ({
            value: f,
            label: (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                <span style={{ padding: "0px 5px", borderRadius: 999, background: "rgba(0,0,0,0.08)", fontSize: 10, fontWeight: 600, color: "inherit", lineHeight: "16px", display: "inline-block" }}>
                  {counts[f]}
                </span>
              </span>
            ),
          }))}
        />
      </div>

      {total === 0 ? renderEmptyState() : (
        <>
          <div style={{ ...cardStyle, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: WHITE }}>
                  {[
                    { key: "status", label: "Status" },
                    { key: "name", label: "Experiment Name", tooltip: "Displays the created experiment names with their config keys." },
                    { key: "metric", label: "Goal Metric" },
                    { key: "createdAt", label: "Create Date" },
                    { key: "updatedAt", label: "Last Updated" },
                    { key: "creator", label: "Creator" },
                    { key: "actions", label: "Actions", sortable: false },
                  ].map((column) => (
                    <th key={column.key} style={{ padding: "14px 16px", textAlign: column.key === "actions" ? "center" : "left", fontSize: 12, fontWeight: 600, color: TEXT_MUTED, borderBottom: `1px solid ${BORDER}` }}>
                      {column.label}
                      {column.tooltip && (
                        <span
                          style={{ display: "inline-flex", cursor: "default", verticalAlign: "middle", marginLeft: 4 }}
                          onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setColTooltipPos({ x: r.left + r.width / 2, y: r.top }); setColTooltip(column.tooltip); }}
                          onMouseLeave={() => setColTooltip(null)}
                        >
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/><rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/><rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/></svg>
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedExperiments.map((experiment) => {
                  const linkedConfig = configMap.get(experiment.linkedConfigKey);

                  const actionsByStatus = {
                    RUNNING: [
                      { key: "pause", label: "Mark as Completed", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>, onClick: () => onPause(experiment) },
                      { key: "view", label: "View Report", icon: <ReportIcon />, onClick: () => onOpenReport(experiment) },
                      { key: "clone", label: "Clone", icon: <CopyIcon />, onClick: () => onClone(experiment) },
                      { key: "edit", label: "Edit", icon: <EditIcon />, disabled: true, tooltip: "Running experiments cannot be edited" },
                    ],
                    COMPLETED: [
                      { key: "view", label: "View Report", icon: <ReportIcon />, onClick: () => onOpenReport(experiment) },
                      { key: "clone", label: "Clone", icon: <CopyIcon />, onClick: () => onClone(experiment) },
                    ],
                    DRAFT: [
                      { key: "edit", label: "Edit", icon: <EditIcon />, onClick: () => onOpenEditor(experiment) },
                      { key: "launch", label: "Launch", icon: <PlayIcon />, onClick: () => onLaunch(experiment) },
                      { key: "clone", label: "Clone", icon: <CopyIcon />, onClick: () => onClone(experiment) },
                      { key: "delete", label: "Delete", icon: <TrashIcon />, onClick: () => onDeleteDraft(experiment), destructive: true },
                    ],
                  };

                  const fmtTableDate = (iso) => {
                    if (!iso) return "—";
                    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
                        {linkedConfig ? (
                          <button
                            onClick={(event) => { event.stopPropagation(); onOpenRemoteConfig(linkedConfig.key); }}
                            style={{ border: "none", background: "transparent", padding: "2px 0 0", color: TEXT_MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, cursor: "pointer", display: "block" }}
                          >
                            {linkedConfig.key}
                          </button>
                        ) : (
                          <span style={{ marginTop: 2, display: "block", color: "#DC2626", fontSize: 11 }}>Config removed</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", color: experiment.metric ? TEXT_MUTED : "#D97706", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                        {experiment.metric || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", color: TEXT_MUTED, fontSize: 13 }}>{fmtTableDate(experiment.createdAt)}</td>
                      <td style={{ padding: "14px 16px", color: TEXT_MUTED, fontSize: 13 }}>{fmtTableDate(experiment.updatedAt)}</td>
                      <td style={{ padding: "14px 16px", color: TEXT_MUTED, fontSize: 13 }}>{experiment.createdBy || "—"}</td>
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
      {colTooltip && (
        <div style={{ position: "fixed", left: colTooltipPos.x, top: colTooltipPos.y - 8, transform: "translateX(-50%) translateY(-100%)", background: "#111827", color: "#fff", fontSize: 12, fontWeight: 400, padding: "7px 12px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999, pointerEvents: "none" }}>
          {colTooltip}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
        </div>
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
  triggerBg,
  labelStyle: labelStyleOverride,
  tooltip,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((option) => option.value === selectedValue) || null;
  const filteredOptions = options.filter((option) => (
    option.label.toLowerCase().includes(search.toLowerCase())
    || (option.subLabel || "").toLowerCase().includes(search.toLowerCase())
  ));

  const bg = triggerBg || INPUT_BG;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: labelStyleOverride ? 6 : 8 }}>
        <label style={labelStyleOverride || { display: "block", fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>{label}{required ? <span style={{ color: "#EF4444" }}> *</span> : ""}</label>
        {tooltip && (
          <div style={{ position: "relative", display: "inline-flex", cursor: "default" }}
            onMouseEnter={(e) => { e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }}
            onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/><rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/><rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/></svg>
            <div style={{ visibility: "hidden", opacity: 0, position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#111827", color: WHITE, fontSize: 12, fontWeight: 400, padding: "7px 12px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 9999, transition: "opacity 0.15s", pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
              {tooltip}
              <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
            </div>
          </div>
        )}
      </div>
      <button
        onClick={() => setOpen((current) => !current)}
        type="button"
        style={{
          ...inputStyle,
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          textAlign: "left",
          cursor: "pointer",
          appearance: "none",
          fontFamily: "inherit",
          borderColor: error ? "#EF4444" : BORDER_DARK,
          boxShadow: "none",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOption ? (
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: TEXT, fontWeight: 600 }}>{selectedOption.label}</span>
              {selectedOption.subLabel && <span style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{selectedOption.subLabel}</span>}
            </span>
          ) : (
            <span style={{ color: TEXT_MUTED }}>{placeholder}</span>
          )}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: TEXT_MUTED, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {error && <div style={{ marginTop: 6, fontSize: 12, color: "#EF4444" }}>{error}</div>}

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: WHITE, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, boxShadow: "0px 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: 260, overflowY: "auto" }}>
          {filteredOptions.length > 0 ? filteredOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => { onSelect(option.value); setOpen(false); setSearch(""); }}
              style={{ padding: "10px 14px", fontSize: 13, color: TEXT, background: selectedValue === option.value ? "#F3F4F6" : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", gap: 2 }}
              onMouseEnter={(e) => { if (selectedValue !== option.value) e.currentTarget.style.background = "#F9FAFB"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = selectedValue === option.value ? "#F3F4F6" : "transparent"; }}
            >
              <span style={{ fontWeight: selectedValue === option.value ? 600 : 400 }}>{option.label}</span>
              {option.subLabel && <span style={{ color: TEXT_MUTED, fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{option.subLabel}</span>}
            </div>
          )) : (
            <div style={{ padding: "12px 14px" }}>
              {renderEmpty ? renderEmpty() : <div style={{ fontSize: 13, color: TEXT_MUTED }}>{emptyMessage}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Goal Metric tooltip ───────────────────────────────────────────────────
function GoalMetricInfoTooltip() {
  const [visible, setVisible] = useState(false);
  const tooltipContent = (
    <div style={{ lineHeight: 1.6, whiteSpace: "normal", width: 300 }}>
      The event you want to optimize for. Choose how it's measured:
      <ul style={{ margin: "8px 0 0", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <li><strong>Unique Users:</strong> counts how many distinct users triggered this event at least once.</li>
        <li><strong>Event Count:</strong> counts every time the event was triggered, including repeat occurrences by the same user.</li>
      </ul>
      <div style={{ marginTop: 8 }}>The variant with the highest result wins.</div>
    </div>
  );
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help", color: "#9CA3AF" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/><rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/><rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/></svg>
      {visible && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: "#F9FAFB", fontSize: 12, fontWeight: 400, padding: "10px 13px", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 9999, pointerEvents: "none", minWidth: 300 }}>
          {tooltipContent}
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1F2937" }} />
        </div>
      )}
    </span>
  );
}

// ─── Metric Measurement dropdown ────────────────────────────────────────────
function MetricMeasurementSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const options = [
    { value: "unique_users", label: "Unique Users" },
    { value: "event_count", label: "Event Count" },
  ];
  const selected = options.find((o) => o.value === value) || options[0];
  return (
    <div style={{ position: "relative", width: 160, flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ ...inputStyle, background: WHITE, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textAlign: "left", cursor: "pointer", appearance: "none", fontFamily: "inherit", borderColor: BORDER_DARK, boxShadow: "none", width: "100%" }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: TEXT, fontWeight: 600 }}>{selected.label}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: TEXT_MUTED, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: WHITE, border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, boxShadow: "0px 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{ padding: "10px 14px", fontSize: 13, color: opt.value === value ? "#1D4ED8" : TEXT, fontWeight: opt.value === value ? 600 : 400, background: opt.value === value ? "#EFF6FF" : "transparent", cursor: "pointer" }}
              onMouseEnter={(e) => { if (opt.value !== value) e.currentTarget.style.background = "#F9FAFB"; }}
              onMouseLeave={(e) => { if (opt.value !== value) e.currentTarget.style.background = "transparent"; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateExperiment({
  configs,
  experiments,
  schemas,
  onBack,
  onOpenRemoteConfigCreate,
  onSaveDraft,
  onLaunchExperiment,
  initialExperiment,
}) {
  const isEditing = Boolean(initialExperiment);

  const eligibleConfigs = useMemo(
    () => configs.filter((config) => config.status === "Live" || config.status === "Draft"),
    [configs],
  );

  const buildInitialForm = () => {
    if (!initialExperiment) {
      return { id: null, name: "", linkedConfigKey: "", hypothesis: "", primaryMetric: "", metricMeasurement: "unique_users", variants: [], startDate: null, endDate: null };
    }
    return {
      id: initialExperiment.id,
      name: initialExperiment.name || "",
      linkedConfigKey: initialExperiment.linkedConfigKey || "",
      hypothesis: initialExperiment.hypothesis || "",
      primaryMetric: initialExperiment.metric || initialExperiment.primaryMetric || "",
      metricMeasurement: initialExperiment.metricMeasurement || "unique_users",
      variants: initialExperiment.variants || [],
      startDate: initialExperiment.startDate ? dayjs(initialExperiment.startDate) : null,
      endDate: initialExperiment.endDate ? dayjs(initialExperiment.endDate) : null,
    };
  };

  const [form, setForm] = useState(buildInitialForm);
  const [errors, setErrors] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [launchLoading, setLaunchLoading] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [draftConfigWarningOpen, setDraftConfigWarningOpen] = useState(false);
  const [runningConflict, setRunningConflict] = useState(null);
  const [browseSchemasOpen, setBrowseSchemasOpen] = useState(false);
  const [rolloutPct, setRolloutPct] = useState(initialExperiment?.rolloutPct ?? 100);
  const [variantExpanded, setVariantExpanded] = useState({});
  const [filterRules, setFilterRules] = useState(initialExperiment?.filterRules || []);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(buildInitialForm()));
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
    Modal.confirm({
      title: "Unsaved changes",
      content: "You have unsaved changes. Are you sure you want to leave?",
      okText: "Leave",
      cancelText: "Stay",
      okButtonProps: { danger: true },
      onOk: () => onBack(),
    });
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

    if (launchMode && !form.primaryMetric) {
      nextErrors.primaryMetric = "A goal metric is required to launch an experiment.";
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

    setSummaryModalOpen(true);
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

  const BASE_USERS = 46842;
  const rolloutUsers = Math.round(BASE_USERS * (rolloutPct / 100));
  const toggleVariant = (id) => setVariantExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ paddingBottom: 88 }}>
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
      {/* ── Experiment Summary Modal ── */}
      <Modal
        open={summaryModalOpen}
        title={<span style={{ fontSize: 17, fontWeight: 700 }}>Experiment Summary</span>}
        onCancel={() => setSummaryModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setSummaryModalOpen(false)}>Cancel</Button>,
          <Button key="launch" type="primary" loading={launchLoading} onClick={() => submitLaunch(selectedConfig?.status === "Draft")}>
            Confirm & Launch
          </Button>,
        ]}
        width={520}
        styles={{ content: { background: WHITE }, header: { background: WHITE } }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8 }}>
          {[
            { label: "Experiment Name", value: form.name || "—" },
            { label: "Linked Config", value: form.linkedConfigKey || "—" },
            { label: "Goal Metric", value: form.primaryMetric || "—" },
            { label: "Target Audience", value: filterRules.length === 0 ? "No filters (All users)" : `${filterRules.length} filter rule${filterRules.length > 1 ? "s" : ""}` },
            { label: "Rollout", value: `${rolloutPct}%` },
            { label: "Start Date", value: form.startDate ? form.startDate.format("MMM D, YYYY HH:mm") : "Not set (starts immediately)" },
            { label: "End Date", value: form.endDate ? form.endDate.format("MMM D, YYYY HH:mm") : "Not set (runs until deactivated)" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ minWidth: 130, fontSize: 13, color: TEXT_MUTED, fontWeight: 500, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 13, color: TEXT, fontWeight: 600, wordBreak: "break-all" }}>{value}</span>
            </div>
          ))}
          {form.variants.length > 0 && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ minWidth: 130, fontSize: 13, color: TEXT_MUTED, fontWeight: 500, flexShrink: 0 }}>Variants</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {form.variants.map((v) => (
                  <span key={v.id} style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{v.name} — {v.traffic}%</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {browseSchemasOpen && schemas && (
        <BrowseSchemasModal schemas={schemas} onClose={() => setBrowseSchemasOpen(false)} onUseSchema={() => setBrowseSchemasOpen(false)} />
      )}

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 5, height: 52, borderRadius: 999, background: "#3B82F6", marginTop: 2, flexShrink: 0 }} />
        <div>
          <h1 style={pageTitleStyle}>{isEditing ? "Edit Experiment" : "New Experiment"}</h1>
          <p style={pageDescriptionStyle}>{isEditing ? "Update your experiment settings. Only draft experiments can be edited." : "Define your experiment name, pick a remote config and launch an experiment."}</p>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Experiment Details */}
          <div style={{ ...cardStyle, padding: 24 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: TEXT }}>Experiment Details</h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: TEXT_MUTED }}>Set the name, linked configuration, goal metric and experiment duration.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Name */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Experiment Name <span style={{ color: "#EF4444" }}>*</span></label>
                  <FieldTooltip text="A unique name to identify this experiment. Used for display purposes only." />
                </div>
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Homepage hero message test"
                  style={{ ...inputStyle, background: WHITE, boxShadow: "none", borderColor: errors.name ? "#EF4444" : BORDER_DARK }}
                />
                {errors.name && <div style={{ marginTop: 5, fontSize: 12, color: "#EF4444" }}>{errors.name}</div>}
              </div>

              {/* Linked Config */}
              <div>
                <SearchableSelect
                  label="Linked Remote Config"
                  required={false}
                  placeholder="Select a remote configuration"
                  options={eligibleConfigs.map((c) => ({ value: c.key, label: c.name, subLabel: c.key }))}
                  selectedValue={form.linkedConfigKey}
                  onSelect={syncVariantsForConfig}
                  error={errors.linkedConfigKey}
                  emptyMessage="No configurations available."
                  triggerBg={WHITE}
                  labelStyle={{ fontSize: 13, fontWeight: 600, color: TEXT }}
                  tooltip="The remote configuration key this experiment will test. Variants override its parameter values."
                  renderEmpty={() => (
                    <div>
                      <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 10 }}>No configurations available. Create one first.</div>
                      <Button size="small" onClick={onOpenRemoteConfigCreate}>Create Remote Configuration</Button>
                    </div>
                  )}
                />
                {selectedConfig && (
                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, background: SOFT, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{selectedConfig.name}</div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", marginTop: 2 }}>{selectedConfig.key}</div>
                    </div>
                    <ConfigStatusBadge status={selectedConfig.status} />
                  </div>
                )}
              </div>

              {/* Goal Metric */}
              <div>
                {/* Label + tooltip */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Goal Metric <span style={{ color: "#EF4444" }}>*</span></span>
                  <GoalMetricInfoTooltip />
                </div>
                {errors.primaryMetric && <div style={{ marginBottom: 6, fontSize: 12, color: "#EF4444" }}>{errors.primaryMetric}</div>}
                {/* Two dropdowns inline */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Tracked event dropdown — reuse SearchableSelect without label */}
                  <div style={{ flex: 1 }}>
                    <SearchableSelect
                      placeholder="Select a tracked event"
                      options={mockEvents.map((e) => ({ value: e.id, label: e.name }))}
                      selectedValue={form.primaryMetric}
                      onSelect={(v) => setField("primaryMetric", v)}
                      emptyMessage="No events available."
                      triggerBg={WHITE}
                    />
                  </div>
                  <span style={{ fontSize: 13, color: TEXT_MUTED, whiteSpace: "nowrap", flexShrink: 0 }}>measured as</span>
                  {/* Measurement type dropdown */}
                  <MetricMeasurementSelect
                    value={form.metricMeasurement}
                    onChange={(v) => setField("metricMeasurement", v)}
                  />
                </div>
              </div>

              {/* Experiment Duration */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Experiment Duration</span>
                </div>
                <p style={{ margin: "0 0 14px", fontSize: 13, color: TEXT_MUTED }}>
                  Select the start and end date range for your experiment. If you do not select date range, your experiment will run until deactivated
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <DatePicker
                    showTime
                    placeholder="Start Date"
                    value={form.startDate}
                    onChange={(date) => setField("startDate", date)}
                    style={{ width: "100%", borderRadius: 8, height: 46 }}
                    format="MMM D, YYYY HH:mm"
                  />
                  <DatePicker
                    showTime
                    placeholder="End Date"
                    value={form.endDate}
                    onChange={(date) => setField("endDate", date)}
                    style={{ width: "100%", borderRadius: 8, height: 46 }}
                    format="MMM D, YYYY HH:mm"
                    disabledDate={(current) => form.startDate ? current && current < form.startDate.startOf("day") : false}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <div style={{ ...cardStyle, padding: 24 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: TEXT }}>Target Audience</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: TEXT_MUTED }}>Only users in these segments are eligible for this configuration.</p>

            {filterRules.length === 0 ? (
              <div style={{ padding: "28px 20px", border: "1.5px dashed #D1D5DB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAFA", marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: TEXT_MUTED, fontWeight: 500 }}>Add a Filter Rule or Filter Group to start segmenting your users.</span>
              </div>
            ) : (
              <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {filterRules.map((rule, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, background: WHITE }}>
                    <span style={{ flex: 1, fontSize: 13, color: TEXT }}>{rule}</span>
                    <Button size="small" type="text" danger onClick={() => setFilterRules((prev) => prev.filter((_, j) => j !== i))}>✕</Button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={() => setFilterRules((prev) => [...prev, "user.segment = All Users"])}>Add Filter Rule</Button>
              <Button onClick={() => setFilterRules((prev) => [...prev, "Group: Premium Users"])}>Add Filter Group</Button>
            </div>
          </div>

          {/* Rollout Percentage + A/B Variants */}
          <div style={{ ...cardStyle, padding: 24 }}>
            {/* Rollout % */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT }}>Rollout Percentage</h3>
                <div style={{ position: "relative", display: "inline-flex", cursor: "default" }}
                  onMouseEnter={(e) => { e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }}
                  onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}
                >
                  <svg width="15" height="15" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/><rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/><rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/></svg>
                  <div style={{ visibility: "hidden", opacity: 0, position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#111827", color: WHITE, fontSize: 12, padding: "7px 12px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 9999, transition: "opacity 0.15s", pointerEvents: "none" }}>
                    Percentage of eligible users who will receive this experiment.
                    <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
                  </div>
                </div>
              </div>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: TEXT_MUTED }}>Controls what percentage of eligible users will receive this configuration.</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, minWidth: 58 }}>Rollout:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={rolloutPct}
                  onChange={(e) => setRolloutPct(Math.max(1, Math.min(100, Number(e.target.value))))}
                  style={{ width: 72, padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 6, textAlign: "center", fontSize: 14, fontWeight: 700, color: TEXT, background: WHITE, outline: "none" }}
                />
                <span style={{ fontSize: 13, color: TEXT_MUTED }}>%</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${BORDER}`, margin: "0 -24px 24px", paddingTop: 24, paddingLeft: 24, paddingRight: 24 }}>
              {/* A/B Variants header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: TEXT }}>A/B Testing Variants</h3>
                  <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED }}>Override parameter values per variant within rollout traffic.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: trafficTotal === 100 ? "#16A34A" : "#B91C1C" }}>Total: {trafficTotal}%</span>
                  <Button
                    size="small"
                    onClick={addVariant}
                    disabled={form.variants.length >= 4 || !selectedConfig}
                  >
                    + Add Variant
                  </Button>
                </div>
              </div>

              {errors.traffic && <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", color: "#B91C1C", fontSize: 12, fontWeight: 500 }}>{errors.traffic}</div>}

              {!selectedConfig ? (
                <div style={{ padding: "20px", border: "1.5px dashed #D1D5DB", borderRadius: 10, textAlign: "center", color: TEXT_MUTED, fontSize: 13 }}>
                  Select a linked remote config above to configure variants.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {form.variants.map((variant, variantIndex) => {
                    const isExpanded = !!variantExpanded[variant.id];
                    const isControl = variant.locked;
                    return (
                      <div key={variant.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", background: WHITE }}>
                        {/* Variant header row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: isControl ? "#FAFBFF" : WHITE }}>
                          <input
                            value={variant.name}
                            onChange={(e) => updateVariant(variant.id, (cur) => ({ ...cur, name: e.target.value }))}
                            disabled={isControl}
                            style={{ flex: "0 0 180px", padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 13, color: TEXT, background: isControl ? "#F3F4F6" : WHITE, outline: "none" }}
                          />
                          <span style={{ padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", background: isControl ? "#EFF6FF" : "#F0FDF4", color: isControl ? "#1D4ED8" : "#15803D", border: `1px solid ${isControl ? "#BFDBFE" : "#BBF7D0"}`, whiteSpace: "nowrap" }}>
                            {isControl ? "CONTROL GROUP" : "VARIANT"}
                          </span>
                          <div style={{ flex: 1 }} />
                          <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>Traffic %</span>
                          <input
                            type="number"
                            min={variantIndex === 0 ? 1 : 0}
                            max={100}
                            value={variant.traffic}
                            onChange={(e) => updateVariant(variant.id, (cur) => ({ ...cur, traffic: Number(e.target.value) }))}
                            style={{ width: 72, padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 6, textAlign: "center", fontSize: 14, fontWeight: 700, color: TEXT, background: WHITE, outline: "none" }}
                          />
                          {variant.removable ? (
                            <Button
                              size="small"
                              type="text"
                              danger
                              icon={<TrashIcon />}
                              onClick={() => removeVariant(variant.id)}
                            />
                          ) : <div style={{ width: 24 }} />}
                          <button
                            type="button"
                            onClick={() => toggleVariant(variant.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 4, display: "flex", alignItems: "center" }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>

                        {/* Expanded parameter section */}
                        {isExpanded && variant.parameters.length > 0 && (
                          <div style={{ borderTop: `1px solid ${BORDER}`, padding: 14, background: SOFT }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                              {variant.parameters.map((parameter) => (
                                <div key={parameter.id} style={{ padding: 12, borderRadius: 8, border: `1px solid ${BORDER}`, background: WHITE }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, marginBottom: 4 }}>{parameter.key}</div>
                                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>{parameter.type}</div>
                                  {parameter.type === "Boolean" ? (
                                    <div style={{ position: "relative" }}>
                                      <select
                                        value={String(parameter.value === true || parameter.value === "true")}
                                        disabled={isControl}
                                        onChange={(e) => updateVariantParameter(variant.id, parameter.id, (cur) => ({ ...cur, value: e.target.value === "true" }))}
                                        style={{ ...inputStyle, background: isControl ? "#F3F4F6" : WHITE, appearance: "none", paddingRight: 36, cursor: isControl ? "default" : "pointer" }}
                                      >
                                        <option value="true">True</option>
                                        <option value="false">False</option>
                                      </select>
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: TEXT_MUTED, pointerEvents: "none" }}>
                                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                  ) : parameter.type === "JSON" ? (
                                    <textarea
                                      rows={3}
                                      value={String(parameter.value)}
                                      disabled={isControl}
                                      onChange={(e) => updateVariantParameter(variant.id, parameter.id, (cur) => ({ ...cur, value: e.target.value }))}
                                      style={{ ...inputStyle, resize: "vertical", background: isControl ? "#F3F4F6" : WHITE, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11 }}
                                    />
                                  ) : (
                                    <input
                                      type={parameter.type === "Integer" || parameter.type === "Number" ? "number" : "text"}
                                      value={parameter.value}
                                      disabled={isControl}
                                      onChange={(e) => updateVariantParameter(variant.id, parameter.id, (cur) => ({ ...cur, value: e.target.value }))}
                                      style={{ ...inputStyle, background: isControl ? "#F3F4F6" : WHITE, fontSize: 13 }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isExpanded && variant.parameters.length === 0 && (
                          <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px", background: SOFT, color: TEXT_MUTED, fontSize: 13, textAlign: "center" }}>
                            No parameters defined for this variant.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN — Summary ── */}
        <div style={{ position: "sticky", top: 24 }}>
          <div style={{ ...cardStyle, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: TEXT }}>Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Segments */}
              <div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 3 }}>Segments:</div>
                <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>
                  {filterRules.length === 0 ? "No filters" : `${filterRules.length} filter${filterRules.length > 1 ? "s" : ""} applied`}
                </div>
              </div>
              {/* Users */}
              <div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 3 }}>Number of Users:</div>
                <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{rolloutUsers.toLocaleString()}</div>
              </div>
              {/* Rollout */}
              <div>
                <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 3 }}>Rollout:</div>
                <div style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{rolloutPct}%</div>
              </div>

              {form.variants.length > 0 && (
                <>
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Variants:</div>
                    {form.variants.map((v) => {
                      const variantUsers = Math.round(rolloutUsers * (v.traffic / 100));
                      return (
                        <div key={v.id} style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 4 }}>
                          {v.name} — {v.traffic}% ({variantUsers.toLocaleString()} users)
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {form.primaryMetric && (
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 6 }}>Goal Metric:</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {form.primaryMetric}
                  </div>
                </div>
              )}

              {(form.startDate || form.endDate) && (
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 6 }}>Duration:</div>
                  {form.startDate && <div style={{ fontSize: 12, color: TEXT_MUTED }}>Start: {form.startDate.format("MMM D, YYYY HH:mm")}</div>}
                  {form.endDate && <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>End: {form.endDate.format("MMM D, YYYY HH:mm")}</div>}
                </div>
              )}

              {form.name && (
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 4 }}>Experiment:</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>{form.name}</div>
                  {form.linkedConfigKey && (
                    <div style={{ marginTop: 4, fontSize: 11, color: TEXT_MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{form.linkedConfigKey}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Fixed footer ── */}
      <div style={{ position: "fixed", bottom: 0, left: 222, right: 0, padding: "14px 28px", background: WHITE, borderTop: "2px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 40 }}>
        <Button
          onClick={showBackConfirmation}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>}
        >
          Back
        </Button>
        <div style={{ display: "flex", gap: 10 }}>
          <Button onClick={handleSaveDraft} loading={saveLoading} disabled={saveLoading}>
            Save as Draft
          </Button>
          <Button type="primary" onClick={handleLaunchClick} loading={launchLoading} disabled={launchLoading}>
            Launch Experiment
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Field tooltip helper ────────────────────────────────────────────────────
function FieldTooltip({ text }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", cursor: "default" }}
      onMouseEnter={(e) => { e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }}
      onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}
    >
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/><rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/><rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/></svg>
      <div style={{ visibility: "hidden", opacity: 0, position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#111827", color: "#FFFFFF", fontSize: 12, fontWeight: 400, padding: "7px 12px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 9999, transition: "opacity 0.15s", pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        {text}
        <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
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
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width={460}
      title={<AntTitle level={4} style={{ margin: 0 }}>Stop experiment?</AntTitle>}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button
          key="stop"
          type="primary"
          danger
          icon={<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="1.5"/></svg>}
          onClick={onConfirm}
        >
          Stop Experiment
        </Button>,
      ]}
    >
      <AntParagraph style={{ marginBottom: 12 }}>
        You are about to permanently stop <AntText strong>"{experimentName}"</AntText>. This will halt all data collection and cannot be undone. The experiment will be marked as stopped.
      </AntParagraph>
      <Alert
        type="error"
        showIcon
        message="This action is irreversible. Stopped experiments cannot be restarted."
      />
    </Modal>
  );
}

// ─── Apply Winner Modal ───────────────────────────────────────────────────────
function ApplyWinnerModal({ open, experiment, onCancel, onConfirm }) {
  const configKey = experiment?.linkedConfigMeta?.key || experiment?.linkedConfigKey || "—";
  const winnerValue = experiment?.linkedConfigMeta?.variantBValue;
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width={480}
      title={<AntTitle level={4} style={{ margin: 0 }}>Apply Variant B as the winner?</AntTitle>}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button
          key="apply"
          type="primary"
          icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7.5L5.5 11L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          style={{ background: "#3B82F6", borderColor: "#3B82F6" }}
          onClick={onConfirm}
        >
          Apply &amp; Roll Out
        </Button>,
      ]}
    >
      <AntParagraph style={{ marginBottom: 12 }}>
        This will update the Remote Config key <CodePill>{configKey}</CodePill> to the winning variant's value (<CodePill>{String(winnerValue)}</CodePill>) for 100% of users. This action can be reversed from the Remote Config settings.
      </AntParagraph>
      <Alert
        type="warning"
        showIcon
        message="This will override your current Remote Config live value."
      />
    </Modal>
  );
}

function ExperimentDetail({ experiment, onBack, onOpenRemoteConfig, linkedConfig }) {
  const [applyWinnerOpen, setApplyWinnerOpen] = useState(false);
  const [stopConfirmOpen, setStopConfirmOpen] = useState(false);
  const [expandedVariants, setExpandedVariants] = useState({});
  const [activeDateFilter, setActiveDateFilter] = useState("30D");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [chartTooltip, setChartTooltip] = useState(null);
  const [vttOpen, setVttOpen] = useState(null);
  const [vttPos, setVttPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const trafficSplit = experiment.trafficSplit || { control: 50, variant_b: 50 };
  const totalUsers = experiment.totalUsers || experiment.users || 0;
  const expVariants = experiment.variants || [];
  const controlVariant = expVariants.find((v) => v.id === "control") || {
    id: "control", label: "Control", conversionRate: 0.032,
    users: Math.round(totalUsers * (trafficSplit.control / 100)),
    conversions: Math.round(totalUsers * (trafficSplit.control / 100) * 0.032),
  };
  const variantB = expVariants.find((v) => v.id === "variant_b") || null;
  const baselineRate = controlVariant.conversionRate * 100;
  const liftValue = experiment.lift === "—" ? 0 : Number(String(experiment.lift).replace("+", "").replace("%", ""));
  const variantBRate = Number((variantB ? variantB.conversionRate * 100 : baselineRate * (1 + liftValue / 100)).toFixed(2));
  const variantBUsers = variantB ? variantB.users : Math.round(totalUsers * (trafficSplit.variant_b / 100));
  const variantBConversions = variantB ? variantB.conversions : Math.round(variantBUsers * variantBRate / 100);
  const controlUsersCount = controlVariant.users;
  const controlConversionsCount = controlVariant.conversions || Math.round(controlUsersCount * baselineRate / 100);
  const upliftPct = baselineRate > 0 ? ((variantBRate - baselineRate) / baselineRate * 100) : 0;
  const upliftDisplay = experiment.lift !== "—" ? `${upliftPct >= 0 ? "+" : ""}${upliftPct.toFixed(2)}%` : "—";

  const goalMetric = experiment.goalMetric || {
    key: experiment.metric || "—",
    label: experiment.metric ? experiment.metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—",
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const startLabel = fmtDate(experiment.startDate);
  const endLabel = fmtDate(experiment.endDate);
  const durationLabel = experiment.durationDays ? `${experiment.durationDays} days` : "—";

  // Chart data
  const chartData = useMemo(() => {
    let numDays = 30;
    if (activeDateFilter === "Today") numDays = 1;
    else if (activeDateFilter === "Yesterday") numDays = 2;
    else if (activeDateFilter === "7D") numDays = 7;
    else if (activeDateFilter === "30D") numDays = 30;
    else if (activeDateFilter === "3M") numDays = 90;
    else if (activeDateFilter === "6M") numDays = 180;
    else if (activeDateFilter === "12M") numDays = 365;
    const endDate = experiment.endDate ? new Date(experiment.endDate) : new Date();
    const rangeStart = experiment.startDate
      ? new Date(Math.max(new Date(experiment.startDate).getTime(), endDate.getTime() - (numDays - 1) * 86400000))
      : new Date(endDate.getTime() - (numDays - 1) * 86400000);
    const days = Math.max(2, Math.round((endDate - rangeStart) / 86400000) + 1);
    const vPerDay = variantBUsers / days;
    const cPerDay = controlUsersCount / days;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(rangeStart.getTime() + i * 86400000);
      const noise = 0.92 + Math.sin(i * 2.1 + 1.3) * 0.08;
      return {
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        variantUsers: Math.max(0, Math.round(vPerDay * noise)),
        controlUsers: Math.max(0, Math.round(cPerDay * noise)),
      };
    });
  }, [experiment, activeDateFilter, variantBUsers, controlUsersCount]);

  // SVG chart constants
  const CW = 800, CH = 220;
  const PAD = { top: 16, right: 20, bottom: 36, left: 56 };
  const IW = CW - PAD.left - PAD.right;
  const IH = CH - PAD.top - PAD.bottom;
  const maxV = Math.max(...chartData.map((d) => d.variantUsers), 1);
  const yMax = Math.ceil(maxV * 1.25 / 5000) * 5000 || 100000;
  const xs = (i) => chartData.length > 1 ? (i / (chartData.length - 1)) * IW : IW / 2;
  const ys = (v) => IH - (v / yMax) * IH;
  const makePath = (fn) => chartData.map((d, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(fn(d)).toFixed(1)}`).join(" ");
  const vPath = makePath((d) => d.variantUsers);
  const cPath = makePath((d) => d.controlUsers);
  const vFill = chartData.length > 1 ? `${vPath} L${xs(chartData.length - 1).toFixed(1)},${IH} L0,${IH} Z` : "";
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ v: Math.round(yMax * t), y: ys(yMax * t) }));
  const fmtY = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);
  const maxXLabels = 6;
  const xTickStep = Math.max(1, Math.ceil(chartData.length / maxXLabels));
  const xTicks = chartData.reduce((acc, d, i) => {
    if (i === 0 || i % xTickStep === 0) acc.push({ i, label: d.label });
    return acc;
  }, []);

  const handleSvgMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * CW - PAD.left;
    const idx = Math.max(0, Math.min(chartData.length - 1, Math.round((rawX / IW) * (chartData.length - 1))));
    setChartTooltip({ idx, clientX: e.clientX, clientY: e.clientY });
  };

  const dateFilterBtns = ["Today", "Yesterday", "7D", "30D", "3M", "6M", "12M"];
  const filterBtnStyle = (active) => ({
    padding: "7px 12px", borderRadius: 8, border: `1px solid ${active ? "#3B82F6" : BORDER}`,
    background: active ? "#3B82F6" : WHITE, color: active ? WHITE : TEXT,
    fontSize: 12, fontWeight: 500, cursor: "pointer",
  });

  const variantRows = [
    {
      id: "variant_b", label: `Variant B (${trafficSplit.variant_b ?? 50}%)`,
      badgeLabel: "Variant", badgeBg: "#EFF6FF", badgeColor: "#1D4ED8", badgeBorder: "#BFDBFE",
      users: variantBUsers, conversions: variantBConversions, rate: variantBRate,
      uplift: upliftDisplay, upliftColor: upliftPct > 0 ? "#16A34A" : upliftPct < 0 ? "#DC2626" : TEXT_MUTED,
    },
    {
      id: "control", label: `Control Group (${trafficSplit.control ?? 50}%)`,
      badgeLabel: "Control", badgeBg: "#F3F4F6", badgeColor: "#374151", badgeBorder: "#D1D5DB",
      users: controlUsersCount, conversions: controlConversionsCount, rate: baselineRate,
      uplift: "—", upliftColor: TEXT_MUTED,
    },
  ];

  const isEventCount = experiment.metricMeasurement === "event_count";
  const vtCols = [
    {
      key: "users",
      label: "Users",
      tooltip: "Total number of unique users who were exposed to this variant during the experiment period.",
    },
    {
      key: "conversions",
      label: "Conversions",
      tooltip: isEventCount
        ? "Total number of times the goal metric was triggered by users in this variant, including repeated occurrences from the same user."
        : "Number of distinct users who triggered the goal metric at least once after being exposed to this variant.",
    },
    {
      key: "rate",
      label: isEventCount ? "Avg. Events / User" : "Conversion Rate",
      tooltip: isEventCount
        ? "Average number of goal metric occurrences per exposed user. Formula: Total events ÷ Users"
        : "Percentage of exposed users who triggered the goal metric at least once. Formula: Conversions ÷ Users × 100",
    },
    {
      key: "uplift",
      label: "Uplift",
      tooltip: isEventCount
        ? "How much this variant's average events per user differs from the Control group, expressed as a relative percentage. Formula: (Variant avg − Control avg) ÷ Control avg × 100"
        : "How much this variant's conversion rate differs from the Control group, expressed as a relative percentage. Negative means the variant underperformed. Formula: (Variant rate − Control rate) ÷ Control rate × 100",
    },
  ];

  return (
    <div style={{ paddingBottom: 80 }}>
      <ApplyWinnerModal open={applyWinnerOpen} experiment={experiment} onCancel={() => setApplyWinnerOpen(false)}
        onConfirm={() => { console.log(`Winner applied`); setApplyWinnerOpen(false); }}
      />
      <StopExperimentModal open={stopConfirmOpen} experimentName={experiment.name} onCancel={() => setStopConfirmOpen(false)}
        onConfirm={() => { console.log("Experiment stopped:", experiment.id); setStopConfirmOpen(false); }}
      />

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 5, height: 52, borderRadius: 999, background: "#3B82F6", marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={pageTitleStyle}>{experiment.name}</h1>
            <StatusBadge status={experiment.status} />
          </div>
          {experiment.createdBy && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6B7280" }}>Created by: {experiment.createdBy}</p>
          )}
        </div>
      </div>

      {/* ── Date filter ── */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <Button
          type={activeDateFilter === "Custom" ? "primary" : "default"}
          size="small"
          onClick={() => setActiveDateFilter("Custom")}
          style={{ borderRadius: 8, fontSize: 12, fontWeight: 500, height: 34, padding: "0 12px" }}
        >Custom</Button>
        {activeDateFilter === "Custom" && (
          <DatePicker.RangePicker
            size="small"
            value={[customStart ? dayjs(customStart) : null, customEnd ? dayjs(customEnd) : null]}
            onChange={(dates) => {
              setCustomStart(dates?.[0]?.format("YYYY-MM-DD") || "");
              setCustomEnd(dates?.[1]?.format("YYYY-MM-DD") || "");
            }}
            style={{ borderRadius: 8, height: 34, fontSize: 12 }}
          />
        )}
        {dateFilterBtns.map((f) => (
          <button key={f} onClick={() => setActiveDateFilter(f)} style={filterBtnStyle(activeDateFilter === f)}>{f}</button>
        ))}
      </div>

      {/* ══ Results content ══ */}
      <>
          {/* 4 stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Users Exposed", value: totalUsers.toLocaleString(), sub: "Across all variants", tooltip: "Total number of unique users enrolled across all experiment variants." },
              { label: "Goal Metric", value: goalMetric.label, isMetric: true, tooltip: "The primary event metric used to evaluate performance between variants." },
              { label: "Control Rate", value: `${baselineRate.toFixed(2)}%`, sub: "Baseline conversion rate", tooltip: "Baseline conversion rate of the control group during the experiment." },
              { label: "Uplift", value: experiment.lift !== "—" ? `${upliftPct >= 0 ? "+" : ""}${upliftPct.toFixed(1)}%` : "—", valueColor: upliftPct > 0 ? "#16A34A" : upliftPct < 0 ? "#DC2626" : TEXT, sub: experiment.lift !== "—" ? "vs control group" : null, isUplift: true, tooltip: "Relative change in conversion rate between the leading variant and control group." },
            ].map((card) => (
              <div key={card.label} style={{ ...cardStyle, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#4B5563", letterSpacing: "0.04em", marginBottom: 6 }}>
                  {card.label}
                  <div style={{ position: "relative", display: "inline-flex", cursor: "default" }}
                    onMouseEnter={(e) => { e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }}
                    onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <circle cx="7" cy="7" r="6.5" stroke="#D1D5DB" />
                      <rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF" />
                      <rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF" />
                    </svg>
                    <div style={{ visibility: "hidden", opacity: 0, position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#111827", color: WHITE, fontSize: 12, fontWeight: 400, padding: "7px 12px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999, transition: "opacity 0.15s, visibility 0.15s", pointerEvents: "none", textTransform: "none", letterSpacing: "normal" }}>
                      {card.tooltip}
                      <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 21, fontWeight: 700, color: card.valueColor || TEXT, lineHeight: 1.2 }}>{card.value}</div>
                {card.sub && <div style={{ marginTop: 4, fontSize: 11, color: "#4B5563" }}>{card.sub}</div>}
                {card.isMetric && goalMetric.key !== "—" && (
                  <div style={{ marginTop: 5 }}><CodePill>{goalMetric.key}</CodePill></div>
                )}
              </div>
            ))}
          </div>

          {/* User exposure over time line chart */}
          <div style={{ ...cardStyle, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: TEXT }}>User Exposure Over Time</h3>
                {chartData.length > 0 && (
                  <div style={{ fontSize: 12, color: "#6B7280" }}>{chartData[0].label} – {chartData[chartData.length - 1].label}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[{ label: "Variant A", color: "#3B82F6" }, { label: "Control group", color: "#10B981" }].map(({ label, color }) => (
                  <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: TEXT }}>
                    <span style={{ display: "inline-block", width: 20, height: 2, background: color, borderRadius: 1 }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <svg ref={svgRef} viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
              onMouseMove={handleSvgMove} onMouseLeave={() => setChartTooltip(null)}
            >
              <g transform={`translate(${PAD.left},${PAD.top})`}>
                {yTicks.map(({ v, y }) => (
                  <g key={v}>
                    <line x1={0} y1={y} x2={IW} y2={y} stroke="#F3F4F6" strokeWidth={1} />
                    <text x={-8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#9CA3AF">{fmtY(v)}</text>
                  </g>
                ))}
                {chartData.length > 1 && <path d={vFill} fill="#3B82F6" fillOpacity={0.08} />}
                {chartData.length > 1 && <path d={vPath} fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinejoin="round" />}
                {chartData.length > 1 && <path d={cPath} fill="none" stroke="#10B981" strokeWidth={2} strokeLinejoin="round" />}
                {xTicks.map(({ i, label }) => (
                  <text key={i} x={xs(i)} y={IH + 20} textAnchor="middle" fontSize={10} fill="#9CA3AF">{label}</text>
                ))}
                {chartTooltip !== null && chartData[chartTooltip.idx] && (
                  <g>
                    <line x1={xs(chartTooltip.idx)} y1={0} x2={xs(chartTooltip.idx)} y2={IH} stroke="#374151" strokeWidth={1} strokeDasharray="3,3" />
                    <circle cx={xs(chartTooltip.idx)} cy={ys(chartData[chartTooltip.idx].variantUsers)} r={4} fill="#3B82F6" stroke={WHITE} strokeWidth={1.5} />
                    <circle cx={xs(chartTooltip.idx)} cy={ys(chartData[chartTooltip.idx].controlUsers)} r={4} fill="#10B981" stroke={WHITE} strokeWidth={1.5} />
                  </g>
                )}
                <rect x={0} y={0} width={IW} height={IH} fill="transparent" style={{ cursor: "crosshair" }} />
              </g>
            </svg>
          </div>

          {/* Chart hover tooltip */}
          {chartTooltip !== null && chartData[chartTooltip.idx] && (
            <div style={{ position: "fixed", left: chartTooltip.clientX + 16, top: chartTooltip.clientY - 70, background: "#1F2937", color: WHITE, padding: "10px 14px", borderRadius: 10, fontSize: 12, zIndex: 9999, pointerEvents: "none", minWidth: 180, boxShadow: "0 6px 20px rgba(0,0,0,0.25)", lineHeight: 1.8 }}>
              <div style={{ fontWeight: 600, marginBottom: 5, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 5 }}>{chartData[chartTooltip.idx].label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6", flexShrink: 0 }} />
                Variant A: <b>{chartData[chartTooltip.idx].variantUsers.toLocaleString()}</b>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", flexShrink: 0 }} />
                Control group: <b>{chartData[chartTooltip.idx].controlUsers.toLocaleString()}</b>
              </div>
            </div>
          )}

          {/* Variant breakdown table */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: TEXT }}>Variant Breakdown</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "32%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>Variations</th>
                  {vtCols.map((col) => (
                    <th key={col.key} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.05em", textTransform: "uppercase", borderBottom: `1px solid ${BORDER}` }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {col.label}
                        <span style={{ display: "inline-flex", cursor: "default" }}
                          onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setVttPos({ x: r.left + r.width / 2, y: r.top }); setVttOpen(col.tooltip); }}
                          onMouseLeave={() => setVttOpen(null)}
                        >
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6.5" stroke="#D1D5DB"/><rect x="6.5" y="6" width="1" height="4.5" rx="0.5" fill="#9CA3AF"/><rect x="6.5" y="3.5" width="1" height="1.3" rx="0.5" fill="#9CA3AF"/></svg>
                        </span>
                      </span>
                    </th>
                  ))}
                  <th style={{ borderBottom: `1px solid ${BORDER}` }} />
                </tr>
              </thead>
              <tbody>
                {variantRows.map((row, idx) => {
                  const isExpanded = Boolean(expandedVariants[row.id]);
                  const variantData = expVariants.find((v) => v.id === row.id);
                  // Support both structures: parameterOverrides {key:val} (mock data)
                  // and parameters [{key, value}] (saved from CreateExperiment)
                  const overrides = variantData?.parameterOverrides
                    || Object.fromEntries((variantData?.parameters || []).map((p) => [p.key, p.value]));
                  const schemaParams = linkedConfig?.parameters || [];
                  const hasParams = schemaParams.length > 0;
                  const isLast = idx === variantRows.length - 1;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => hasParams && setExpandedVariants((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                        style={{ borderBottom: isExpanded ? "none" : isLast ? "none" : `1px solid ${BORDER}`, cursor: hasParams ? "pointer" : "default", background: isExpanded ? "#F9FAFB" : "transparent", transition: "background 0.15s" }}
                        onMouseEnter={(e) => { if (hasParams && !isExpanded) e.currentTarget.style.background = "#F9FAFB"; }}
                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "14px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: row.badgeBg, color: row.badgeColor, border: `1px solid ${row.badgeBorder}`, flexShrink: 0 }}>{row.badgeLabel}</span>
                            <span style={{ fontWeight: 500, color: TEXT }}>{row.label}</span>
                          </div>
                        </td>
                        <td style={{ padding: "14px 14px", color: TEXT }}>{row.users.toLocaleString()}</td>
                        <td style={{ padding: "14px 14px", color: TEXT }}>{row.conversions.toLocaleString()}</td>
                        <td style={{ padding: "14px 14px", color: TEXT }}>{row.rate.toFixed(2)}%</td>
                        <td style={{ padding: "14px 14px", color: row.upliftColor, fontWeight: row.uplift !== "—" ? 700 : 400 }}>{row.uplift}</td>
                        <td style={{ padding: "14px 14px", textAlign: "right" }}>
                          {hasParams && (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#6B7280", transition: "transform 0.25s ease", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                            </span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && hasParams && (
                        <tr>
                          <td colSpan={6} style={{ padding: 0, borderBottom: isLast ? "none" : `1px solid ${BORDER}` }}>
                            <div style={{ background: "#F9FAFB", borderTop: `1px dashed ${BORDER}`, padding: "16px 20px 20px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 14 }}>
                                Configuration Parameters
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                                {schemaParams.map((param) => {
                                  const displayValue = overrides[param.key] !== undefined ? String(overrides[param.key]) : String(param.defaultValue ?? "—");
                                  const isBool = param.type === "Boolean";
                                  return (
                                    <div key={param.id || param.key} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 16px" }}>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 2 }}>{param.key}</div>
                                      <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>{param.type}</div>
                                      {isBool ? (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F3F4F6", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "9px 12px", color: "#9CA3AF", fontSize: 13, cursor: "not-allowed" }}>
                                          <span style={{ color: "#6B7280", fontWeight: 500 }}>
                                            {displayValue.toLowerCase() === "true" ? "True" : "False"}
                                          </span>
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4CAD4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                                        </div>
                                      ) : (
                                        <div style={{ background: "#F3F4F6", border: `1px solid ${BORDER}`, borderRadius: 7, padding: "9px 12px", color: "#6B7280", fontSize: 13, cursor: "not-allowed", minHeight: 38 }}>
                                          {displayValue}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {vttOpen && (
              <div style={{ position: "fixed", left: vttPos.x, top: vttPos.y - 8, transform: "translateX(-50%) translateY(-100%)", background: "#111827", color: WHITE, fontSize: 12, fontWeight: 400, padding: "8px 12px", borderRadius: 6, whiteSpace: "normal", maxWidth: 280, lineHeight: 1.5, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", zIndex: 9999, pointerEvents: "none" }}>
                {vttOpen}
                <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #111827" }} />
              </div>
            )}
          </div>
      </>

      {/* ── Fixed footer ── */}
      <div style={{ position: "fixed", bottom: 0, left: 222, right: 0, padding: "14px 28px", background: WHITE, borderTop: "2px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 40 }}>
        <Button
          onClick={onBack}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>}
        >
          Back
        </Button>
        <Button type="primary" onClick={onBack}>
          Done
        </Button>
      </div>
    </div>
  );
}

// ─── SDK Key Tooltip ───────────────────────────────────────────────────────
function SdkKeyTooltip() {
  const [visible, setVisible] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help", color: "#9CA3AF" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
      </svg>
      {visible && (
        <div style={{ position: "absolute", bottom: "calc(100% + 7px)", left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: "#F9FAFB", fontSize: 12, fontWeight: 400, lineHeight: 1.5, padding: "8px 11px", borderRadius: 7, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(0,0,0,0.18)", zIndex: 9999, pointerEvents: "none", maxWidth: 320, whiteSpace: "normal", width: 280 }}>
          Developers reference this key in the SDK to pull this config — it can map to any part of your app.
          <span style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1F2937" }} />
        </div>
      )}
    </span>
  );
}

// ─── SDK Pill ──────────────────────────────────────────────────────────────
function SdkPill({ sdk }) {
  const colors = {
    iOS: { bg: "#F0F9FF", color: "#0369A1", border: "#BAE6FD" },
    Android: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
    Web: { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
    "React Native": { bg: "#FAF5FF", color: "#7C3AED", border: "#DDD6FE" },
  };
  const c = colors[sdk] || { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>
      {sdk}
    </span>
  );
}

function ConfigNameInfoIcon() {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span style={{ display: "inline-flex", alignItems: "center", cursor: "help", color: "#9CA3AF" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
      </span>
      {visible && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: "#FFFFFF", fontSize: 12, fontWeight: 500, padding: "10px 14px", borderRadius: 8, whiteSpace: "normal", wordBreak: "break-word", zIndex: 400, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", pointerEvents: "none", width: 260, lineHeight: 1.5 }}>
          A human-readable name for this configuration. Used for display purposes only — the SDK Key is what your app code references.
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #1F2937" }} />
        </div>
      )}
    </div>
  );
}

function DisabledMenuItemWithTooltip({ item }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
    >
      <button
        onClick={item.disabled ? undefined : item.action}
        disabled={item.disabled}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", border: "none", background: hovered && !item.disabled ? (item.danger ? "#FEF2F2" : "#F3F4F6") : "transparent", color: item.disabled ? "#D1D5DB" : item.danger ? "#EF4444" : "#111827", fontSize: 13, cursor: item.disabled ? "not-allowed" : "pointer", textAlign: "left", opacity: item.disabled ? 0.6 : 1 }}
      >
        {item.icon}
        {item.label}
      </button>
      {item.disabled && hovered && (
        <div style={{ position: "absolute", top: "50%", right: "calc(100% + 8px)", transform: "translateY(-50%)", background: "#1F2937", color: "#FFFFFF", fontSize: 11, fontWeight: 500, padding: "6px 10px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", pointerEvents: "none" }}>
          Active configurations cannot be edited.
          <div style={{ position: "absolute", top: "50%", left: "100%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "4px solid #1F2937" }} />
        </div>
      )}
    </div>
  );
}

function SchemaStatusBadge({ status }) {
  const isDraft = status === "Draft" || !status;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: isDraft ? "#F3F4F6" : "#ECFDF5", color: isDraft ? "#6B7280" : "#059669", border: `1px solid ${isDraft ? "#E5E7EB" : "#A7F3D0"}` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isDraft ? "#9CA3AF" : "#10B981", flexShrink: 0 }} />
      {isDraft ? "Draft" : "Active"}
    </span>
  );
}

// ─── DevRemoteConfigList ───────────────────────────────────────────────────
function DescriptionCell({ text }) {
  const [visible, setVisible] = useState(false);
  if (!text) return <span style={{ fontSize: 12, color: TEXT_MUTED }}>—</span>;
  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}>
      <span style={{ fontSize: 12, color: TEXT_MUTED, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>
      {visible && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: "#FFFFFF", fontSize: 12, fontWeight: 500, padding: "10px 14px", borderRadius: 8, whiteSpace: "normal", wordBreak: "break-word", zIndex: 300, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", pointerEvents: "none", width: 280, lineHeight: 1.5 }}>
          {text}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #1F2937" }} />
        </div>
      )}
    </div>
  );
}

function SdkChips({ sdks }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const MAX_VISIBLE = 2;
  const visible = sdks.slice(0, MAX_VISIBLE);
  const overflow = sdks.slice(MAX_VISIBLE);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "nowrap" }}>
      {visible.map((sdk) => <SdkPill key={sdk} sdk={sdk} />)}
      {overflow.length > 0 && (
        <div style={{ position: "relative" }}
          onMouseEnter={() => setTooltipVisible(true)}
          onMouseLeave={() => setTooltipVisible(false)}
        >
          <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 999, background: "#F3F4F6", color: "#6B7280", fontSize: 11, fontWeight: 600, cursor: "default", border: "1px solid #E5E7EB" }}>
            +{overflow.length}
          </span>
          {tooltipVisible && (
            <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)", background: "#1F2937", color: WHITE, fontSize: 11, fontWeight: 500, padding: "6px 10px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 300, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", pointerEvents: "none" }}>
              {overflow.join(", ")}
              <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid #1F2937" }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DevRemoteConfigList({ schemas, onCreateNew, onViewSchema, onRemove }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);
  const [openActionId, setOpenActionId] = useState(null);

  // Date filter state
  const rcDateFilters = ["Today", "Yesterday", "7D", "30D", "3M", "6M", "12M"];
  const [rcActiveDateFilter, setRcActiveDateFilter] = useState("30D");
  const [rcCustomStartDate, setRcCustomStartDate] = useState("");
  const [rcCustomEndDate, setRcCustomEndDate] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schemas;
    return schemas.filter((s) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q));
  }, [schemas, searchQuery]);

  const handleCopyKey = (key) => {
    try { navigator.clipboard.writeText(key); } catch (_) {}
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1600);
  };

  useEffect(() => {
    const handler = () => { setOpenActionId(null); };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 5, height: 52, borderRadius: 999, background: "#3B82F6", marginTop: 2, flexShrink: 0 }} />
          <div>
            <h1 style={pageTitleStyle}>Config Library</h1>
            <p style={pageDescriptionStyle}>Define reusable configurations your SDK can fetch. These are the building blocks used in rollouts and experiments.</p>
          </div>
        </div>
        <Button type="primary" onClick={onCreateNew} style={{ flexShrink: 0 }}>
          + New Config
        </Button>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 0 250px" }}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input type="text" placeholder="Search by config name or key..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, width: "100%", background: WHITE, border: `1px solid ${BORDER}`, paddingLeft: 30, paddingRight: searchQuery ? 28 : 10, fontSize: 12, boxSizing: "border-box", height: 34 }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#9CA3AF", padding: 2, fontSize: 14, display: "flex", alignItems: "center" }}>×</button>}
        </div>
        <div style={{ width: 1, height: 22, background: "#E5E7EB", flexShrink: 0 }} />
        <button
          onClick={() => setRcActiveDateFilter("Custom")}
          style={{ padding: "5px 12px", height: 34, borderRadius: 8, border: `1px solid ${rcActiveDateFilter === "Custom" ? "#3B82F6" : "#E5E7EB"}`, background: rcActiveDateFilter === "Custom" ? "#EFF6FF" : WHITE, color: rcActiveDateFilter === "Custom" ? "#1D4ED8" : TEXT_MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Custom
        </button>
        <DatePicker.RangePicker
          placeholder={["Start date", "End date"]}
          value={rcCustomStartDate && rcCustomEndDate ? [dayjs(rcCustomStartDate), dayjs(rcCustomEndDate)] : null}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setRcCustomStartDate(dates[0].format("YYYY-MM-DD"));
              setRcCustomEndDate(dates[1].format("YYYY-MM-DD"));
              setRcActiveDateFilter("Custom");
            } else {
              setRcCustomStartDate("");
              setRcCustomEndDate("");
            }
          }}
          size="small"
          style={{ height: 34, borderRadius: 8, fontSize: 12, borderColor: rcActiveDateFilter === "Custom" ? "#3B82F6" : "#E5E7EB" }}
          separator={<span style={{ color: TEXT_MUTED }}>→</span>}
        />
        {rcDateFilters.map((f) => {
          const active = rcActiveDateFilter === f;
          return (
            <button key={f} onClick={() => { setRcActiveDateFilter(f); setRcCustomStartDate(""); setRcCustomEndDate(""); }}
              style={{ padding: "5px 10px", height: 34, borderRadius: 8, border: `1px solid ${active ? "#3B82F6" : "#E5E7EB"}`, background: active ? "#3B82F6" : WHITE, color: active ? WHITE : TEXT_MUTED, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {f}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, overflow: "visible" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", display: "table", borderRadius: 14, overflow: "visible" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, background: SOFT }}>
              {["Status", "Name", "Description", "Created", "Last Updated", "Creator User", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: h === "Actions" ? "center" : "left", fontSize: 11, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: "center", color: TEXT_MUTED, fontSize: 13 }}>
                  No configs match your search.
                </td>
              </tr>
            ) : filtered.map((schema, idx) => (
              <tr
                key={schema.id}
                style={{ borderBottom: idx < filtered.length - 1 ? `1px solid ${BORDER}` : "none", cursor: "pointer", transition: "background 0.12s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = SOFT; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                onClick={() => onViewSchema(schema)}
              >
                <td style={{ padding: "14px 16px" }}>
                  <SchemaStatusBadge status={schema.status} />
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{schema.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                    <code style={{ fontSize: 11, color: "#4F46E5", background: "#EEF2FF", border: "1px solid #C7D2FB", borderRadius: 5, padding: "1px 6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{schema.key}</code>
                  </div>
                </td>
                <td style={{ padding: "14px 16px", maxWidth: 260 }}>
                  <DescriptionCell text={schema.description} />
                </td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: TEXT_MUTED, whiteSpace: "nowrap" }}>{schema.created}</td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: TEXT_MUTED, whiteSpace: "nowrap" }}>{schema.updated}</td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: TEXT_MUTED, whiteSpace: "nowrap" }}>{schema.createdBy || "—"}</td>
                <td style={{ padding: "14px 16px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenActionId(openActionId === schema.id ? null : schema.id); }}
                      style={{ padding: 6, background: "transparent", border: "none", cursor: "pointer", color: TEXT_MUTED, borderRadius: 6, display: "flex", alignItems: "center" }}
                    >
                      <MoreIcon />
                    </button>
                    {openActionId === schema.id && (
                      <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", width: 180, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.13)", zIndex: 9999, overflow: "visible" }}>
                        {[
                          { icon: <EditIcon />, label: "Edit", disabled: schema.status === "Active", action: () => { setOpenActionId(null); onViewSchema(schema); } },
                          { icon: <CopyIcon />, label: "Clone", action: () => setOpenActionId(null) },
                          { icon: <TrashIcon />, label: "Delete", danger: true, action: () => { setOpenActionId(null); onRemove && onRemove(schema); } },
                        ].map((item) => (
                          <DisabledMenuItemWithTooltip key={item.label} item={item} />
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CustomSelect ─────────────────────────────────────────────────────────
function CustomSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, border: `1px solid ${BORDER_DARK}`, background: WHITE, color: TEXT, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
      >
        {value}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s", flexShrink: 0 }}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 299 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.13)", zIndex: 300, overflow: "hidden" }}>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", border: "none", background: opt === value ? SOFT : "transparent", color: TEXT, fontSize: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                onMouseEnter={(e) => { if (opt !== value) e.currentTarget.style.background = SOFT; }}
                onMouseLeave={(e) => { if (opt !== value) e.currentTarget.style.background = "transparent"; }}
              >
                {opt}
                {opt === value && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={TEXT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── DevRemoteConfigDetail (read-only, Active configs) ────────────────────
function DevRemoteConfigDetail({ schema, onBack, onDuplicate }) {
  const [activeTab, setActiveTab] = useState("iOS");
  const [snippetCopied, setSnippetCopied] = useState(false);

  const disabledInput = {
    ...inputStyle,
    background: "#f5f5f5",
    color: "#bfbfbf",
    cursor: "not-allowed",
    borderColor: "#d9d9d9",
  };

  const codeSnippets = {
    iOS: `import NetmeraSDK\n\n// Fetch schema: ${schema.key}\nlet config = Netmera.getRemoteConfig(key: "${schema.key}")\n${schema.parameters.slice(0, 3).map((p) => {
      const cast = p.type === "Integer" ? `config.intValue(for: "${p.key}")` : p.type === "Boolean" ? `config.boolValue(for: "${p.key}")` : `config.stringValue(for: "${p.key}")`;
      return `let ${p.key} = ${cast}`;
    }).join("\n")}`,
    Android: `import com.netmera.sdk.RemoteConfig\n\n// Fetch schema: ${schema.key}\nval config = Netmera.getRemoteConfig("${schema.key}")\n${schema.parameters.slice(0, 3).map((p) => {
      const type = p.type === "Integer" ? "Int" : p.type === "Boolean" ? "Boolean" : "String";
      return `val ${p.key}: ${type} = config.get${type}("${p.key}")`;
    }).join("\n")}`,
    Web: `import { Netmera } from '@netmera/web-sdk';\n\n// Fetch schema: ${schema.key}\nconst config = await Netmera.getRemoteConfig('${schema.key}');\n${schema.parameters.slice(0, 3).map((p) => `const ${p.key} = config.get('${p.key}');`).join("\n")}`,
    "React Native": `import { Netmera } from '@netmera/react-native-sdk';\n\n// Fetch schema: ${schema.key}\nconst config = await Netmera.getRemoteConfig('${schema.key}');\n${schema.parameters.slice(0, 3).map((p) => `const ${p.key} = config.get('${p.key}');`).join("\n")}`,
    Flutter: `import 'package:netmera_flutter_sdk/netmera.dart';\n\n// Fetch schema: ${schema.key}\nfinal config = await Netmera.getRemoteConfig('${schema.key}');\n${schema.parameters.slice(0, 3).map((p) => `final ${p.key} = config.get('${p.key}');`).join("\n")}`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Page header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 5, alignSelf: "stretch", borderRadius: 999, background: "#3B82F6", flexShrink: 0 }} />
        <div>
          <h1 style={pageTitleStyle}>{schema.name}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 13, color: TEXT_MUTED }}>{schema.key}</span>
            <Tag color="success">ACTIVE</Tag>
          </div>
        </div>
      </div>

      {/* Ant Design info alert */}
      <Alert
        type="info"
        showIcon
        message="This config is currently active and cannot be edited. To make changes, duplicate this config to create a new Draft."
        style={{ marginBottom: 20 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1, paddingBottom: 90 }}>
        {/* Basic Info — read-only */}
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 18 }}>Basic Information</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>CONFIG NAME</label>
              <input value={schema.name} readOnly style={disabledInput} />
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>
                KEY (SDK IDENTIFIER)
                <SdkKeyTooltip />
              </label>
              <input value={schema.key} readOnly style={{ ...disabledInput, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>DESCRIPTION</label>
              <textarea value={schema.description || "—"} readOnly rows={3} style={{ ...disabledInput, resize: "none" }} />
            </div>
          </div>
        </div>

        {/* Parameters — read-only */}
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Parameters</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>Parameters defined for this config.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {schema.parameters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 12px", color: TEXT_MUTED, fontSize: 13 }}>No parameters defined.</div>
            ) : schema.parameters.map((p) => (
              <div key={p.id} style={{ background: WHITE, borderRadius: 8, border: `1px solid ${BORDER}`, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{p.key}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0px 8px", borderRadius: 4, background: "#f5f5f5", border: "1px solid #d9d9d9", color: "#595959", fontSize: 12 }}>{p.type}</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: TEXT_MUTED, marginBottom: 4 }}>Parameter Key</label>
                    <input value={p.key} readOnly style={{ ...disabledInput, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, padding: "6px 12px" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: TEXT_MUTED, marginBottom: 4 }}>Default Value</label>
                    <input value={String(p.defaultValue)} readOnly style={{ ...disabledInput, fontSize: 12, padding: "6px 12px" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SDK Code Snippet — read-only */}
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 4 }}>SDK Code Snippet</div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>Copy this snippet into your app to fetch schema values at runtime.</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
            {["iOS", "Android", "Web", "React Native", "Flutter"].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: "8px 14px", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 12, fontWeight: activeTab === tab ? 700 : 400, background: activeTab === tab ? WHITE : "transparent", color: activeTab === tab ? TEXT : TEXT_MUTED, borderBottom: activeTab === tab ? "2px solid #4F46E5" : "2px solid transparent" }}>
                {tab}
              </button>
            ))}
          </div>
          <pre style={{ margin: 0, padding: 16, borderRadius: 10, background: "#1E293B", color: "#E2E8F0", fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflowX: "auto", lineHeight: 1.7 }}>
            {codeSnippets[activeTab]}
          </pre>
          <button
            onClick={() => { try { navigator.clipboard.writeText(codeSnippets[activeTab]); } catch (_) {} setSnippetCopied(true); setTimeout(() => setSnippetCopied(false), 2000); }}
            style={{ ...secondaryButtonStyle, background: WHITE, marginTop: 10, padding: "7px 12px", fontSize: 12, color: snippetCopied ? "#16A34A" : TEXT }}
          >
            {snippetCopied ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> : <CopyIcon />}
            {snippetCopied ? "Copied" : "Copy Snippet"}
          </button>
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{ position: "sticky", bottom: 0, background: WHITE, borderTop: `1px solid ${BORDER}`, padding: "14px 0", marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Button onClick={onBack} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>}>
          Back
        </Button>
        <Button type="primary" onClick={onDuplicate} icon={<CopyIcon />}>
          Clone as Draft
        </Button>
      </div>
    </div>
  );
}

// ─── DevRemoteConfigNew ────────────────────────────────────────────────────
function DevRemoteConfigNew({ schema, onBack, onSave, experiments = [], configs = [] }) {
  const isEdit = Boolean(schema);

  const [name, setName] = useState(isEdit ? schema.name : "");
  const [key, setKey] = useState(isEdit ? schema.key : "");
  const [description, setDescription] = useState(isEdit ? (schema.description || "") : "");
  const [sdks] = useState(isEdit ? schema.sdks : []);
  const [params, setParams] = useState(
    isEdit ? schema.parameters.map((p) => ({ ...p, collapsed: false })) : []
  );
  const [activeTab, setActiveTab] = useState("iOS");
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [errors, setErrors] = useState({});

  const displayKey = key;

  const addParam = () => {
    setParams((prev) => [...prev, { id: `sp_new_${Date.now()}`, key: "", type: "String", defaultValue: "", collapsed: false }]);
  };

  const defaultValueForType = (type) => type === "JSON" ? '{"key":"value"}' : type === "Boolean" ? "true" : "";

  const handleParamTypeChange = (id, newType) => {
    setParams((prev) => prev.map((p) => p.id === id ? { ...p, type: newType, defaultValue: defaultValueForType(newType) } : p));
  };

  const updateParam = (id, field, value) => {
    setParams((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
  };

  const removeParam = (id) => setParams((prev) => prev.filter((p) => p.id !== id));

  const [paramErrors, setParamErrors] = useState({});

  const validate = (asDraft = false) => {
    const e = {};
    if (!name.trim()) e.name = "Config name is required.";
    if (!key.trim()) e.key = "Key is required.";
    setErrors(e);
    if (asDraft) { setParamErrors({}); return Object.keys(e).length === 0; }
    const pe = {};
    params.forEach((p) => {
      const f = {};
      if (!p.key.trim()) f.key = true;
      if (p.type !== "Boolean" && !String(p.defaultValue).trim()) f.defaultValue = true;
      if (Object.keys(f).length > 0) pe[p.id] = f;
    });
    setParamErrors(pe);
    return Object.keys(e).length === 0 && Object.keys(pe).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (onSave) onSave({ name, key, description, sdks, parameters: params, status: "Active" });
  };

  const handleSaveAsDraft = () => {
    if (!validate(true)) return;
    if (onSave) onSave({ name, key, description, sdks, parameters: params, status: "Draft" });
  };

  // Check if this config is used in any experience
  const schemaKey = isEdit ? schema.key : key.trim();
  const linkedRollouts = configs.filter((c) => c.key === schemaKey && !c.archived);
  const linkedExperiments = experiments.filter((e) => !e.archived && e.linkedConfigKey === schemaKey);
  const isUsedInExperience = linkedRollouts.length > 0 || linkedExperiments.length > 0;
  const isActive = isEdit && schema.status === "Active";

  const codeSnippets = {
    iOS: `import NetmeraSDK

// Fetch schema: ${displayKey || "your_schema_key"}
let config = Netmera.getRemoteConfig(key: "${displayKey || "your_schema_key"}")
${params.slice(0, 3).map((p) => {
  const cast = p.type === "Integer" ? "config.intValue(for: \"\(p.key)\")" : p.type === "Boolean" ? "config.boolValue(for: \"\(p.key)\")" : `config.stringValue(for: "${p.key}")`;
  return `let ${p.key || "param"} = ${cast}`;
}).join("\n")}`,
    Android: `import com.netmera.sdk.RemoteConfig

// Fetch schema: ${displayKey || "your_schema_key"}
val config = Netmera.getRemoteConfig("${displayKey || "your_schema_key"}")
${params.slice(0, 3).map((p) => {
  const type = p.type === "Integer" ? "Int" : p.type === "Boolean" ? "Boolean" : "String";
  return `val ${p.key || "param"}: ${type} = config.get${type}("${p.key || "param"}")`;
}).join("\n")}`,
    Web: `import { Netmera } from '@netmera/web-sdk';

// Fetch schema: ${displayKey || "your_schema_key"}
const config = await Netmera.getRemoteConfig('${displayKey || "your_schema_key"}');
${params.slice(0, 3).map((p) => `const ${p.key || "param"} = config.get('${p.key || "param"}');`).join("\n")}`,
    "React Native": `import { Netmera } from '@netmera/react-native-sdk';

// Fetch schema: ${displayKey || "your_schema_key"}
const config = await Netmera.getRemoteConfig('${displayKey || "your_schema_key"}');
${params.slice(0, 3).map((p) => `const ${p.key || "param"} = config.get('${p.key || "param"}');`).join("\n")}`,
    Flutter: `import 'package:netmera_flutter_sdk/netmera.dart';

// Fetch schema: ${displayKey || "your_schema_key"}
final config = await Netmera.getRemoteConfig('${displayKey || "your_schema_key"}');
${params.slice(0, 3).map((p) => `final ${p.key || "param"} = config.get('${p.key || "param"}');`).join("\n")}`,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {/* Page header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 5, alignSelf: "stretch", borderRadius: 999, background: "#3B82F6", flexShrink: 0 }} />
        <div>
          <h1 style={pageTitleStyle}>{isEdit ? "Edit Config" : "New Config"}</h1>
          {isEdit ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 13, color: TEXT_MUTED }}>{schema.name}</span>
              <Tag>DRAFT</Tag>
            </div>
          ) : (
            <p style={pageDescriptionStyle}>Define the keys and default values your SDK will fetch.</p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1, paddingBottom: 90 }}>
        {/* Experience usage warning */}
        {isEdit && isUsedInExperience && schema.status !== "Draft" && (
          <Alert
            type="info"
            showIcon
            message={
              <span>
                <strong>This config is in use.</strong>{" "}
                It is currently linked to {linkedRollouts.length > 0 ? `${linkedRollouts.length} rollout${linkedRollouts.length > 1 ? "s" : ""}` : ""}{linkedRollouts.length > 0 && linkedExperiments.length > 0 ? " and " : ""}{linkedExperiments.length > 0 ? `${linkedExperiments.length} A/B test${linkedExperiments.length > 1 ? "s" : ""}` : ""}. Changes will affect live experiences. Only Draft configs can be freely edited.
              </span>
            }
          />
        )}

        {/* Basic Info */}
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 18 }}>Basic Information</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>
                CONFIG NAME *
                <ConfigNameInfoIcon />
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Product Page Layout"
                style={{ ...inputStyle, borderColor: errors.name ? "#EF4444" : BORDER, background: WHITE }}
              />
              {errors.name && <div style={{ marginTop: 5, fontSize: 12, color: "#EF4444" }}>{errors.name}</div>}
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>
                KEY (SDK IDENTIFIER)
                <SdkKeyTooltip />
              </label>
              <div style={{ position: "relative" }}>
                <input
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                  placeholder="e.g. product_page_layout"
                  style={{ ...inputStyle, background: WHITE, color: key ? "#4F46E5" : TEXT_MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, borderColor: errors.key ? "#EF4444" : BORDER }}
                />
              </div>
              {errors.key && <div style={{ marginTop: 5, fontSize: 12, color: "#EF4444" }}>{errors.key}</div>}
              <div style={{ marginTop: 5, fontSize: 11, color: TEXT_MUTED }}>Use lowercase letters, numbers, and underscores only. This is the key your SDK uses to fetch this config.</div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 700, color: TEXT_MUTED }}>DESCRIPTION</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What does this config control?"
                style={{ ...inputStyle, resize: "vertical", background: WHITE }}
              />
            </div>
          </div>
        </div>

        {/* Parameters — experience-style */}
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Parameters</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>Define the keys, types and default values for this schema.</div>
          </div>
          <div style={{ border: `1px dashed ${BORDER_DARK}`, borderRadius: 16, padding: 18, background: SOFT }}>
            {params.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 12px" }}>
                <div style={{ color: TEXT_MUTED, marginBottom: 18, fontSize: 26 }}>&lt;/&gt;</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: TEXT, marginBottom: 8 }}>No parameters added yet</div>
                <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 18 }}>Add your first parameter to define your configuration structure.</div>
                <button onClick={addParam} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "none", borderRadius: 8, background: "#3B82F6", color: WHITE, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  + Add Parameter
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {params.map((p, idx) => (
                  <div key={p.id} style={{ background: WHITE, borderRadius: 12, border: `1px solid ${BORDER}`, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: p.collapsed ? 0 : 14 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{p.key || `Parameter ${idx + 1}`}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: TEXT_MUTED }}>{p.type}</div>
                      </div>
                      <button
                        onClick={() => updateParam(p.id, "collapsed", !p.collapsed)}
                        style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", borderRadius: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#374151"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#9CA3AF"; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transform: p.collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => removeParam(p.id)}
                        style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", borderRadius: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#DC2626"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#9CA3AF"; }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                    {!p.collapsed && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", marginBottom: 4, fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>KEY</label>
                          <input
                            value={p.key}
                            onChange={(e) => { updateParam(p.id, "key", e.target.value); setParamErrors((prev) => ({ ...prev, [p.id]: { ...prev[p.id], key: false } })); }}
                            placeholder="e.g. hero_title"
                            style={{ ...inputStyle, background: WHITE, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, borderColor: paramErrors[p.id]?.key ? "#EF4444" : BORDER }}
                          />
                          {paramErrors[p.id]?.key && <div style={{ marginTop: 4, fontSize: 11, color: "#EF4444" }}>Key is required.</div>}
                          <div style={{ marginTop: 10 }}>
                            <label style={{ display: "block", marginBottom: 4, fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>DEFAULT VALUE</label>
                            {p.type === "Boolean" ? (
                              <CustomSelect
                                value={p.defaultValue === "true" ? "TRUE" : "FALSE"}
                                onChange={(v) => updateParam(p.id, "defaultValue", v === "TRUE" ? "true" : "false")}
                                options={["TRUE", "FALSE"]}
                              />
                            ) : (
                              <input
                                value={p.defaultValue}
                                onChange={(e) => {
                                  const val = p.type === "Integer" ? e.target.value.replace(/[^0-9\-]/g, "") : e.target.value;
                                  updateParam(p.id, "defaultValue", val);
                                  setParamErrors((prev) => ({ ...prev, [p.id]: { ...prev[p.id], defaultValue: false } }));
                                }}
                                inputMode={p.type === "Integer" ? "numeric" : undefined}
                                placeholder={p.type === "JSON" ? '{"key":"value"}' : p.type === "Integer" ? "e.g. 42" : "e.g. hello"}
                                style={{ ...inputStyle, background: WHITE, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, borderColor: paramErrors[p.id]?.defaultValue ? "#EF4444" : BORDER }}
                              />
                            )}
                            {paramErrors[p.id]?.defaultValue && <div style={{ marginTop: 4, fontSize: 11, color: "#EF4444" }}>Default value is required.</div>}
                          </div>
                        </div>
                        <div>
                          <label style={{ display: "block", marginBottom: 4, fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>TYPE</label>
                          <CustomSelect
                            value={p.type}
                            onChange={(newType) => handleParamTypeChange(p.id, newType)}
                            options={["String", "Integer", "Boolean", "JSON"]}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={addParam} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "none", borderRadius: 8, background: "#3B82F6", color: WHITE, fontSize: 14, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                  + Add Parameter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SDK Code Snippet */}
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 4 }}>SDK Code Snippet</div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>Copy this snippet into your app to fetch schema values at runtime.</div>
          <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
            {["iOS", "Android", "Web", "React Native", "Flutter"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "8px 14px", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 12, fontWeight: activeTab === tab ? 700 : 400,
                  background: activeTab === tab ? WHITE : "transparent",
                  color: activeTab === tab ? TEXT : TEXT_MUTED,
                  borderBottom: activeTab === tab ? `2px solid #4F46E5` : "2px solid transparent",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <pre style={{ margin: 0, padding: 16, borderRadius: 10, background: "#1E293B", color: "#E2E8F0", fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflowX: "auto", lineHeight: 1.7 }}>
            {codeSnippets[activeTab]}
          </pre>
          <button
            onClick={() => {
              try { navigator.clipboard.writeText(codeSnippets[activeTab]); } catch (_) {}
              setSnippetCopied(true);
              setTimeout(() => setSnippetCopied(false), 2000);
            }}
            style={{ ...secondaryButtonStyle, background: WHITE, marginTop: 10, padding: "7px 12px", fontSize: 12, color: snippetCopied ? "#16A34A" : TEXT }}
          >
            {snippetCopied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            ) : (
              <CopyIcon />
            )}
            {snippetCopied ? "Copied" : "Copy Snippet"}
          </button>
        </div>
      </div>

      {/* Sticky footer */}
      <div style={{ position: "sticky", bottom: 0, background: WHITE, borderTop: `1px solid ${BORDER}`, padding: "14px 0", marginLeft: -28, marginRight: -28, paddingLeft: 28, paddingRight: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Button onClick={onBack} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>}>
          Back
        </Button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button onClick={handleSaveAsDraft}>Save as Draft</Button>
          <Button type="primary" onClick={handleSave}>Activate Config</Button>
        </div>
      </div>
    </div>
  );
}

// ─── BrowseSchemasModal ────────────────────────────────────────────────────
function BrowseSchemasModal({ schemas, onClose, onUseSchema }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schemas;
    return schemas.filter((s) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q));
  }, [schemas, searchQuery]);

  return (
    <Modal
      open={!!schemas}
      onCancel={onClose}
      width={580}
      title={
        <>
          <AntTitle level={4} style={{ margin: 0 }}>Browse Schemas</AntTitle>
          <AntText type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>Pick a schema to pre-populate your configuration's parameters.</AntText>
        </>
      }
      footer={null}
      styles={{ body: { padding: 0 } }}
    >
      {/* Search */}
      <div style={{ padding: "12px 24px 12px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: TEXT_MUTED, pointerEvents: "none" }}><SearchIcon /></span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search schemas…"
            style={{ ...inputStyle, paddingLeft: 36, background: WHITE }}
          />
        </div>
      </div>

      {/* Schema list */}
      <div style={{ overflowY: "auto", maxHeight: 420, padding: "12px 24px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32 }}>
            <AntText type="secondary">No schemas match your search.</AntText>
          </div>
        ) : filtered.map((schema) => (
          <div
            key={schema.id}
            style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 8, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, background: WHITE }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <AntText strong style={{ fontSize: 14 }}>{schema.name}</AntText>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <code style={{ fontSize: 11, color: "#4F46E5", background: "#EEF2FF", border: "1px solid #C7D2FB", borderRadius: 4, padding: "1px 6px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{schema.key}</code>
                <AntText type="secondary" style={{ fontSize: 11 }}>{schema.parameters.length} param{schema.parameters.length !== 1 ? "s" : ""}</AntText>
              </div>
              {schema.description && <AntText type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>{schema.description}</AntText>}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {schema.sdks.map((sdk) => <SdkPill key={sdk} sdk={sdk} />)}
              </div>
            </div>
            <Button
              type="primary"
              size="small"
              onClick={() => { onUseSchema(schema); onClose(); }}
              style={{ flexShrink: 0 }}
            >
              Use Schema
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNavigatingRef = useRef(false);
  const { message: antMessage } = AntApp.useApp();

  const [activeMenu, setActiveMenu] = useState("remote_config");
  const [remoteConfigView, setRemoteConfigView] = useState("list");
  const [abView, setAbView] = useState("list");
  const [abPlaceholderTitle, setAbPlaceholderTitle] = useState("");
  const [selectedExperimentReport, setSelectedExperimentReport] = useState(null);
  const [editingExperiment, setEditingExperiment] = useState(null);
  const [editingConfig, setEditingConfig] = useState(null);
  const [selectedConfigReport, setSelectedConfigReport] = useState(null);
  const [experiments, setExperiments] = useState(initialExperiments);
  const [openActionId, setOpenActionId] = useState(null);
  const [experienceHovered, setExperienceHovered] = useState(false);
  const [devHovered, setDevHovered] = useState(false);
  const [devSchemaView, setDevSchemaView] = useState("list");
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [schemas, setSchemas] = useState(mockSchemas);
  // Tracks which schema IDs have been explicitly set up as Feature Rollouts.
  // Schemas created from the Config Library do NOT appear here automatically.
  const [featureRolloutIds, setFeatureRolloutIds] = useState(new Set(["s1"]));
  // Stores per-config edited parameter values: { [configId]: { [paramId]: value } }
  const [configParamValues, setConfigParamValues] = useState({});
  const configs = useMemo(() => schemas.map((s) => ({
    id: s.id,
    name: s.name,
    key: s.key,
    status: s.status === "Active" ? "Live" : "Draft",
    type: s.parameters[0]?.type || "String",
    creator: s.createdBy,
    created: s.created,
    updated: s.updated,
    description: s.description || "",
    parameters: s.parameters.map((p) => ({
      ...p,
      value: configParamValues[s.id]?.[p.id] !== undefined ? configParamValues[s.id][p.id] : p.defaultValue,
    })),
    variants: s.variants || [],
    rollout: 100,
    version: 1.0,
    deploymentType: s.status === "Active" ? "Rolled Out" : "Draft",
    archived: false,
  })), [schemas, configParamValues]);
  const [toast, setToast] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [removeModal, setRemoveModal] = useState({ open: false, config: null });
  const [deleteExperimentModal, setDeleteExperimentModal] = useState({ open: false, experiment: null });
  // entries: [{ name, url }]
  const [activeConfigWarningModal, setActiveConfigWarningModal] = useState({ open: false, config: null, entries: [] });

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

  const initStateFromPath = (path, currentConfigs, currentExperiments, currentSchemas) => {
    if (path === "/" || path === "") {
      navigate("/experiences/feature_rollouts", { replace: true });
      return;
    }
    if (path.startsWith("/experiences/feature_rollouts")) {
      setActiveMenu("remote_config");
      const newMatch = path === "/experiences/feature_rollouts/new";
      const editMatch = path.match(/^\/experiences\/feature_rollouts\/(\d+)\/edit$/);
      const detailMatch = path.match(/^\/experiences\/feature_rollouts\/(\d+)$/);
      if (newMatch) {
        setRemoteConfigView("create");
        setEditingConfig(null);
      } else if (editMatch) {
        const id = parseInt(editMatch[1], 10);
        const config = currentConfigs.find((c) => c.id === id);
        if (config) { setEditingConfig(config); setRemoteConfigView("edit"); }
        else { setRemoteConfigView("list"); }
      } else if (detailMatch) {
        const id = parseInt(detailMatch[1], 10);
        const config = currentConfigs.find((c) => c.id === id);
        if (config) { setSelectedConfigReport(config); setRemoteConfigView("detail"); }
        else { setRemoteConfigView("list"); }
      } else {
        setRemoteConfigView("list");
        setEditingConfig(null);
        setSelectedConfigReport(null);
      }
    } else if (path.startsWith("/experiences/ab_tests")) {
      setActiveMenu("ab_testing");
      const newMatch = path === "/experiences/ab_tests/new";
      const editMatch = path.match(/^\/experiences\/ab_tests\/(\d+)\/edit$/);
      const detailMatch = path.match(/^\/experiences\/ab_tests\/(\d+)$/);
      if (newMatch) {
        setAbView("create");
      } else if (editMatch) {
        const id = parseInt(editMatch[1], 10);
        const exp = currentExperiments.find((e) => e.id === id);
        if (exp && exp.status === "DRAFT") { setEditingExperiment(exp); setAbView("edit"); }
        else { setAbView("list"); }
      } else if (detailMatch) {
        const id = parseInt(detailMatch[1], 10);
        const exp = currentExperiments.find((e) => e.id === id);
        if (exp) { setSelectedExperimentReport(exp); setAbView("detail"); }
        else { setAbView("list"); }
      } else {
        setAbView("list");
        setSelectedExperimentReport(null);
      }
    } else if (path.startsWith("/config_library")) {
      setActiveMenu("dev_remote_config");
      const newMatch = path === "/config_library/new";
      const editMatch = path.match(/^\/config_library\/([^/]+)\/edit$/);
      const detailMatch = path.match(/^\/config_library\/([^/]+)$/);
      if (newMatch) {
        setDevSchemaView("new");
        setSelectedSchema(null);
      } else if (editMatch) {
        const id = editMatch[1];
        const schema = currentSchemas.find((s) => s.id === id);
        if (schema) { setSelectedSchema(schema); setDevSchemaView("new"); }
        else { setDevSchemaView("list"); }
      } else if (detailMatch) {
        const id = detailMatch[1];
        const schema = currentSchemas.find((s) => s.id === id);
        if (schema) { setSelectedSchema(schema); setDevSchemaView(schema.status === "Active" ? "detail" : "new"); }
        else { setDevSchemaView("list"); }
      } else {
        setDevSchemaView("list");
        setSelectedSchema(null);
      }
    }
  };

  useEffect(() => {
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }
    initStateFromPath(location.pathname, configs, experiments, schemas);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const goToRemoteConfigList = () => {
    isNavigatingRef.current = true;
    setActiveMenu("remote_config");
    setRemoteConfigView("list");
    setEditingConfig(null);
    setSelectedConfigReport(null);
    navigate("/experiences/feature_rollouts");
  };

  const goToDevSchemaList = () => {
    isNavigatingRef.current = true;
    setActiveMenu("dev_remote_config");
    setDevSchemaView("list");
    setSelectedSchema(null);
    navigate("/config_library");
  };

  const goToDevSchemaNew = (schema = null) => {
    isNavigatingRef.current = true;
    setActiveMenu("dev_remote_config");
    setDevSchemaView("new");
    setSelectedSchema(schema);
    navigate(schema ? `/config_library/${schema.id}/edit` : "/config_library/new");
  };

  const goToDevSchemaDetail = (schema) => {
    isNavigatingRef.current = true;
    setActiveMenu("dev_remote_config");
    setDevSchemaView("detail");
    setSelectedSchema(schema);
    navigate(`/config_library/${schema.id}`);
  };

  const handleDuplicateAsDraft = (schema) => {
    setSchemas((prev) => {
      const copyCount = prev.filter((s) => s.key.startsWith(`copy_`) && s.key.includes(schema.key)).length + 1;
      const duplicate = {
        id: `s_${Date.now()}`,
        name: `(Copy ${copyCount}) ${schema.name}`,
        key: `copy_${copyCount}_${schema.key}`,
        description: schema.description,
        sdks: schema.sdks,
        parameters: schema.parameters.map((p) => ({ ...p, id: `sp_${Date.now()}_${p.id}` })),
        created: formatToday(),
        updated: formatToday(),
        createdBy: "Emre Sumer",
        status: "Draft",
      };
      return [duplicate, ...prev];
    });
    antMessage.success("Config duplicated as Draft.");
    goToDevSchemaList();
  };

  const handleSaveSchema = (data) => {
    // Unique key check
    const keyConflict = schemas.some((s) => s.key === data.key && (!selectedSchema || s.id !== selectedSchema.id));
    if (keyConflict) {
      antMessage.error(`A config with key "${data.key}" already exists. Please use a unique key.`);
      return;
    }
    if (selectedSchema) {
      setSchemas((prev) => prev.map((s) => s.id === selectedSchema.id ? { ...s, ...data, updated: formatToday() } : s));
    } else {
      const newSchema = { id: `s_${Date.now()}`, ...data, created: formatToday(), updated: formatToday(), createdBy: "Emre Sumer" };
      setSchemas((prev) => [newSchema, ...prev]);
    }
    const msg = selectedSchema ? "Config updated." : (data.status === "Draft" ? "Config saved as draft." : "Config published.");
    antMessage.success(msg);
    goToDevSchemaList();
  };

  const goToRemoteConfigCreate = () => {
    isNavigatingRef.current = true;
    setActiveMenu("remote_config");
    setRemoteConfigView("create");
    setEditingConfig(null);
    navigate("/experiences/feature_rollouts/new");
  };

  const goToRemoteConfigEdit = (config) => {
    isNavigatingRef.current = true;
    setActiveMenu("remote_config");
    setRemoteConfigView("edit");
    setEditingConfig(config);
    setSelectedConfigReport(null);
    setOpenActionId(null);
    navigate(`/experiences/feature_rollouts/${config.id}/edit`);
  };

  const goToRemoteConfigDetail = (config) => {
    isNavigatingRef.current = true;
    setActiveMenu("remote_config");
    setRemoteConfigView("detail");
    setSelectedConfigReport(config);
    setOpenActionId(null);
    navigate(`/experiences/feature_rollouts/${config.id}`);
  };

  const goToAbList = () => {
    isNavigatingRef.current = true;
    setActiveMenu("ab_testing");
    setAbView("list");
    setSelectedExperimentReport(null);
    setAbPlaceholderTitle("");
    navigate("/experiences/ab_tests");
  };

  const goToAbCreate = () => {
    isNavigatingRef.current = true;
    setActiveMenu("ab_testing");
    setAbView("create");
    navigate("/experiences/ab_tests/new");
  };

  const goToAbEdit = (experiment) => {
    isNavigatingRef.current = true;
    setActiveMenu("ab_testing");
    setEditingExperiment(experiment);
    setAbView("edit");
    setOpenActionId(null);
    navigate(`/experiences/ab_tests/${experiment.id}/edit`);
  };

  const pauseConflictingConfig = (_configId) => {
    setToast({ type: "warning", message: "Conflicting live configuration was stopped." });
  };

  const handleSaveConfig = (form, options = {}) => {
    const today = formatToday();
    let savedConfig;

    if (remoteConfigView === "edit" && editingConfig) {
      savedConfig = {
        ...editingConfig,
        ...form,
        id: editingConfig.id,   // always preserve the existing ID
        updated: today,
        params: form.parameters?.length || 0,
      };
      setEditingConfig(savedConfig);
    } else {
      const nextId = configs.length + 1;
      savedConfig = {
        ...form,
        id: nextId,             // always wins over form.id which may be null
        created: today,
        updated: today,
        version: form.version || 1.0,
        params: form.parameters?.length || 0,
      };
      setEditingConfig(savedConfig);
    }

    // Persist status + values back to schemas so the derived configs always reflect the latest state
    const newSchemaStatus = form.status === "Live" ? "Active" : "Draft";

    if (remoteConfigView === "edit" && editingConfig) {
      // Update the matching schema's status and variants
      setSchemas((prev) => prev.map((s) => s.id === savedConfig.id ? { ...s, status: newSchemaStatus, updated: today, variants: form.variants || [] } : s));
    } else {
      // Add a new schema entry so the config appears in the rollout list.
      // isRolloutOnly: true prevents it from appearing in the Config Library.
      const newSchema = {
        id: savedConfig.id,
        name: savedConfig.name,
        key: savedConfig.key || savedConfig.name?.toLowerCase().replace(/\s+/g, "_"),
        description: savedConfig.description || "",
        sdks: savedConfig.sdks || [],
        parameters: (form.parameters || []).map((p) => ({ ...p, defaultValue: p.value ?? p.defaultValue })),
        variants: form.variants || [],
        created: today,
        updated: today,
        createdBy: "Emre Sumer",
        status: newSchemaStatus,
        isRolloutOnly: true,
      };
      setSchemas((prev) => [...prev, newSchema]);
    }

    // Mark this config as an explicit Feature Rollout so it appears in the rollout list
    setFeatureRolloutIds((prev) => new Set([...prev, savedConfig.id]));

    // Persist edited parameter values so detail view shows the saved values.
    // User edits are in the default variant's parameterOverrides, not form.parameters.value.
    if (form.parameters?.length) {
      const defaultVariant = form.variants?.find((v) => v.isDefault);
      const overrides = defaultVariant?.parameterOverrides || {};
      const paramMap = Object.fromEntries(
        form.parameters.map((p) => [p.id, overrides[p.key] !== undefined ? overrides[p.key] : p.value])
      );
      setConfigParamValues((prev) => ({ ...prev, [savedConfig.id]: paramMap }));
    }

    if (options.showDetail) {
      goToRemoteConfigDetail(savedConfig);
    } else if (!options.keepEditing) {
      goToRemoteConfigList();
    }

    return savedConfig;
  };

  const handleCloneConfig = async (_config) => {
    setLoadingAction({ scope: "config", id: _config.id, type: "clone" });
    await sleep(600);
    setOpenActionId(null);
    setLoadingAction(null);
    setToast({ type: "success", message: "Configuration cloned successfully." });
  };

  const handleRemoveConfig = (config) => {
    setOpenActionId(null);
    // Warning modal only applies to Config Library items, not Feature Rollouts
    const isFeatureRollout = featureRolloutIds.has(config.id);
    if (!isFeatureRollout && (config.status === "Live" || config.status === "Active")) {
      const linkedRollouts = configs.filter((c) => featureRolloutIds.has(c.id) && c.key === config.key && (c.status === "Live" || c.status === "Active"));
      const linkedAbTests = experiments.filter((e) => !e.archived && e.linkedConfigKey === config.key && e.status === "RUNNING");
      if (linkedRollouts.length > 0 || linkedAbTests.length > 0) {
        const entries = [
          ...linkedRollouts.map((r) => ({ name: r.name, url: `/experiences/feature_rollouts/${r.id}` })),
          ...linkedAbTests.map((e) => ({ name: e.name, url: `/experiences/ab_tests/${e.id}` })),
        ];
        setActiveConfigWarningModal({ open: true, config, entries });
        return;
      }
    }
    setRemoveModal({ open: true, config });
  };

  const confirmRemoveConfig = async () => {
    const { config } = removeModal;
    if (!config) return;
    setLoadingAction({ scope: "config", id: config.id, type: "remove" });
    await sleep(650);
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
    isNavigatingRef.current = true;
    setActiveMenu("ab_testing");
    setSelectedExperimentReport(null);
    setAbPlaceholderTitle(title);
    setAbView("placeholder");
    setOpenActionId(null);
    navigate("/experiences/ab_tests");
  };

  const openExperimentReport = (experiment) => {
    isNavigatingRef.current = true;
    setActiveMenu("ab_testing");
    setSelectedExperimentReport(experiment);
    setAbView("detail");
    setOpenActionId(null);
    navigate(`/experiences/ab_tests/${experiment.id}`);
  };

  const updateExperiment = (experimentId, updater) => {
    setExperiments((current) => current.map((experiment) => (
      experiment.id === experimentId ? updater(experiment) : experiment
    )));
  };

  const handlePauseExperiment = async (experiment) => {
    setLoadingAction({ scope: "experiment", id: experiment.id, type: "pause" });
    await sleep(450);
    updateExperiment(experiment.id, (current) => ({ ...current, status: "COMPLETED" }));
    setLoadingAction(null);
    setOpenActionId(null);
    setToast({ type: "success", message: "Experiment marked as completed." });
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
        name: `(Copy) ${experiment.name}`,
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
        metricMeasurement: form.metricMeasurement || "unique_users",
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

    // configs is now derived from schemas; publishing a config is handled via schemas state

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
        metricMeasurement: form.metricMeasurement || "unique_users",
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
        metricMeasurement: form.metricMeasurement || "unique_users",
      };
      setExperiments((current) => [launchedExperiment, ...current]);
    }

    setToast({ type: "success", message: options.publishConfig ? "Configuration published and experiment launched." : "Experiment launched." });
    openExperimentReport(launchedExperiment);
    return launchedExperiment;
  };

  const renderMainContent = () => {
    if (activeMenu === "dev_remote_config") {
      if (devSchemaView === "detail" && selectedSchema) {
        return (
          <DevRemoteConfigDetail
            schema={selectedSchema}
            onBack={goToDevSchemaList}
            onDuplicate={() => handleDuplicateAsDraft(selectedSchema)}
          />
        );
      }
      if (devSchemaView === "new") {
        return (
          <DevRemoteConfigNew
            schema={selectedSchema}
            onBack={goToDevSchemaList}
            onSave={handleSaveSchema}
            experiments={experiments}
            configs={configs}
          />
        );
      }
      return (
        <DevRemoteConfigList
          schemas={schemas.filter((s) => !s.isRolloutOnly)}
          onCreateNew={() => goToDevSchemaNew(null)}
          onViewSchema={(schema) => schema.status === "Active" ? goToDevSchemaDetail(schema) : goToDevSchemaNew(schema)}
          onRemove={handleRemoveConfig}
        />
      );
    }

    if (activeMenu === "remote_config") {
      if (remoteConfigView === "create" || remoteConfigView === "edit") {
        return (
          <RemoteConfigurationForm
            mode={remoteConfigView}
            initialValue={editingConfig}
            existingConfigs={configs.filter((c) => featureRolloutIds.has(c.id))}
            schemas={schemas}
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
          configs={configs.filter((c) => featureRolloutIds.has(c.id))}
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
          schemas={schemas}
          onBack={goToAbList}
          onOpenRemoteConfigCreate={goToRemoteConfigCreate}
          onSaveDraft={saveNewExperimentDraft}
          onLaunchExperiment={launchNewExperiment}
        />
      );
    }

    if (abView === "edit" && editingExperiment) {
      return (
        <CreateExperiment
          key={editingExperiment.id}
          configs={configs}
          experiments={experiments}
          schemas={schemas}
          onBack={goToAbList}
          onOpenRemoteConfigCreate={goToRemoteConfigCreate}
          onSaveDraft={saveNewExperimentDraft}
          onLaunchExperiment={launchNewExperiment}
          initialExperiment={editingExperiment}
        />
      );
    }

    if (abView === "detail" && selectedExperimentReport) {
      return (
        <ExperimentDetail
          experiment={selectedExperimentReport}
          linkedConfig={configs.find((config) => config.key === selectedExperimentReport.linkedConfigKey) || null}
          onBack={goToAbList}
          onOpenRemoteConfig={openRemoteConfigFromExperiment}
        />
      );
    }

    if (abView === "placeholder") {
      return (
        <ComingSoonPlaceholder
          title={abPlaceholderTitle || "Experiment Report"}
          onBack={goToAbList}
        />
      );
    }

    return (
      <ExperimentList
        experiments={experiments}
        configs={configs}
        openActionId={openActionId}
        setOpenActionId={setOpenActionId}
        onCreateNew={goToAbCreate}
        onOpenReport={openExperimentReport}
        onOpenEditor={(experiment) => goToAbEdit(experiment)}
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
      {/* ── Active Config In-Use Warning Modal ── */}
      {(() => {
        const { config: wConfig, entries = [] } = activeConfigWarningModal;
        const closeWarning = () => setActiveConfigWarningModal({ open: false, config: null, entries: [] });
        const NAME_LIMIT = 28;
        const URL_LIMIT = 36;
        return (
          <Modal
            open={activeConfigWarningModal.open}
            onCancel={closeWarning}
            width={580}
            title={
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <AntTitle level={4} style={{ margin: 0 }}>Warning</AntTitle>
              </div>
            }
            footer={[
              <Button key="ok" type="primary" onClick={closeWarning}>OK</Button>,
            ]}
          >
            <AntParagraph style={{ marginBottom: 14 }}>
              Your <AntText strong>{wConfig?.name}</AntText> configuration is currently being used in the mentioned experience(s):
            </AntParagraph>

            {/* Table */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#F9FAFB", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ padding: "10px 16px", fontSize: 12, fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>Experience Name</div>
                <div style={{ padding: "10px 16px", fontSize: 12, fontWeight: 700, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.04em", borderLeft: `1px solid ${BORDER}` }}>Experience URL</div>
              </div>
              {/* Rows */}
              {entries.map((entry, i) => {
                const nameTruncated = entry.name.length > NAME_LIMIT;
                const urlTruncated = entry.url.length > URL_LIMIT;
                const displayName = nameTruncated ? entry.name.slice(0, NAME_LIMIT) + "…" : entry.name;
                const displayUrl = urlTruncated ? entry.url.slice(0, URL_LIMIT) + "…" : entry.url;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: i < entries.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    {/* Name cell */}
                    <div style={{ padding: "11px 16px", fontSize: 13, color: TEXT, position: "relative" }}>
                      {nameTruncated ? (
                        <span
                          style={{ cursor: "default" }}
                          onMouseEnter={(e) => { e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }}
                          onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}
                        >
                          {displayName}
                          <span style={{ visibility: "hidden", opacity: 0, position: "absolute", bottom: "calc(100% + 6px)", left: 16, background: "#1F2937", color: "#F9FAFB", fontSize: 12, fontWeight: 400, lineHeight: 1.5, padding: "6px 10px", borderRadius: 6, whiteSpace: "normal", maxWidth: 260, boxShadow: "0 4px 14px rgba(0,0,0,0.18)", zIndex: 9999, transition: "opacity 0.15s, visibility 0.15s", pointerEvents: "none" }}>
                            {entry.name}
                            <span style={{ position: "absolute", top: "100%", left: 18, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1F2937" }} />
                          </span>
                        </span>
                      ) : displayName}
                    </div>
                    {/* URL cell */}
                    <div style={{ padding: "11px 16px", fontSize: 13, borderLeft: `1px solid ${BORDER}`, position: "relative" }}>
                      {urlTruncated ? (
                        <span
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => { e.currentTarget.lastChild.style.visibility = "visible"; e.currentTarget.lastChild.style.opacity = "1"; }}
                          onMouseLeave={(e) => { e.currentTarget.lastChild.style.visibility = "hidden"; e.currentTarget.lastChild.style.opacity = "0"; }}
                          onClick={() => { closeWarning(); navigate(entry.url); }}
                        >
                          <span style={{ color: "#3B82F6", textDecoration: "underline" }}>{displayUrl}</span>
                          <span style={{ visibility: "hidden", opacity: 0, position: "absolute", bottom: "calc(100% + 6px)", left: 16, background: "#1F2937", color: "#F9FAFB", fontSize: 12, fontWeight: 400, lineHeight: 1.5, padding: "6px 10px", borderRadius: 6, whiteSpace: "normal", maxWidth: 300, boxShadow: "0 4px 14px rgba(0,0,0,0.18)", zIndex: 9999, transition: "opacity 0.15s, visibility 0.15s", pointerEvents: "none" }}>
                            {entry.url}
                            <span style={{ position: "absolute", top: "100%", left: 18, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1F2937" }} />
                          </span>
                        </span>
                      ) : (
                        <span
                          style={{ color: "#3B82F6", textDecoration: "underline", cursor: "pointer" }}
                          onClick={() => { closeWarning(); navigate(entry.url); }}
                        >
                          {displayUrl}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <AntParagraph style={{ marginBottom: 0 }}>
              Please stop or complete the mentioned experience(s) in order to delete this remote configuration.
            </AntParagraph>
          </Modal>
        );
      })()}

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
      <aside style={{ position: "fixed", top: 0, left: 0, width: 222, height: "100vh", background: WHITE, borderRight: `1px solid ${BORDER}`, padding: "14px 0", display: "flex", flexDirection: "column", zIndex: 50 }}>
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
                active={experienceHovered}
                trailing={
                  <span style={{ display: "inline-flex", transition: "transform 0.2s", transform: experienceHovered ? "rotate(90deg)" : "rotate(0deg)" }}>
                    <ChevronRightIcon />
                  </span>
                }
              />

              {experienceHovered && (
                <div style={{ position: "absolute", left: "100%", top: 0, marginLeft: 8, width: 190, padding: 8, borderRadius: 12, background: WHITE, border: `1px solid ${BORDER}`, boxShadow: SHADOW, zIndex: 9999 }}>
                  {[
                    { key: "remote_config", label: "Feature Rollouts", action: goToRemoteConfigList },
                    { key: "ab_testing", label: "A/B Tests", action: goToAbList },
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
                      <span style={{ flex: 1, whiteSpace: "nowrap" }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <SidebarItem icon={<SettingsIcon />} label="Settings" trailing={<ChevronRightIcon />} />

            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setDevHovered(true)}
              onMouseLeave={() => setDevHovered(false)}
            >
              <SidebarItem
                icon={<DeveloperIcon />}
                label="Developers"
                active={devHovered}
                trailing={
                  <span style={{ display: "inline-flex", transition: "transform 0.2s", transform: devHovered ? "rotate(90deg)" : "rotate(0deg)" }}>
                    <ChevronRightIcon />
                  </span>
                }
              />
              {devHovered && (
                <div style={{ position: "absolute", left: "100%", top: 0, marginLeft: 8, width: 190, padding: 8, borderRadius: 12, background: WHITE, border: `1px solid ${BORDER}`, boxShadow: SHADOW, zIndex: 9999 }}>
                  {[
                    { key: "dev_remote_config", label: "Config Library", action: goToDevSchemaList },
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
                      <span style={{ color: TEXT_MUTED }}><DeveloperIcon /></span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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

      <main style={{ flex: 1, padding: "30px 28px 36px", marginLeft: 222 }}>
        {renderMainContent()}
      </main>
      </div>
    </>
  );
}