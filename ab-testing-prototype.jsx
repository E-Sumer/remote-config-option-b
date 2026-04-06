import { useState } from "react";

const TEAL = "#030213";
const TEAL_LIGHT = "#F3F3F5";
const TEAL_DARK = "#030213";
const BLUE = "#5B5BD6";
const BLUE_LIGHT = "#F3F4FF";
const GRAY_50 = "#FCFCFD";
const GRAY_100 = "#F7F7F8";
const GRAY_200 = "#E9EBEF";
const GRAY_300 = "#D9DCE3";
const GRAY_400 = "#717182";
const GRAY_500 = "#717182";
const GRAY_700 = "#3F3F46";
const GRAY_900 = "#030213";
const GREEN = "#0F9F6E";
const AMBER = "#C67A10";
const RED = "#D4183D";
const SHADOW = "0 1px 2px rgba(3, 2, 19, 0.06)";

const experiments = [
  { id: 1, name: "Welcome message test", status: "RUNNING", config: "welcome_message_v2", hypothesis: "Personalized greeting increases engagement", variants: 2, traffic: "50/50", metric: "session_duration", lift: "+12%", confidence: "94%", users: 45232, created: "2026-02-10", creator: "Aylin Yildiz" },
  { id: 2, name: "CTA button color test", status: "RUNNING", config: "cta_button_config", hypothesis: "Green CTA converts better than blue", variants: 3, traffic: "33/33/34", metric: "purchase_completed", lift: "+8%", confidence: "87%", users: 32100, created: "2026-02-15", creator: "Emre Demir" },
  { id: 3, name: "Promo banner placement", status: "COMPLETED", config: "promo_banner_enabled", hypothesis: "Top banner drives more clicks than bottom", variants: 2, traffic: "50/50", metric: "banner_click", lift: "+23%", confidence: "99%", users: 63350, created: "2026-01-20", creator: "Deniz Kaya" },
  { id: 4, name: "Onboarding flow v3", status: "DRAFT", config: "onboarding_flow_v3", hypothesis: "Shorter onboarding reduces drop-off", variants: 2, traffic: "50/50", metric: "onboarding_completed", lift: "—", confidence: "—", users: 0, created: "2026-03-01", creator: "Emre Sumer" },
  { id: 5, name: "Search ranking weights", status: "PAUSED", config: "search_algorithm_weight", hypothesis: "ML-based ranking improves relevance", variants: 2, traffic: "50/50", metric: "search_result_click", lift: "+5%", confidence: "72%", users: 18900, created: "2026-02-25", creator: "Can Aydin" },
];

const configs = [
  { key: "welcome_message_v2", name: "Welcome Message V2", type: "String", params: 1 },
  { key: "cta_button_config", name: "CTA Button Config", type: "JSON", params: 3 },
  { key: "promo_banner_enabled", name: "Promo Banner Enabled", type: "Boolean", params: 1 },
  { key: "onboarding_flow_v3", name: "Onboarding Flow V3", type: "JSON", params: 5 },
  { key: "dark_mode_rollout", name: "Dark Mode Rollout", type: "Boolean", params: 1 },
  { key: "search_algorithm_weight", name: "Search Algorithm Weight", type: "Integer", params: 1 },
];

const StatusBadge = ({ status }) => {
  const map = {
    RUNNING: { bg: "#DCFCE7", color: "#166534", dot: GREEN },
    COMPLETED: { bg: "#E0E7FF", color: "#3730A3", dot: "#6366F1" },
    DRAFT: { bg: GRAY_100, color: GRAY_500, dot: GRAY_400 },
    PAUSED: { bg: "#FEF3C7", color: "#92400E", dot: AMBER },
  };
  const s = map[status] || map.DRAFT;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, letterSpacing: 0.5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {status}
    </span>
  );
};

