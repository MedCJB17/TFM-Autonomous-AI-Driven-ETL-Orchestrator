import { useState, useEffect } from "react";
import {
 LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
 ResponsiveContainer, ReferenceLine
} from "recharts";
import { AlertTriangle, Sun, Activity, TrendingUp, Thermometer, Waves, Wind, CloudSun } from "lucide-react";

// EDIT THIS: paste your n8n webhook URL here
const WEBHOOK_URL = "http://localhost:5678/webhook/health-data";

const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const COLORS = {
 bg: "#F7FAFC",
 panel: "#FFFFFF",
 panelBorder: "#E1E8F0",
 text: "#1A2B3C",
 subtext: "#5B6B7F",
 muted: "#8FA1B3",
 sun: "#F5A623",
 sky: "#2196C4",
 riskHigh: "#E5484D",
 climate: "#0EA5A0",
 forecast: "#5B7FDB",
 sea: "#0EA5D9",
 air: "#8B7FE8",
};

function scoreColor(score) {
 if (score == null) return COLORS.subtext;
 if (score < 40) return COLORS.riskHigh;
 if (score < 70) return COLORS.sun;
 return COLORS.climate;
}

const severityColor = (sev) => {
 const s = (sev || "").toLowerCase();
 if (s === "high" || s === "severe") return COLORS.riskHigh;
 if (s === "medium" || s === "moderate") return COLORS.sun;
 return COLORS.air;
};

function Panel({ icon, title, children }) {
 return (
   <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 1px 2px rgba(26,43,60,0.04)" }}>
     <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.subtext, marginBottom: 12 }}>
       {icon}{title}
     </div>
     {children}
   </div>
 );
}

