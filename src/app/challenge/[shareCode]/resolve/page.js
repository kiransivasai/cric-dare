"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResolvePage() {
  const { shareCode } = useParams();
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [challenge, setChallenge] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchChallenge();
  }, [shareCode]);

  const fetchChallenge = async () => {
    try {
      const res = await fetch(`/api/challenge/${shareCode}`);
      if (res.ok) {
        const data = await res.json();
        setChallenge(data.challenge);
      } else {
        setError("Challenge not found");
      }
    } catch (err) {
      setError("Failed to load challenge");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    setError("");

    // Validate all questions answered
    const allAnswered = challenge.questions.every((q) => answers[q.id]);
    if (!allAnswered) {
      setError("Please select the correct answer for all questions");
      return;
    }

    setSubmitting(true);

    try {
      // Build actualResults in the format the resolve API expects
      const actualResults = challenge.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id],
      }));

      const res = await fetch(`/api/resolve/${shareCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualResults, method: "manual" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("Failed to resolve challenge. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="picks-page">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="picks-page">
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

  // Auth check
  if (authStatus === "unauthenticated") {
    return (
      <div className="picks-page">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3>Login Required</h3>
          <p>You need to be logged in to resolve this challenge.</p>
          <Link href={`/auth/login?callbackUrl=${encodeURIComponent(`/challenge/${shareCode}/resolve`)}`} className="btn btn-primary" style={{ display: "inline-flex" }}>
            Login
          </Link>
        </div>
      </div>
    );
  }

  // Only creator can resolve
  const isCreator = session?.user?.id === challenge?.createdBy?.userId?.toString();
  if (!isCreator) {
    return (
      <div className="picks-page">
        <div className="empty-state">
          <div className="empty-state-icon">🚫</div>
          <h3>Access Denied</h3>
          <p>Only the challenge creator can resolve this dare.</p>
          <Link href="/dashboard" className="btn btn-secondary" style={{ display: "inline-flex" }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Already resolved
  if (challenge.status === "resolved") {
    return (
      <div className="picks-page animate-fade-in">
        <div className="picks-locked-msg">
          <div className="lock-icon">✅</div>
          <h2>Already Resolved</h2>
          <p>This challenge has already been resolved.</p>
          <Link href={`/challenge/${shareCode}/results`} className="btn btn-primary" style={{ display: "inline-flex", marginTop: "var(--space-lg)" }}>
            🏆 View Results
          </Link>
        </div>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div className="picks-page animate-fade-in">
        <div className="picks-locked-msg">
          <div className="lock-icon" style={{ fontSize: "3rem" }}>🎉</div>
          <h2>Challenge Resolved!</h2>
          <p>All picks have been scored. Check the results page to see the leaderboard!</p>
          <div style={{ marginTop: "var(--space-xl)", display: "flex", gap: "var(--space-md)", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={`/challenge/${shareCode}/results`} className="btn btn-primary">
              🏆 View Results
            </Link>
            <Link href="/dashboard" className="btn btn-secondary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="picks-page animate-fade-in">
      <div className="picks-header">
        <h1>🏆 Resolve: {challenge.match.title}</h1>
        <p className="match-info" style={{ color: "var(--clr-text-secondary)" }}>
          Enter the correct answers for each question to score all {challenge.participantCount} participants
        </p>
      </div>

      <div className="deadline-banner" style={{ background: "rgba(245, 158, 11, 0.1)", borderColor: "rgba(245, 158, 11, 0.3)" }}>
        ⚠️ Once resolved, this <strong>cannot be undone</strong>. Please verify all answers carefully.
      </div>

      {error && <div className="form-error">{error}</div>}

      {challenge.questions.map((q) => (
        <div key={q.id} className="question-card" style={{ marginBottom: "var(--space-md)" }}>
          <div className="question-card-header">
            <span className="question-number">{q.id.replace("q", "")}</span>
            <h3>{q.label}</h3>
          </div>
          <div className="options-list">
            {q.options.map((opt, i) => {
              const optName = typeof opt === "string" ? opt : opt.name;
              return (
                <button
                  key={i}
                  className={`option-chip ${answers[q.id] === optName ? "selected" : ""}`}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: optName }))}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {typeof opt === "object" && opt !== null && opt.imageId && (
                    <img src={`/api/images/${opt.imageId}`} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#fff", objectFit: "contain", padding: "1px" }} />
                  )}
                  {optName}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        className="btn btn-primary btn-lg"
        style={{ width: "100%", marginTop: "var(--space-md)" }}
        onClick={handleResolve}
        disabled={submitting}
      >
        {submitting ? "Resolving..." : "✅ Resolve Challenge & Score Picks"}
      </button>
    </div>
  );
}