const SidebarItem = ({ icon, label, active, onClick, isNew }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
    border: `1px solid ${active ? GRAY_200 : "transparent"}`, borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: active ? 600 : 500,
    background: active ? GRAY_100 : "transparent", color: active ? GRAY_900 : GRAY_500,
    transition: "all 0.15s", position: "relative", boxShadow: active ? SHADOW : "none",
  }}>
    <span style={{ width: 22, display: "inline-flex", justifyContent: "center", fontSize: 11, fontWeight: 700, letterSpacing: 0.4, opacity: active ? 1 : 0.7 }}>{icon}</span>
    {label}
    {isNew && <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 700, background: GRAY_900, color: "#fff", padding: "2px 6px", borderRadius: 999, letterSpacing: 0.5 }}>NEW</span>}
  </button>
);

const ExperimentList = ({ onCreateNew, onSelectExperiment }) => {
  const [filter, setFilter] = useState("ALL");
  const filtered = filter === "ALL" ? experiments : experiments.filter(e => e.status === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: GRAY_900, margin: 0 }}>A/B Testing</h1>
          <p style={{ fontSize: 13, color: GRAY_500, margin: "4px 0 0" }}>Create experiments, test hypotheses, and measure impact on your key metrics.</p>
        </div>
        <button onClick={onCreateNew} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", border: "none", borderRadius: 8,
          background: TEAL, color: "#fff", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        }}>
          <span style={{ fontSize: 18 }}>+</span> New experiment
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Active experiments", value: "2", sub: "running now", color: GREEN },
          { label: "Total users in tests", value: "77,332", sub: "+18% this month", color: BLUE },
          { label: "Avg. confidence", value: "88%", sub: "across active", color: TEAL },
          { label: "Winning variants", value: "3", sub: "statistically significant", color: "#8B5CF6" },
        ].map((c, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", border: `1px solid ${GRAY_200}`, boxShadow: SHADOW }}>
            <div style={{ fontSize: 11, color: GRAY_500, fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: GRAY_900 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: c.color, fontWeight: 500, marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["ALL", "RUNNING", "COMPLETED", "DRAFT", "PAUSED"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === f ? TEAL : GRAY_200}`,
            background: filter === f ? TEAL_LIGHT : "#fff", color: filter === f ? TEAL_DARK : GRAY_500,
            fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}>
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()} {f !== "ALL" && <span style={{ marginLeft: 4, opacity: 0.6 }}>({experiments.filter(e => f === "ALL" || e.status === f).length})</span>}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${GRAY_200}`, overflow: "hidden", boxShadow: SHADOW }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: GRAY_50 }}>
              {["STATUS", "EXPERIMENT", "LINKED CONFIG", "PRIMARY METRIC", "LIFT", "CONFIDENCE", "USERS"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 600, color: GRAY_500, letterSpacing: 0.5, borderBottom: `1px solid ${GRAY_200}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(exp => (
              <tr key={exp.id} onClick={() => onSelectExperiment(exp)} style={{ cursor: "pointer", borderBottom: `1px solid ${GRAY_100}` }}
                onMouseEnter={e => e.currentTarget.style.background = GRAY_50}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "12px 14px" }}><StatusBadge status={exp.status} /></td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 600, color: GRAY_900 }}>{exp.name}</div>
                  <div style={{ fontSize: 11, color: GRAY_400, marginTop: 2 }}>{exp.hypothesis}</div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: TEAL_DARK, background: TEAL_LIGHT, padding: "3px 8px", borderRadius: 4, fontFamily: "monospace" }}>
                    {exp.config}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: GRAY_700, fontFamily: "monospace" }}>{exp.metric}</td>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: exp.lift.startsWith("+") ? GREEN : GRAY_400 }}>{exp.lift}</td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: GRAY_200, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, width: exp.confidence === "—" ? "0%" : exp.confidence, background: parseInt(exp.confidence) >= 95 ? GREEN : parseInt(exp.confidence) >= 85 ? AMBER : GRAY_400 }} />
                    </div>
                    <span style={{ fontSize: 12, color: GRAY_700 }}>{exp.confidence}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 14px", fontSize: 12, color: GRAY_700 }}>{exp.users.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CreateExperiment = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [showConfigPicker, setShowConfigPicker] = useState(false);
  const [hypothesis, setHypothesis] = useState("");
  const [expName, setExpName] = useState("");
  const [variants, setVariants] = useState([
    { name: "Control", traffic: 50, value: "" },
    { name: "Variant B", traffic: 50, value: "" },
  ]);
  const [goal, setGoal] = useState("");

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: GRAY_500, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>
        ← Back to experiments
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: GRAY_900, margin: "0 0 4px" }}>New experiment</h1>
      <p style={{ fontSize: 13, color: GRAY_500, margin: "0 0 24px" }}>Define your hypothesis, pick what to test, and set your success metric.</p>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 0, marginBottom: 32 }}>
        {[
          { n: 1, label: "Hypothesis & config" },
          { n: 2, label: "Variants & traffic" },
          { n: 3, label: "Goals & launch" },
        ].map((s, i) => (
          <div key={s.n} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, background: step >= s.n ? TEAL : GRAY_200, color: step >= s.n ? "#fff" : GRAY_400,
              }}>{s.n}</div>
              <span style={{ fontSize: 13, fontWeight: step === s.n ? 600 : 400, color: step === s.n ? GRAY_900 : GRAY_400 }}>{s.label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 1, background: step > s.n ? TEAL : GRAY_200, margin: "0 12px" }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Hypothesis & Config */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${GRAY_200}`, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: GRAY_900, margin: "0 0 16px" }}>What do you want to test?</h3>

            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY_500, marginBottom: 6 }}>EXPERIMENT NAME</label>
            <input value={expName} onChange={e => setExpName(e.target.value)} placeholder="e.g. Homepage hero image test" style={{
              width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${GRAY_200}`, fontSize: 13.5, outline: "none", boxSizing: "border-box", marginBottom: 16,
            }} />

            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY_500, marginBottom: 6 }}>HYPOTHESIS</label>
            <textarea value={hypothesis} onChange={e => setHypothesis(e.target.value)} rows={3} placeholder="e.g. Changing the CTA button color to green will increase purchase conversion by 10%" style={{
              width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${GRAY_200}`, fontSize: 13.5, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
            }} />
          </div>

          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${GRAY_200}`, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: GRAY_900, margin: "0 0 4px" }}>Link a remote config</h3>
            <p style={{ fontSize: 12, color: GRAY_400, margin: "0 0 16px" }}>Pick an existing configuration to experiment on — or create a new one.</p>

            {!selectedConfig ? (
              <div>
                <button onClick={() => setShowConfigPicker(!showConfigPicker)} style={{
                  width: "100%", padding: "14px 16px", borderRadius: 8, border: `2px dashed ${GRAY_300}`, background: GRAY_50,
                  color: GRAY_500, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 18, color: TEAL }}>+</span> Select existing config or create new
                </button>

                {showConfigPicker && (
                  <div style={{ marginTop: 12, background: "#fff", borderRadius: 10, border: `1px solid ${GRAY_200}`, boxShadow: SHADOW, overflow: "hidden" }}>
                    <div style={{ padding: "8px 12px", borderBottom: `1px solid ${GRAY_100}` }}>
                      <input placeholder="Search configs..." style={{ width: "100%", border: "none", outline: "none", fontSize: 13, padding: "4px 0", background: "transparent" }} />
                    </div>
                    {configs.map(c => (
                      <div key={c.key} onClick={() => { setSelectedConfig(c); setShowConfigPicker(false); }}
                        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${GRAY_100}` }}
                        onMouseEnter={e => e.currentTarget.style.background = GRAY_50}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: GRAY_900 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: GRAY_400, fontFamily: "monospace" }}>{c.key}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: GRAY_400, background: GRAY_100, padding: "2px 8px", borderRadius: 4 }}>{c.type}</span>
                          <span style={{ fontSize: 11, color: GRAY_400 }}>{c.params} param{c.params > 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    ))}
                    <div onClick={() => { setSelectedConfig({ key: "new_config", name: "New Config (inline)", type: "—", params: 0, isNew: true }); setShowConfigPicker(false); }}
                      style={{ padding: "12px 14px", cursor: "pointer", background: GRAY_100, display: "flex", alignItems: "center", gap: 8, color: GRAY_900, fontSize: 13, fontWeight: 500 }}>
                      <span style={{ fontSize: 16 }}>+</span> Create a new config for this experiment
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 10, border: `1px solid ${GRAY_200}`, background: GRAY_100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: TEAL, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>RC</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: GRAY_900 }}>{selectedConfig.name}</div>
                    <div style={{ fontSize: 11, color: GRAY_500, fontFamily: "monospace" }}>{selectedConfig.key}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedConfig(null)} style={{ background: "none", border: "none", color: GRAY_400, cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
            )}

            {selectedConfig?.isNew && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 8, border: `1px solid ${GRAY_200}`, background: GRAY_50 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: GRAY_500, marginBottom: 8 }}>QUICK CONFIG SETUP</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: GRAY_400, marginBottom: 4, display: "block" }}>Config name</label>
                    <input placeholder="e.g. hero_image_config" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${GRAY_200}`, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: GRAY_400, marginBottom: 4, display: "block" }}>Parameter key</label>
                    <input placeholder="e.g. hero_variant" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${GRAY_200}`, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <p style={{ fontSize: 11, color: GRAY_400, margin: "10px 0 0", lineHeight: 1.5 }}>
                  This will create a lightweight remote config automatically. You can add more parameters later from the Remote Configuration screen.
                </p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${GRAY_200}`, background: "#fff", color: GRAY_700, fontSize: 13, cursor: "pointer" }}>Save draft</button>
            <button onClick={() => setStep(2)} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: TEAL, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 2: Variants & Traffic */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${GRAY_200}`, padding: 24, boxShadow: SHADOW }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: GRAY_900, margin: "0 0 4px" }}>Define your variants</h3>
            <p style={{ fontSize: 12, color: GRAY_400, margin: "0 0 20px" }}>Set the value each group will receive and split the traffic.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {variants.map((v, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                  <div style={{ flex: 1, padding: "14px 16px", borderRadius: 8, border: `1px solid ${i === 0 ? GRAY_200 : TEAL}`, background: i === 0 ? GRAY_50 : "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: i === 0 ? GRAY_400 : TEAL }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: GRAY_900 }}>{v.name}</span>
                        {i === 0 && <span style={{ fontSize: 10, color: GRAY_400, background: GRAY_200, padding: "1px 6px", borderRadius: 4 }}>BASELINE</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="number" value={v.traffic} onChange={e => {
                          const nv = [...variants]; nv[i].traffic = parseInt(e.target.value) || 0; setVariants(nv);
                        }} style={{ width: 48, padding: "4px 6px", borderRadius: 4, border: `1px solid ${GRAY_200}`, fontSize: 13, textAlign: "center", outline: "none" }} />
                        <span style={{ fontSize: 12, color: GRAY_400 }}>%</span>
                      </div>
                    </div>
                    <input placeholder={i === 0 ? 'Control value (e.g. "Welcome back!")' : 'Variant value (e.g. "Good to see you!")'} value={v.value}
                      onChange={e => { const nv = [...variants]; nv[i].value = e.target.value; setVariants(nv); }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${GRAY_200}`, fontSize: 12.5, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  {i > 1 && (
                    <button onClick={() => setVariants(variants.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: GRAY_400, cursor: "pointer", fontSize: 18, padding: "0 4px", alignSelf: "center" }}>×</button>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setVariants([...variants, { name: `Variant ${String.fromCharCode(66 + variants.length - 1)}`, traffic: 0, value: "" }])}
              style={{ marginTop: 12, padding: "8px 14px", borderRadius: 6, border: `1px dashed ${GRAY_300}`, background: "transparent", color: GRAY_500, fontSize: 12, cursor: "pointer", width: "100%" }}>
              + Add variant
            </button>

            {/* Traffic visualization */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: GRAY_500, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Traffic distribution</div>
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: GRAY_100 }}>
                {variants.map((v, i) => (
                  <div key={i} style={{ width: `${v.traffic}%`, background: i === 0 ? GRAY_400 : i === 1 ? TEAL : BLUE, transition: "width 0.3s" }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                {variants.map((v, i) => (
                  <span key={i} style={{ fontSize: 11, color: GRAY_500, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: i === 0 ? GRAY_400 : i === 1 ? TEAL : BLUE }} />
                    {v.name}: {v.traffic}%
                  </span>
                ))}
              </div>
              {variants.reduce((s, v) => s + v.traffic, 0) !== 100 && (
                <div style={{ marginTop: 8, fontSize: 11, color: RED, fontWeight: 500 }}>
                  Traffic must sum to 100% (currently {variants.reduce((s, v) => s + v.traffic, 0)}%)
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${GRAY_200}`, background: "#fff", color: GRAY_700, fontSize: 13, cursor: "pointer" }}>← Back</button>
            <button onClick={() => setStep(3)} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: TEAL, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Next →</button>
          </div>
        </div>
      )}

      {/* Step 3: Goals & Launch */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${GRAY_200}`, padding: 24, boxShadow: SHADOW }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: GRAY_900, margin: "0 0 4px" }}>Set your success metric</h3>
            <p style={{ fontSize: 12, color: GRAY_400, margin: "0 0 20px" }}>How will you know if the variant wins?</p>

            <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY_500, marginBottom: 6 }}>PRIMARY CONVERSION GOAL</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${GRAY_200}`, fontSize: 13, outline: "none", background: "#fff", marginBottom: 16 }}>
              <option value="">Select an event...</option>
              <option value="purchase_completed">purchase_completed</option>
              <option value="signup_completed">signup_completed</option>
              <option value="session_duration">session_duration (avg.)</option>
              <option value="button_click">button_click</option>
              <option value="screen_view">screen_view</option>
              <option value="onboarding_completed">onboarding_completed</option>
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY_500, marginBottom: 6 }}>TARGET SEGMENT</label>
                <select style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${GRAY_200}`, fontSize: 13, outline: "none", background: "#fff" }}>
                  <option>All users</option>
                  <option>New users (last 7 days)</option>
                  <option>Premium users</option>
                  <option>iOS users</option>
                  <option>Android users</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY_500, marginBottom: 6 }}>MINIMUM SAMPLE SIZE</label>
                <input type="number" defaultValue={10000} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${GRAY_200}`, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${GRAY_200}`, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: GRAY_900, margin: "0 0 16px" }}>Experiment duration</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY_500, marginBottom: 6 }}>START</label>
                <select style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${GRAY_200}`, fontSize: 13, outline: "none", background: "#fff" }}>
                  <option>Immediately on launch</option>
                  <option>Schedule for later</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: GRAY_500, marginBottom: 6 }}>AUTO-STOP AFTER</label>
                <select style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${GRAY_200}`, fontSize: 13, outline: "none", background: "#fff" }}>
                  <option>7 days</option>
                  <option>14 days</option>
                  <option>30 days</option>
                  <option>When confidence reaches 95%</option>
                  <option>Manual stop only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary card */}
          <div style={{ background: GRAY_100, borderRadius: 10, border: `1px solid ${GRAY_200}`, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: GRAY_900, marginBottom: 8 }}>Experiment summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 12 }}>
              <div><span style={{ color: GRAY_500 }}>Config:</span> <span style={{ color: GRAY_900, fontWeight: 500 }}>{selectedConfig?.name || "—"}</span></div>
              <div><span style={{ color: GRAY_500 }}>Variants:</span> <span style={{ color: GRAY_900, fontWeight: 500 }}>{variants.length}</span></div>
              <div><span style={{ color: GRAY_500 }}>Goal:</span> <span style={{ color: GRAY_900, fontWeight: 500, fontFamily: "monospace" }}>{goal || "—"}</span></div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(2)} style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${GRAY_200}`, background: "#fff", color: GRAY_700, fontSize: 13, cursor: "pointer" }}>← Back</button>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${GRAY_200}`, background: "#fff", color: GRAY_700, fontSize: 13, cursor: "pointer" }}>Save draft</button>
              <button style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: TEAL, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Launch experiment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ExperimentDetail = ({ experiment, onBack }) => {
  const [tab, setTab] = useState("results");
  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: GRAY_500, fontSize: 13, cursor: "pointer", marginBottom: 16, padding: 0 }}>
        ← Back to experiments
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: GRAY_900, margin: 0 }}>{experiment.name}</h1>
            <StatusBadge status={experiment.status} />
          </div>
          <p style={{ fontSize: 13, color: GRAY_500, margin: "4px 0 0" }}>{experiment.hypothesis}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {experiment.status === "RUNNING" && <button style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${AMBER}`, background: "#FEF3C7", color: "#92400E", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Pause</button>}
          {experiment.status === "RUNNING" && <button style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${RED}`, background: "#FEE2E2", color: "#991B1B", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>Stop</button>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: `1px solid ${GRAY_200}` }}>
        {["results", "config", "settings"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 18px", border: "none", background: "none", fontSize: 13, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? TEAL_DARK : GRAY_500, borderBottom: `2px solid ${tab === t ? TEAL : "transparent"}`, cursor: "pointer", textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      {tab === "results" && (
        <div>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Users exposed", value: experiment.users.toLocaleString(), sub: "across all variants" },
              { label: "Control conv. rate", value: "3.2%", sub: "baseline" },
              { label: "Best variant conv.", value: "3.6%", sub: "Variant B", color: GREEN },
              { label: "Lift", value: experiment.lift, sub: `${experiment.confidence} confidence`, color: parseInt(experiment.confidence) >= 95 ? GREEN : AMBER },
            ].map((c, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "16px 18px", border: `1px solid ${GRAY_200}`, boxShadow: SHADOW }}>
                <div style={{ fontSize: 11, color: GRAY_500, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{c.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: c.color || GRAY_900, marginTop: 4 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: c.color || GRAY_400, marginTop: 2 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Variant comparison */}
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${GRAY_200}`, padding: 24, marginBottom: 20, boxShadow: SHADOW }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: GRAY_900, margin: "0 0 16px" }}>Variant performance</h3>
            {[
              { name: "Control", rate: 3.2, users: Math.round(experiment.users / 2), color: GRAY_400 },
              { name: "Variant B", rate: 3.6, users: Math.round(experiment.users / 2), color: TEAL, winner: true },
            ].map((v, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: i === 0 ? `1px solid ${GRAY_100}` : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.color }} />
                <div style={{ width: 100 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: GRAY_900 }}>{v.name}</div>
                  {v.winner && <span style={{ fontSize: 9, fontWeight: 700, background: "#DCFCE7", color: "#166534", padding: "1px 6px", borderRadius: 4 }}>LEADER</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 20, background: GRAY_100, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${v.rate / 5 * 100}%`, height: "100%", background: v.color, borderRadius: 4, transition: "width 0.5s" }} />
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: v.color, minWidth: 50 }}>{v.rate}%</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: GRAY_500, minWidth: 80, textAlign: "right" }}>{v.users.toLocaleString()} users</div>
              </div>
            ))}
          </div>

          {/* Connected config info */}
          <div style={{ background: GRAY_100, borderRadius: 10, border: `1px solid ${GRAY_200}`, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: TEAL, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>RC</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: GRAY_900 }}>Linked config: <span style={{ fontFamily: "monospace", color: TEAL_DARK }}>{experiment.config}</span></div>
                <div style={{ fontSize: 11, color: GRAY_400 }}>Changes to this config may affect running experiment</div>
              </div>
            </div>
            <button style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${GRAY_200}`, background: "#fff", color: GRAY_700, fontSize: 11, cursor: "pointer" }}>View config →</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [activeMenu, setActiveMenu] = useState("ab_testing");
  const [view, setView] = useState("list");
  const [selectedExperiment, setSelectedExperiment] = useState(null);

  const mainContent = () => {
    if (activeMenu === "remote_config") {
      return (
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: GRAY_900, margin: "0 0 4px" }}>Remote Configuration</h1>
          <p style={{ fontSize: 13, color: GRAY_500, margin: "0 0 24px" }}>Control app behavior and features without releasing a new version.</p>
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${GRAY_200}`, overflow: "hidden", boxShadow: SHADOW }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: GRAY_50 }}>
                  {["CONFIG NAME", "KEY", "TYPE", "PARAMETERS", "EXPERIMENTS"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 600, color: GRAY_500, letterSpacing: 0.5, borderBottom: `1px solid ${GRAY_200}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {configs.map(c => (
                  <tr key={c.key} style={{ borderBottom: `1px solid ${GRAY_100}` }}>
                    <td style={{ padding: "12px 14px", fontWeight: 500, color: GRAY_900 }}>{c.name}</td>
                    <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: GRAY_500 }}>{c.key}</td>
                    <td style={{ padding: "12px 14px" }}><span style={{ padding: "2px 8px", borderRadius: 4, background: BLUE_LIGHT, color: "#1D4ED8", fontSize: 11 }}>{c.type}</span></td>
                    <td style={{ padding: "12px 14px", color: GRAY_500 }}>{c.params}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {experiments.filter(e => e.config === c.key).length > 0 ? (
                        <span style={{ fontSize: 11, color: TEAL_DARK, background: TEAL_LIGHT, padding: "2px 8px", borderRadius: 4 }}>
                          {experiments.filter(e => e.config === c.key).length} experiment(s)
                        </span>
                      ) : <span style={{ fontSize: 11, color: GRAY_400 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    if (view === "create") return <CreateExperiment onBack={() => setView("list")} />;
    if (view === "detail" && selectedExperiment) return <ExperimentDetail experiment={selectedExperiment} onBack={() => { setView("list"); setSelectedExperiment(null); }} />;
    return <ExperimentList onCreateNew={() => setView("create")} onSelectExperiment={exp => { setSelectedExperiment(exp); setView("detail"); }} />;
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: '"Inter", sans-serif', background: "#fff" }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: GRAY_50, borderRight: `1px solid ${GRAY_200}`, padding: "16px 12px", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "4px 10px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: GRAY_900, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, letterSpacing: 0.4 }}>RC</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: GRAY_900 }}>Remote Config</div>
            <div style={{ fontSize: 11, color: GRAY_400 }}>Configuration workspace</div>
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: GRAY_400, padding: "0 16px 8px", letterSpacing: 1, textTransform: "uppercase" }}>Main menu</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <SidebarItem icon="FV" label="Favorites" />
          <SidebarItem icon="DB" label="Dashboard" />
          <SidebarItem icon="MS" label="Messages" />
          <SidebarItem icon="WT" label="Web Tools" />
          <SidebarItem icon="JR" label="Journeys" />
          <SidebarItem icon="MI" label="Mobile Inapp" />
          <SidebarItem icon="TG" label="Targeting" />
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: GRAY_400, padding: "16px 16px 8px", letterSpacing: 1, textTransform: "uppercase" }}>Configuration</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <SidebarItem icon="RC" label="Remote Config" active={activeMenu === "remote_config"} onClick={() => { setActiveMenu("remote_config"); setView("list"); }} />
          <SidebarItem icon="AB" label="A/B Testing" active={activeMenu === "ab_testing"} onClick={() => { setActiveMenu("ab_testing"); setView("list"); }} isNew />
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: GRAY_400, padding: "16px 16px 8px", letterSpacing: 1, textTransform: "uppercase" }}>Insights</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <SidebarItem icon="RP" label="Reports" />
          <SidebarItem icon="AN" label="Analytics" />
          <SidebarItem icon="ST" label="Settings" />
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto", padding: "28px 32px", background: "#fff" }}>
        {mainContent()}
      </div>
    </div>
  );
}