function StatRow({ items }) {
 return (
   <div style={{ display: "flex", background: "#F0F5FA", borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.panelBorder}` }}>
     {items.map((it, i) => (
       <div key={i} style={{ flex: 1, padding: "12px 14px", borderRight: i < items.length - 1 ? `1px solid ${COLORS.panelBorder}` : "none" }}>
         <div style={{ fontSize: 10, color: COLORS.subtext, textTransform: "uppercase", letterSpacing: "0.05em" }}>{it.label}</div>
         <div style={{ fontSize: 18, fontWeight: 600, color: it.color || COLORS.text, marginTop: 3 }}>
           {it.value ?? "—"}{it.unit && it.value != null ? <span style={{ fontSize: 11, color: COLORS.subtext }}> {it.unit}</span> : null}
         </div>
       </div>
     ))}
   </div>
 );
}

function TrendChart({ data, dataKey, xKey, color, domain, label }) {
 return (
   <Panel title={label}>
     <ResponsiveContainer width="100%" height={190}>
       <LineChart data={data}>
         <CartesianGrid stroke={COLORS.panelBorder} vertical={false} />
         <XAxis dataKey={xKey} tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.panelBorder }} tickLine={false} />
         <YAxis domain={domain || ["auto", "auto"]} tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.panelBorder }} tickLine={false} />
         <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, fontSize: 12 }} />
         <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} />
       </LineChart>
     </ResponsiveContainer>
   </Panel>
 );
}

const TABS = [
 { key: "overview", label: "Overview", icon: <Activity size={14} /> },
 { key: "weather", label: "Weather", icon: <Thermometer size={14} /> },
 { key: "marine", label: "Marine", icon: <Waves size={14} /> },
 { key: "air", label: "Air quality", icon: <Wind size={14} /> },
 { key: "forecast", label: "Forecast", icon: <TrendingUp size={14} /> },
];

export default function Dashboard() {
 const [data, setData] = useState(null);
 const [error, setError] = useState(null);
 const [loading, setLoading] = useState(true);
 const [lastUpdated, setLastUpdated] = useState(null);
 const [tab, setTab] = useState("overview");

 const loadData = () => {
   fetch(WEBHOOK_URL)
     .then((r) => { if (!r.ok) throw new Error(`Request failed (${r.status})`); return r.json(); })
     .then((json) => { setData(json); setError(null); setLoading(false); setLastUpdated(new Date()); })
     .catch((e) => { setError(e.message); setLoading(false); });
 };

 useEffect(() => {
   loadData();
   const id = setInterval(loadData, REFRESH_INTERVAL_MS);
   return () => clearInterval(id);
 }, []);

 const healthScores = (data?.healthScores || []).slice().reverse().map((d) => ({ ...d, total_score: Number(d.total_score) }));
 const anomalies = data?.anomalies || [];
  const forecast = (data?.forecast || []).map((d) => ({ ...d, predicted_health_score: Number(d.predicted_health_score) }));
 const weather = (data?.weather || []).slice().reverse().map((d) => ({
   ...d, temp_max: Number(d.temp_max), temp_min: Number(d.temp_min),
   precipitation: Number(d.precipitation), windspeed_max: Number(d.windspeed_max),
   humidity_max: Number(d.humidity_max), uv_index_max: Number(d.uv_index_max),
 }));
 const marine = (data?.marine || []).slice().reverse().map((d) => ({
   ...d, sea_temp_max: Number(d.sea_temp_max), wave_height_max: Number(d.wave_height_max),
 }));
 const air = (data?.airQuality || []).slice().reverse().map((d) => ({
   ...d, pm25_avg: Number(d.pm25_avg), pm10_avg: Number(d.pm10_avg),
   no2_avg: Number(d.no2_avg), o3_avg: Number(d.o3_avg),
 }));

 const latest = healthScores[healthScores.length - 1];
 const briefing = data?.briefing;
 const forecastWeek = data?.liveForecastWeek || [];
 const latestWeather = weather[weather.length - 1];
 const latestMarine = marine[marine.length - 1];
 const latestAir = air[air.length - 1];

 const breakdown = latest ? [
   { name: "Temp", value: Number(latest.temp_score) },
   { name: "AQI", value: Number(latest.aqi_score) },
   { name: "UV", value: Number(latest.uv_score) },
   { name: "Humidity", value: Number(latest.humidity_score) },
 ] : [];

 return (
   <div style={{ minHeight: "100%", background: COLORS.bg, color: COLORS.text, fontFamily: "'Söhne', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif", padding: "32px 24px" }}>
     <div style={{ maxWidth: 980, margin: "0 auto" }}>
       <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
         <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
           <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #F5A623, #2196C4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
             <CloudSun size={20} color="#fff" />
           </div>
           <div>
             <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: COLORS.subtext }}>Spain summer health &amp; climate</div>
             <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Madrid daily briefing</h1>
           </div>
         </div>
         {lastUpdated && <div style={{ fontSize: 12, color: COLORS.muted }}>Updated {lastUpdated.toLocaleTimeString()}</div>}
       </div>

       <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${COLORS.panelBorder}` }}>
         {TABS.map((t) => (
           <button
             key={t.key}
             onClick={() => setTab(t.key)}
             style={{
               display: "flex", alignItems: "center", gap: 6,
               background: "none", border: "none", cursor: "pointer",
               padding: "10px 14px", fontSize: 13, fontWeight: 500,
               color: tab === t.key ? COLORS.text : COLORS.muted,
               borderBottom: tab === t.key ? `2px solid ${COLORS.sky}` : "2px solid transparent",
             }}
           >
             {t.icon}{t.label}
           </button>
         ))}
       </div>

       {loading && <div style={{ color: COLORS.subtext, padding: "40px 0" }}>Loading latest data…</div>}

       {error && (
         <div style={{ background: "#FDECEC", border: "1px solid #F3C0C0", borderRadius: 10, padding: 16, color: "#B3261E", display: "flex", gap: 10, alignItems: "flex-start" }}>
           <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
           <div>
             <div style={{ fontWeight: 600, marginBottom: 4 }}>Couldn't reach the data API</div>
             <div style={{ fontSize: 13 }}>{error}</div>
           </div>
         </div>
       )}

       {!loading && !error && tab === "overview" && (
         <>
           <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, marginBottom: 16 }}>
             <div style={{ background: "linear-gradient(160deg, #FFF7E8, #FFFFFF)", border: `1px solid ${COLORS.panelBorder}`, borderRadius: 14, padding: 20 }}>
               <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.subtext, marginBottom: 8 }}>Health risk score</div>
               <div style={{ fontSize: 42, fontWeight: 700, color: scoreColor(latest?.total_score), lineHeight: 1 }}>{latest?.total_score ?? "—"}</div>
               <div style={{ fontSize: 13, color: scoreColor(latest?.total_score), marginTop: 6, fontWeight: 500 }}>{latest?.label || "No data"}</div>
               <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 10 }}>{latest?.score_date}</div>
             </div>
             <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 14, padding: 20 }}>
               <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.subtext, marginBottom: 10 }}>
                 <Sun size={14} color={COLORS.sun} />AI-generated briefing
               </div>
               <div style={{ fontSize: 14, lineHeight: 1.6, color: COLORS.text }}>{briefing?.briefing_text || "No briefing available for the latest run."}</div>
             </div>
           </div>

           <Panel icon={<Thermometer size={14} />} title="Conditions — latest day">
             <StatRow items={[
               { label: "Max temp", value: latest?.temp_max, unit: "°C" },
               { label: "UV index", value: latest?.uv_index },
               { label: "Humidity", value: latest?.humidity, unit: "%" },
               { label: "Sea temp", value: latest?.sea_temp, unit: "°C" },
               { label: "PM2.5", value: latest?.pm25_avg },
               { label: "AQI breaches", value: latest?.aqi_breaches },
             ]} />
           </Panel>

           <Panel icon={<Activity size={14} />} title="Health score">
             <ResponsiveContainer width="100%" height={210}>
               <LineChart data={healthScores}>
                 <CartesianGrid stroke={COLORS.panelBorder} vertical={false} />
                 <XAxis dataKey="score_date" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.panelBorder }} tickLine={false} />
                 <YAxis domain={[0, 100]} tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.panelBorder }} tickLine={false} />
                 <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, fontSize: 12 }} />
                 <ReferenceLine y={40} stroke={COLORS.riskHigh} strokeDasharray="4 4" />
                 <Line type="monotone" dataKey="total_score" stroke={COLORS.sun} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.sun }} />
               </LineChart>
             </ResponsiveContainer>
           </Panel>

           <Panel title="Score breakdown — latest day">
             <ResponsiveContainer width="100%" height={150}>
               <BarChart data={breakdown} layout="vertical" margin={{ left: 10 }}>
                 <CartesianGrid stroke={COLORS.panelBorder} horizontal={false} />
                 <XAxis type="number" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.panelBorder }} tickLine={false} />
                 <YAxis type="category" dataKey="name" tick={{ fill: COLORS.muted, fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                 <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, fontSize: 12 }} />
                 <Bar dataKey="value" fill={COLORS.climate} radius={[0, 4, 4, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </Panel>

           <Panel icon={<AlertTriangle size={14} />} title={`Detected anomalies (${anomalies.length})`}>
             {anomalies.length === 0 ? (
               <div style={{ color: COLORS.subtext, fontSize: 13, padding: "8px 0" }}>No anomalies flagged in the current window.</div>
             ) : (
               <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 {anomalies.slice(0, 5).map((a, i) => (
                   <div key={i} style={{ padding: "10px 12px", background: "#F5F2FE", border: "1px solid #E3D9FA", borderRadius: 8 }}>
                     <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                       <span style={{ color: COLORS.text }}>{a.source} — {a.column_name}</span>
                       <span style={{ color: severityColor(a.severity), fontWeight: 600 }}>{a.severity}</span>
                     </div>
                     <div style={{ fontSize: 12, color: COLORS.subtext, marginTop: 4 }}>{a.description}</div>
                   </div>
                 ))}
                 {anomalies.length > 5 && (
                   <div style={{ textAlign: "center", fontSize: 12, color: COLORS.muted, padding: "4px 0" }}>
                     {anomalies.length - 5} more in the current window
                   </div>
                 )}
               </div>
             )}
           </Panel>
         </>
       )}

       {!loading && !error && tab === "weather" && (
         <>
           <Panel icon={<Thermometer size={14} />} title="Latest reading">
             <StatRow items={[
               { label: "Max temp", value: latestWeather?.temp_max, unit: "°C" },
               { label: "Min temp", value: latestWeather?.temp_min, unit: "°C" },
               { label: "Precipitation", value: latestWeather?.precipitation, unit: "mm" },
               { label: "Wind", value: latestWeather?.windspeed_max, unit: "km/h" },
               { label: "Humidity", value: latestWeather?.humidity_max, unit: "%" },
               { label: "Heat risk", value: latestWeather?.heat_risk, color: latestWeather?.heat_risk === "HIGH" ? COLORS.riskHigh : COLORS.text },
             ]} />
           </Panel>
           <TrendChart data={weather} dataKey="temp_max" xKey="fetch_date" color={COLORS.sun} label="Max temperature" />
           <TrendChart data={weather} dataKey="uv_index_max" xKey="fetch_date" color={COLORS.forecast} domain={[0, 12]} label="UV index" />
           <TrendChart data={weather} dataKey="windspeed_max" xKey="fetch_date" color={COLORS.sky} label="Wind speed" />
         </>
       )}

       {!loading && !error && tab === "marine" && (
         <>
           <Panel icon={<Waves size={14} />} title="Latest reading">
             <StatRow items={[
               { label: "Sea temp", value: latestMarine?.sea_temp_max, unit: "°C" },
               { label: "Wave height", value: latestMarine?.wave_height_max, unit: "m" },
             ]} />
           </Panel>
           <TrendChart data={marine} dataKey="sea_temp_max" xKey="fetch_date" color={COLORS.sea} label="Sea temperature" />
           <TrendChart data={marine} dataKey="wave_height_max" xKey="fetch_date" color={COLORS.forecast} label="Wave height" />
         </>
       )}

       {!loading && !error && tab === "air" && (
         <>
           <Panel icon={<Wind size={14} />} title="Latest reading">
             <StatRow items={[
               { label: "PM2.5", value: latestAir?.pm25_avg },
               { label: "PM10", value: latestAir?.pm10_avg },
               { label: "NO2", value: latestAir?.no2_avg },
               { label: "O3", value: latestAir?.o3_avg },
               { label: "AQI status", value: latestAir?.aqi_status, color: latestAir?.aqi_status === "GOOD" ? COLORS.climate : COLORS.sun },
             ]} />
           </Panel>
           <TrendChart data={air} dataKey="pm25_avg" xKey="fetch_date" color={COLORS.air} label="PM2.5" />
           <TrendChart data={air} dataKey="no2_avg" xKey="fetch_date" color={COLORS.sun} label="NO2" />
           <TrendChart data={air} dataKey="o3_avg" xKey="fetch_date" color={COLORS.climate} label="O3" />
         </>
       )}

       {!loading && !error && tab === "forecast" && (
         <>
           {forecastWeek.length > 0 && (
             <Panel icon={<TrendingUp size={14} />} title="7-day forecast (live, Open-Meteo NWP)">
               <ResponsiveContainer width="100%" height={210}>
                 <LineChart data={forecastWeek}>
                   <CartesianGrid stroke={COLORS.panelBorder} vertical={false} />
                   <XAxis
                     dataKey="for_date"
                     tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                     tick={{ fill: COLORS.muted, fontSize: 11 }}
                     axisLine={{ stroke: COLORS.panelBorder }}
                     tickLine={false}
                   />
                   <YAxis domain={[0, 100]} tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.panelBorder }} tickLine={false} />
                   <Tooltip
                     contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, fontSize: 12 }}
                     labelFormatter={(d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                   />
                   <Line type="monotone" dataKey="predicted_health_score" stroke={COLORS.climate} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.climate }} />
                 </LineChart>
               </ResponsiveContainer>

               <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 16 }}>
                 {forecastWeek.map((d, i) => (
                   <div key={i} style={{
                     minWidth: 100, background: "#F0F5FA", border: `1px solid ${COLORS.panelBorder}`,
                     borderRadius: 10, padding: "10px 12px", flexShrink: 0
                   }}>
                     <div style={{ fontSize: 10, color: COLORS.subtext, marginBottom: 4 }}>
                       {i === 0 ? "Today" : new Date(d.for_date).toLocaleDateString('en-US', { weekday: 'short' })}
                     </div>
                     <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 6 }}>{d.for_date}</div>
                     <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor(d.predicted_health_score) }}>
                       {d.predicted_health_score}
                     </div>
                     <div style={{ fontSize: 10, color: scoreColor(d.predicted_health_score), marginBottom: 6 }}>{d.predicted_label}</div>
                     <div style={{ fontSize: 12, color: COLORS.text }}>{d.predicted_temp_max}°C</div>
                     <div style={{ fontSize: 10, color: COLORS.muted }}>UV {d.predicted_uv_index}</div>
                     <div style={{ fontSize: 10, color: COLORS.muted }}>PM2.5 {d.predicted_pm25 ?? "—"}</div>
                   </div>
                 ))}
               </div>
             </Panel>
           )}

           {forecast.length > 0 && (
             <Panel icon={<Activity size={14} />} title="Stored model forecast (linear regression / Holt smoothing)">
               <ResponsiveContainer width="100%" height={180}>
                 <LineChart data={forecast}>
                   <CartesianGrid stroke={COLORS.panelBorder} vertical={false} />
                   <XAxis dataKey="for_date" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.panelBorder }} tickLine={false} />
                   <YAxis domain={[0, 100]} tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.panelBorder }} tickLine={false} />
                   <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, borderRadius: 8, fontSize: 12 }} />
                   <Line type="monotone" dataKey="predicted_health_score" stroke={COLORS.forecast} strokeWidth={2.5} strokeDasharray="5 3" dot={{ r: 4, fill: COLORS.forecast }} />
                 </LineChart>
               </ResponsiveContainer>
               <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 10 }}>
                 Computed daily by the platform's own regression models and stored in BigQuery — see the day-card strip above for the live NWP-based comparison.
               </div>
             </Panel>
           )}
         </>
       )}
     </div>
   </div>
 );
}
