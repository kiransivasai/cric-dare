"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ChallengePage() {
  const { shareCode } = useParams();
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [challenge, setChallenge] = useState(null);
  const [myPick, setMyPick] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchChallenge();
  }, [shareCode]);

  useEffect(() => {
    if (session && challenge) {
      checkExistingPick();
    }
  }, [session, challenge]);

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

  const checkExistingPick = async () => {
    try {
      const res = await fetch(`/api/picks/${shareCode}`);
      if (res.ok) {
        const data = await res.json();
        const existingPick = data.picks?.find(
          (p) => p.userId?.toString() === session?.user?.id
        );
        if (existingPick) {
          setMyPick(existingPick);
        }
      }
    } catch (err) {
      // Silently fail — might not have picks yet
    }
  };

  const handlePickChange = (questionId, pick) => {
    setAnswers((prev) => ({ ...prev, [questionId]: pick }));
  };

  const handleSubmit = async () => {
    setError("");

    // Validate all questions answered
    const allAnswered = challenge.questions.every((q) => answers[q.id]);
    if (!allAnswered) {
      setError("Please answer all questions before locking your picks");
      return;
    }

    setSubmitting(true);

    try {
      const formattedAnswers = challenge.questions.map((q) => ({
        questionId: q.id,
        pick: answers[q.id],
      }));

      const res = await fetch("/api/picks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareCode, answers: formattedAnswers }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError("Failed to submit picks. Please try again.");
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
          <p>This challenge may not exist or has been removed.</p>
          <Link href="/dashboard" className="btn btn-primary" style={{ display: "inline-flex" }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Not logged in — show preview
  if (authStatus === "unauthenticated") {
    return (
      <div className="challenge-preview">
        <div className="challenge-preview-card">
          <div className="preview-emoji">🏏</div>
          <h2>{challenge.match.title}</h2>
          <p className="preview-creator">
            Challenge by <strong>@{challenge.createdBy.username}</strong>
          </p>
          <div className="preview-details">
            <span>🏟️ {challenge.match.teams?.join(" vs ")}</span>
            <span>📅 {new Date(challenge.match.matchDate).toLocaleDateString()}</span>
            <span>📍 {challenge.match.venue || "TBD"}</span>
            <span>👥 {challenge.participantCount} players joined</span>
          </div>
          <div className="challenge-preview-actions">
            <Link
              href={`/auth/signup?callbackUrl=${encodeURIComponent(`/challenge/${shareCode}`)}`}
              className="btn btn-primary"
            >
              🎯 Sign Up to Play
            </Link>
            <Link
              href={`/auth/login?callbackUrl=${encodeURIComponent(`/challenge/${shareCode}`)}`}
              className="btn btn-secondary"
            >
              Login to Play
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isDebug = process.env.NEXT_PUBLIC_DEBUG === "true";
  const isPastDeadline = isDebug || new Date() > new Date(challenge.picksLockedBefore);
  const isResolved = challenge.status === "resolved";

  // Already submitted
  if (myPick || submitted) {
    const isCreator = session?.user?.id === challenge.createdBy?.userId?.toString();
    const challengeUrl = typeof window !== "undefined" ? `${window.location.origin}/challenge/${shareCode}` : "";
    
    const handleCopyLink = () => {
      navigator.clipboard.writeText(challengeUrl);
      alert("Link copied to clipboard!");
    };

    const handleWhatsAppShare = () => {
      const text = `🏏 I just created a Cricket Dare!\n\n${challenge.match.title}\n\nThink you can predict better than me? Prove it! 🎯\n\n${challengeUrl}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    };

    return (
      <div className="picks-page animate-fade-in">
        <div className="picks-locked-msg">
          <div className="lock-icon">🔒</div>
          <h2>{submitted ? "Picks Locked!" : "Your Picks"}</h2>
          <p>
            {isResolved
              ? "This challenge has been resolved!"
              : "Your picks are locked. Check back after the match for results!"}
          </p>

          {/* Show their picks */}
          {(myPick || submitted) && (
            <div style={{ marginTop: "var(--space-xl)", textAlign: "left" }}>
              {challenge.questions.map((q) => {
                const userAnswer =
                  myPick?.answers?.find((a) => a.questionId === q.id)?.pick ||
                  answers[q.id];
                  
                // Find matching logo if it's an object option
                const matchedOptObj = q.options.find(
                  (o) => typeof o === "object" && o !== null && o.name === userAnswer
                );
                
                return (
                  <div key={q.id} className="question-card" style={{ marginBottom: "var(--space-sm)" }}>
                    <div className="question-card-header">
                      <span className="question-number">{q.id.replace("q", "")}</span>
                      <h3>{q.label}</h3>
                    </div>
                    <span className="option-chip selected" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      {matchedOptObj?.imageId && (
                        <img src={`/api/images/${matchedOptObj.imageId}`} alt="" style={{width: "18px", height: "18px", borderRadius: "50%", background: "#fff", objectFit: "contain", padding: "1px"}} />
                      )}
                      {userAnswer}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show Participants if creator OR already submitted */}
          {(isCreator || myPick || submitted) && challenge.participants && challenge.participants.length > 0 && (
            <div className="participants-section animate-fade-in" style={{ marginTop: "var(--space-xl)", padding: "var(--space-md)", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <h3 style={{ marginBottom: "var(--space-sm)", fontSize: "1rem" }}>👥 Joined Dare ({challenge.participants.length})</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                {challenge.participants.map(username => (
                  <span key={username} style={{ background: "rgba(255,255,255,0.1)", padding: "4px 10px", borderRadius: "100px", fontSize: "0.85rem", color: "var(--clr-text)" }}>
                    @{username}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share section for creator */}
          {isCreator && (
            <div className="share-section" style={{ marginTop: "var(--space-xl)", padding: "var(--space-lg)", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 style={{ marginBottom: "var(--space-sm)", fontSize: "1.1rem" }}>📤 Share this Dare!</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--clr-text-secondary)", marginBottom: "var(--space-md)" }}>
                Send this link to your friends so they can make their predictions!
              </p>
              <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={handleWhatsAppShare} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  💬 Share on WhatsApp
                </button>
                <button className="btn btn-secondary" onClick={handleCopyLink} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  📋 Copy Link
                </button>
              </div>
              <div style={{ marginTop: "var(--space-sm)", fontSize: "0.8rem", color: "var(--clr-text-secondary)", wordBreak: "break-all" }}>
                {challengeUrl}
              </div>
            </div>
          )}

          <div style={{ marginTop: "var(--space-xl)", display: "flex", gap: "var(--space-md)", justifyContent: "center", flexWrap: "wrap" }}>
            {isCreator && !isResolved && isPastDeadline && (
              <Link href={`/challenge/${shareCode}/resolve`} className="btn btn-primary" style={{ background: "var(--gradient-accent)" }}>
                🏆 Resolve Challenge
              </Link>
            )}
            {isResolved && (
              <Link href={`/challenge/${shareCode}/results`} className="btn btn-primary">
                🏆 View Results
              </Link>
            )}
            <Link href="/dashboard" className="btn btn-secondary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Deadline passed
  if (isPastDeadline) {
    return (
      <div className="picks-page animate-fade-in">
        <div className="picks-locked-msg">
          <div className="lock-icon">⏰</div>
          <h2>Picks Closed</h2>
          <p>The deadline for this challenge has passed. Better luck next time!</p>
          <Link href="/dashboard" className="btn btn-secondary" style={{ display: "inline-flex", marginTop: "var(--space-lg)" }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Show picks form
  return (
    <div className="picks-page animate-fade-in">
      <div className="picks-header">
        <h1>🏏 {challenge.match.title}</h1>
        <p className="match-info">
          Challenge by @{challenge.createdBy.username} · {challenge.match.venue || ""}
        </p>
      </div>

      <div className="deadline-banner">
        ⏰ Lock your picks before{" "}
        <strong>{new Date(challenge.picksLockedBefore).toLocaleString()}</strong>
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
                onClick={() => handlePickChange(q.id, optName)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {typeof opt === "object" && opt !== null && opt.imageId && (
                    <img src={`/api/images/${opt.imageId}`} alt="" style={{width: "18px", height: "18px", borderRadius: "50%", background: "#fff", objectFit: "contain", padding: "1px"}} />
                )}
                {optName}
              </button>
            )})}
          </div>
        </div>
      ))}

      <div className="lock-warning">
        ⚠️ Once you lock your picks, they cannot be changed!
      </div>

      <button
        className="btn btn-primary btn-lg"
        style={{ width: "100%" }}
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Locking..." : "🔒 Lock My Picks"}
      </button>
    </div>
  );
}
