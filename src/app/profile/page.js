"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to load stats", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container" style={{ padding: "var(--space-2xl) var(--space-lg)" }}>
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <main className="container animate-fade-in" style={{ padding: "var(--space-2xl) var(--space-lg)", maxWidth: "800px" }}>
      <div style={{ textAlign: "center", marginBottom: "var(--space-xl)" }}>
        <div style={{ fontSize: "4rem", marginBottom: "var(--space-xs)" }}>👤</div>
        <h1 style={{ marginBottom: "var(--space-xs)" }}>{session.user.name || "User Profile"}</h1>
        <p style={{ color: "var(--clr-primary-light)", fontSize: "1.2rem", fontWeight: 600 }}>@{session.user.username}</p>
        {session.user.isAdmin && (
          <span className="meta-tag" style={{ background: "var(--clr-accent)", color: "#000", marginTop: "var(--space-sm)", display: "inline-block" }}>
            Admin Access
          </span>
        )}
      </div>

      <div className="dashboard-section">
        <h2>📊 Your Stats</h2>
        <div className="dashboard-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
          <div className="stat-card">
            <div className="stat-value">{stats?.challengesCreated || 0}</div>
            <div className="stat-label">DARES CREATED</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.picksSubmitted || 0}</div>
            <div className="stat-label">PREDICTIONS</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.totalCorrectPicks || 0}</div>
            <div className="stat-label">CORRECT PICKS</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.totalPoints || 0}</div>
            <div className="stat-label">TOTAL POINTS</div>
          </div>
        </div>
      </div>

      <div className="dashboard-section" style={{ marginTop: "var(--space-xl)" }}>
        <h2>⚙️ Account Actions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)", marginTop: "var(--space-md)" }}>
          <button 
            className="btn" 
            style={{ 
              background: "rgba(239, 68, 68, 0.1)", 
              border: "1px solid rgba(239, 68, 68, 0.3)", 
              color: "var(--clr-danger)",
              width: "100%",
              padding: "var(--space-md)",
              display: "flex",
              justifyContent: "center",
              gap: "var(--space-sm)",
              fontSize: "1.1rem"
            }}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <span>🚪</span> Logout Securely
          </button>
        </div>
      </div>
    </main>
  );
}
