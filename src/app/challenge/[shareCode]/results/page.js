"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function ResultsPage() {
  const { shareCode } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchResults();
  }, [shareCode]);

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/picks/${shareCode}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        setError("Results not found");
      }
    } catch (err) {
      setError("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="results-page">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="results-page">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>{error}</h3>
          <Link href="/dashboard" className="btn btn-primary" style={{ display: "inline-flex" }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { challenge, picks } = data;
  const isResolved = challenge.status === "resolved";

  // actualResults may be stored as an array [{questionId, answer}] or a dict {q1: "India"}
  const rawResults = challenge.resolution?.actualResults;
  const actualResults = {};
  if (Array.isArray(rawResults)) {
    rawResults.forEach(r => { actualResults[r.questionId] = r.answer; });
  } else if (rawResults && typeof rawResults === "object") {
    Object.assign(actualResults, rawResults);
  }

  const totalQuestions = challenge.questions?.length || 5;

  // Sort picks by score (descending)
  const sortedPicks = [...picks].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <div className="results-page animate-fade-in">
      <div className="results-header">
        <h1>🏏 {challenge.match.title}</h1>
        <p style={{ color: "var(--clr-text-secondary)" }}>
          Challenge by @{challenge.createdBy.username}
          {isResolved && " · ✅ Resolved"}
        </p>
      </div>

      {/* Leaderboard */}
      <div className="dashboard-section">
        <h2>🏆 Leaderboard</h2>
        {sortedPicks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No participants yet</h3>
            <p>Share the challenge link to get friends involved!</p>
          </div>
        ) : (
          <div className="leaderboard">
            {sortedPicks.map((pick, index) => (
              <div
                key={pick.username}
                className={`leaderboard-item ${index === 0 && isResolved ? "rank-1" : ""} rank-${index + 1}`}
              >
                <div className="rank-badge">
                  {index === 0 && isResolved ? "👑" : index + 1}
                </div>
                <div className="leaderboard-username">@{pick.username}</div>
                <div className="leaderboard-score">
                  {isResolved && pick.score !== null ? (
                    <>
                      <div className="score-dots">
                        {Array.from({ length: totalQuestions }).map((_, i) => (
                          <div
                            key={i}
                            className={`score-dot ${i < pick.score ? "correct" : ""}`}
                          />
                        ))}
                      </div>
                      <span className="score-text">{pick.score}/{totalQuestions}</span>
                    </>
                  ) : (
                    <span className="score-text" style={{ color: "var(--clr-text-muted)" }}>
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breakdown Table */}
      {isResolved && sortedPicks.length > 0 && (
        <div className="dashboard-section">
          <h2>📊 Question Breakdown</h2>
          <div style={{ overflowX: "auto" }}>
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Question</th>
                  <th>Actual</th>
                  {sortedPicks.map((p) => (
                    <th key={p.username}>@{p.username}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {challenge.questions.map((q) => (
                  <tr key={q.id}>
                    <td style={{ textAlign: "left", fontWeight: 500 }}>{q.label}</td>
                    <td style={{ color: "var(--clr-accent-light)", fontWeight: 600 }}>
                      {actualResults[q.id] || "—"}
                    </td>
                    {sortedPicks.map((pick) => {
                      const userAnswer = pick.answers?.find(
                        (a) => a.questionId === q.id
                      )?.pick;
                      const isCorrect = userAnswer === actualResults[q.id];
                      return (
                        <td
                          key={pick.username}
                          className={isCorrect ? "result-correct" : "result-wrong"}
                        >
                          {isCorrect ? "✅" : "❌"}{" "}
                          <span style={{ fontSize: "0.75rem" }}>{userAnswer}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Not resolved yet */}
      {!isResolved && (
        <div className="picks-locked-msg" style={{ marginTop: "var(--space-xl)" }}>
          <div className="lock-icon">⏳</div>
          <h2>Awaiting Results</h2>
          <p>The match results are not yet available. Check back after the match!</p>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "var(--space-xl)" }}>
        <Link href="/dashboard" className="btn btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
