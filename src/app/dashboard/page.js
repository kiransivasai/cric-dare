"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [challenges, setChallenges] = useState({ created: [], joined: [] });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
        setChallenges({
          created: data.createdChallenges || [],
          joined: data.joinedChallenges || [],
        });
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
        <h1>
          Welcome back, <span style={{ color: "var(--clr-primary-light)" }}>@{session?.user?.username}</span>! 👋
        </h1>
        <p>Here&apos;s your cricket prediction overview</p>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value">{stats?.totalChallengesCreated || 0}</div>
          <div className="stat-label">Dares Created</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalPredictions || 0}</div>
          <div className="stat-label">Predictions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalCorrect || 0}</div>
          <div className="stat-label">Correct Picks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {stats?.totalPredictions
              ? `${Math.round(((stats?.totalCorrect || 0) / ((stats?.totalPredictions || 1) * 5)) * 100)}%`
              : "—"}
          </div>
          <div className="stat-label">Accuracy</div>
        </div>
      </div>

      {/* My Dares */}
      <div className="dashboard-section">
        <h2>🎯 My Dares</h2>
        {challenges.created.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏏</div>
            <h3>No dares yet</h3>
            <p>Create your first cricket dare and challenge your friends!</p>
            <Link href="/challenge/create" className="btn btn-primary" style={{ display: "inline-flex" }}>
              Create a Dare
            </Link>
          </div>
        ) : (
          <div className="challenges-grid">
            {challenges.created.map((c) => (
              <Link
                key={c.shareCode}
                href={c.status === "resolved" ? `/challenge/${c.shareCode}/results` : `/challenge/${c.shareCode}`}
                className="challenge-card"
              >
                <div className="challenge-card-teams">{c.match.title}</div>
                <div className="challenge-card-meta">
                  <span className="meta-tag">📅 {new Date(c.match.matchDate).toLocaleDateString()}</span>
                  <span className="meta-tag">📍 {c.match.venue || "TBD"}</span>
                  {c.participantCount > 0 && (
                    <span className="meta-tag">👥 {c.participantCount} players</span>
                  )}
                </div>
                <span className={`challenge-card-status status-${c.status}`}>
                  {c.status === "open" ? "🟢 Open" : c.status === "locked" ? "🔒 Locked" : "✅ Resolved"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Joined Dares */}
      <div className="dashboard-section">
        <h2>🤝 Joined Dares</h2>
        {challenges.joined.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📱</div>
            <h3>No joined dares</h3>
            <p>Ask a friend to share a dare link with you!</p>
          </div>
        ) : (
          <div className="challenges-grid">
            {challenges.joined.map((c) => (
              <Link
                key={c.shareCode}
                href={c.status === "resolved" ? `/challenge/${c.shareCode}/results` : `/challenge/${c.shareCode}`}
                className="challenge-card"
              >
                <div className="challenge-card-teams">{c.match.title}</div>
                <div className="challenge-card-meta">
                  <span className="meta-tag">by @{c.createdBy.username}</span>
                  <span className="meta-tag">📅 {new Date(c.match.matchDate).toLocaleDateString()}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
                  <span className={`challenge-card-status status-${c.status}`}>
                    {c.status === "open" ? "🟢 Open" : c.status === "locked" ? "🔒 Locked" : "✅ Resolved"}
                  </span>
                  {c.myScore !== null && c.myScore !== undefined && (
                    <span className="meta-tag" style={{ color: "var(--clr-primary-light)", fontWeight: 600 }}>
                      Score: {c.myScore}/5
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
