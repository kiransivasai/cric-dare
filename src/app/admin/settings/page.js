"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState({ apiProvider: "rapidapi" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [cacheClearing, setCacheClearing] = useState(false);
  const [squadCacheClearing, setSquadCacheClearing] = useState(false);
  const [apiLogs, setApiLogs] = useState({ stats: null, recentLogs: [], endpointCounts: [] });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login?callbackUrl=/admin/settings");
    } else if (status === "authenticated") {
      fetchSettings();
      fetchApiLogs();
    }
  }, [status, router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      } else if (res.status === 403 || res.status === 401) {
        router.replace("/dashboard");
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiLogs = async () => {
    try {
      const res = await fetch("/api/admin/api-logs");
      if (res.ok) {
        const data = await res.json();
        setApiLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch API logs:", err);
    }
  };

  const updateSetting = async (key, value) => {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });

      if (res.ok) {
        setSettings((prev) => ({ ...prev, [key]: value }));
        setMessage(`✅ ${key} updated to "${value}"`);
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await res.json();
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage("❌ Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const clearMatchCache = async () => {
    setCacheClearing(true);
    try {
      const res = await fetch("/api/admin/clear-cache", { method: "POST" });
      if (res.ok) {
        setMessage("✅ Match cache cleared! New data will be fetched on next request.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("❌ Failed to clear cache");
    } finally {
      setCacheClearing(false);
    }
  };

  const clearSquadCache = async () => {
    setSquadCacheClearing(true);
    try {
      const res = await fetch("/api/admin/clear-squad-cache", { method: "POST" });
      if (res.ok) {
        setMessage("✅ Player squad cache cleared!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("❌ Failed to clear squad cache");
    } finally {
      setSquadCacheClearing(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="dashboard-page">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="dashboard-header">
        <h1>⚙️ Admin Settings</h1>
        <p>Configure your CricDare application</p>
      </div>

      {message && (
        <div
          className={message.startsWith("✅") ? "form-success" : "form-error"}
          style={{ marginBottom: "var(--space-lg)" }}
        >
          {message}
        </div>
      )}

      {/* API Provider Selection */}
      <div className="dashboard-section">
        <h2>🌐 Cricket Data API</h2>
        <div className="question-card">
          <div className="question-card-header">
            <span className="question-number" style={{ background: "var(--gradient-primary)" }}>
              📡
            </span>
            <h3>Choose API Provider</h3>
          </div>
          <p style={{ color: "var(--clr-text-secondary)", fontSize: "0.85rem", marginBottom: "var(--space-lg)" }}>
            Select which API to use for fetching cricket match data. RapidAPI (Cricbuzz) is recommended for better data quality.
          </p>

          <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
            <button
              className={`api-provider-card ${settings.apiProvider === "rapidapi" ? "selected" : ""}`}
              onClick={() => updateSetting("apiProvider", "rapidapi")}
              disabled={saving}
            >
              <div className="provider-icon">🚀</div>
              <div className="provider-name">RapidAPI</div>
              <div className="provider-desc">Cricbuzz Data</div>
              {settings.apiProvider === "rapidapi" && (
                <div className="provider-active">Active</div>
              )}
            </button>

            <button
              className={`api-provider-card ${settings.apiProvider === "cricapi" ? "selected" : ""}`}
              onClick={() => updateSetting("apiProvider", "cricapi")}
              disabled={saving}
            >
              <div className="provider-icon">🏏</div>
              <div className="provider-name">CricAPI</div>
              <div className="provider-desc">cricapi.com</div>
              {settings.apiProvider === "cricapi" && (
                <div className="provider-active">Active</div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* API Usage Analytics */}
      <div className="dashboard-section" style={{ marginTop: "var(--space-xl)" }}>
        <h2>📊 API Usage Analytics</h2>
        
        {apiLogs.stats && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
            <div className="stat-card" style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.05))" }}>
              <div className="stat-label">RapidAPI (Cricbuzz)</div>
              <div className="stat-value">{apiLogs.stats.rapidapi.count} <span style={{fontSize: "1rem", color: "var(--clr-text-secondary)"}}>hits</span></div>
              <div className="stat-subtext">Avg Response: {apiLogs.stats.rapidapi.avgResponseTime}ms</div>
            </div>
            <div className="stat-card" style={{ background: "linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(219, 39, 119, 0.05))" }}>
              <div className="stat-label">CricAPI</div>
              <div className="stat-value">{apiLogs.stats.cricapi.count} <span style={{fontSize: "1rem", color: "var(--clr-text-secondary)"}}>hits</span></div>
              <div className="stat-subtext">Avg Response: {apiLogs.stats.cricapi.avgResponseTime}ms</div>
            </div>
          </div>
        )}

        {apiLogs.endpointCounts && apiLogs.endpointCounts.length > 0 && (
          <div className="question-card" style={{ marginBottom: "var(--space-lg)" }}>
            <div className="question-card-header">
              <span className="question-number" style={{ background: "var(--gradient-primary)" }}>
                🧮
              </span>
              <h3>Usage by Endpoint</h3>
            </div>
            
            <div style={{ overflowX: "auto", marginTop: "var(--space-md)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--clr-border)", color: "var(--clr-text-secondary)" }}>
                    <th style={{ padding: "10px" }}>Provider</th>
                    <th style={{ padding: "10px" }}>Endpoint</th>
                    <th style={{ padding: "10px" }}>Total Calls</th>
                    <th style={{ padding: "10px" }}>Avg Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {apiLogs.endpointCounts.map((count, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--clr-border)" }}>
                      <td style={{ padding: "10px" }}>
                        <span className={`meta-tag ${count.provider === 'rapidapi' ? 'winner' : ''}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                          {count.provider}
                        </span>
                      </td>
                      <td style={{ padding: "10px", fontFamily: "monospace", color: "var(--clr-primary-light)" }}>{count.endpoint}</td>
                      <td style={{ padding: "10px", fontWeight: 600 }}>{count.count}</td>
                      <td style={{ padding: "10px" }}>{count.avgResponseTime}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="question-card">
          <div className="question-card-header">
            <span className="question-number" style={{ background: "var(--gradient-secondary)" }}>
              📋
            </span>
            <h3>Recent API Calls</h3>
          </div>
          
          <div style={{ overflowX: "auto", marginTop: "var(--space-md)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--clr-border)", color: "var(--clr-text-secondary)" }}>
                  <th style={{ padding: "10px" }}>Time</th>
                  <th style={{ padding: "10px" }}>User</th>
                  <th style={{ padding: "10px" }}>Provider</th>
                  <th style={{ padding: "10px" }}>Endpoint</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {apiLogs.recentLogs.length > 0 ? (
                  apiLogs.recentLogs.map((log) => (
                    <tr key={log._id} style={{ borderBottom: "1px solid var(--clr-border)" }}>
                      <td style={{ padding: "10px" }}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                      <td style={{ padding: "10px", fontSize: "0.8rem", color: "var(--clr-text-secondary)" }}>
                        {log.userEmail === 'system' ? '🤖 System' 
                          : log.userEmail === 'anonymous' ? '👤 Anonymous' 
                          : log.userEmail ? log.userEmail 
                          : '🕰️ Legacy'}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span className={`meta-tag ${log.provider === 'rapidapi' ? 'winner' : ''}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                          {log.provider}
                        </span>
                      </td>
                      <td style={{ padding: "10px", fontFamily: "monospace", color: "var(--clr-primary-light)" }}>{log.endpoint}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ color: log.status === 200 ? "var(--clr-success)" : "var(--clr-error)", fontWeight: 600 }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px" }}>{log.responseTime ? `${log.responseTime}ms` : '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: "20px", textAlign: "center", color: "var(--clr-text-secondary)" }}>
                      No API logs found yet. Fetch matches to generate logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cache Management */}
      <div className="dashboard-section">
        <h2>🗄️ Cache Management</h2>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
          <div className="question-card">
            <div className="question-card-header">
              <span className="question-number" style={{ background: "var(--gradient-accent)" }}>
                🔄
              </span>
              <h3>Match Data Cache</h3>
            </div>
            <p style={{ color: "var(--clr-text-secondary)", fontSize: "0.85rem", marginBottom: "var(--space-lg)" }}>
              Match data is cached for 1 hour. Clear the cache to force a fresh fetch from the API.
            </p>
            <button
              className="btn btn-secondary"
              onClick={clearMatchCache}
              disabled={cacheClearing}
            >
              {cacheClearing ? "Clearing..." : "🗑️ Clear Match Cache"}
            </button>
          </div>

          <div className="question-card">
            <div className="question-card-header">
              <span className="question-number" style={{ background: "var(--gradient-secondary)" }}>
                👥
              </span>
              <h3>Player Squad Cache</h3>
            </div>
            <p style={{ color: "var(--clr-text-secondary)", fontSize: "0.85rem", marginBottom: "var(--space-lg)" }}>
              Team rosters and player ids are aggressively cached for 8 hours to avoid hitting RapidAPI rate limits during challenge creation.
            </p>
            <button
              className="btn btn-secondary"
              onClick={clearSquadCache}
              disabled={squadCacheClearing}
            >
              {squadCacheClearing ? "Clearing..." : "🗑️ Clear Squad Cache"}
            </button>
          </div>
        </div>
      </div>

      {/* API Keys Info */}
      <div className="dashboard-section">
        <h2>🔑 API Keys</h2>
        <div className="question-card">
          <div className="question-card-header">
            <span className="question-number" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
              🔐
            </span>
            <h3>Configuration</h3>
          </div>
          <p style={{ color: "var(--clr-text-secondary)", fontSize: "0.85rem", marginBottom: "var(--space-md)" }}>
            API keys are configured in <code style={{ color: "var(--clr-primary-light)", background: "var(--clr-surface)", padding: "2px 6px", borderRadius: "4px" }}>.env.local</code>. To change keys, update the file and restart the server.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            <div className="meta-tag" style={{ fontSize: "0.8rem" }}>
              RAPIDAPI_KEY: {process.env.NEXT_PUBLIC_HAS_RAPIDAPI ? "✅ Configured" : "••• (server-side only)"}
            </div>
            <div className="meta-tag" style={{ fontSize: "0.8rem" }}>
              CRICAPI_KEY: {process.env.NEXT_PUBLIC_HAS_CRICAPI ? "✅ Configured" : "••• (server-side only)"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
