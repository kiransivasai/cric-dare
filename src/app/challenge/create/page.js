"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import FilterablePlayerDropdown from "@/components/FilterablePlayerDropdown";

const DEFAULT_QUESTIONS = [
  {
    id: "q1",
    type: "winner",
    label: "Who will win the match?",
    options: [],
  },
  {
    id: "q2",
    type: "mom",
    label: "Who will be Man of the Match?",
    options: [], // Will be populated with players
  },
  {
    id: "q3",
    type: "highestScorer",
    label: "Who will be the Highest Scorer?",
    options: [], // Will be populated with batsmen/allrounders
  },
  {
    id: "q4",
    type: "mostWickets",
    label: "Who will take the Most Wickets?",
    options: [], // Will be populated with bowlers/allrounders
  },
  {
    id: "q5",
    type: "totalRuns",
    label: "Total runs scored in the match?",
    options: ["< 250", "250–299", "300–349", "350–399", "400+"],
  },
  {
    id: "q6",
    type: "sixes",
    label: "Total sixes in the match?",
    options: ["0–5", "6–10", "11–15", "16–20", "21+"],
  },
  {
    id: "q7",
    type: "fours",
    label: "Total fours in the match?",
    options: ["0–10", "11–20", "21–30", "31–40", "41+"],
  },
];

export default function CreateChallengePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareCode, setShareCode] = useState("");

  // Bracket editing state
  const [editingBracket, setEditingBracket] = useState(null);
  const [bracketEditValues, setBracketEditValues] = useState({});

  // Squad fetching state
  const [squads, setSquads] = useState([]);
  const [squadsLoading, setSquadsLoading] = useState(false);
  const [squadsError, setSquadsError] = useState("");

  // Custom Dropdown UI state
  const [openDropdown, setOpenDropdown] = useState(null);

  // Custom questions added by the creator
  const [customQuestions, setCustomQuestions] = useState([]);

  // Map to hold the creator's initial picks during challenge creation
  const [creatorPicks, setCreatorPicks] = useState({
    q1: "",
    q2: "",
    q3: "",
    q4: "",
    q5: "",
    q6: "",
    q7: ""
  });

  // Custom question helpers
  const addCustomQuestion = () => {
    const nextId = `q${8 + customQuestions.length}`;
    setCustomQuestions(prev => [...prev, {
      id: nextId,
      type: "custom",
      label: "",
      optionType: "text", // "text" or "player"
      options: ["", ""],
    }]);
    setCreatorPicks(prev => ({ ...prev, [nextId]: "" }));
  };

  const removeCustomQuestion = (index) => {
    const removed = customQuestions[index];
    setCustomQuestions(prev => prev.filter((_, i) => i !== index));
    setCreatorPicks(prev => {
      const updated = { ...prev };
      delete updated[removed.id];
      return updated;
    });
  };

  const updateCustomQuestionLabel = (index, label) => {
    setCustomQuestions(prev => prev.map((q, i) => i === index ? { ...q, label } : q));
  };

  const updateCustomOptionType = (index, optionType) => {
    setCustomQuestions(prev => prev.map((q, i) => i === index ? { ...q, optionType, options: ["", ""] } : q));
  };

  const updateCustomTextOption = (qIndex, optIndex, value) => {
    setCustomQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const newOpts = [...q.options];
      newOpts[optIndex] = value;
      return { ...q, options: newOpts };
    }));
  };

  const updateCustomPlayerOption = (qIndex, optIndex, playerName) => {
    setCustomQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex) return q;
      const newOpts = [...q.options];
      if (newOpts.includes(playerName)) {
        alert(`${playerName} is already added.`);
        return q;
      }
      newOpts[optIndex] = playerName;
      return { ...q, options: newOpts };
    }));
  };

  const addCustomOption = (qIndex) => {
    setCustomQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex || q.options.length >= 10) return q;
      return { ...q, options: [...q.options, ""] };
    }));
  };

  const removeCustomOption = (qIndex, optIndex) => {
    setCustomQuestions(prev => prev.map((q, i) => {
      if (i !== qIndex || q.options.length <= 2) return q;
      return { ...q, options: q.options.filter((_, oi) => oi !== optIndex) };
    }));
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err) {
      console.error("Failed to fetch matches:", err);
    } finally {
      setMatchesLoading(false);
    }
  };

  const selectMatch = (match) => {
    setSelectedMatch(match);
    const updatedQuestions = [...questions];
    
    // Fix: Properly map the Teams to Q1 Winner dropdown with Images
    const matchTeamsOpts = match.teams && match.teams.length > 0
      ? [
          { name: match.teams[0], imageId: match.team1ImageId },
          { name: match.teams[1], imageId: match.team2ImageId }
        ]
      : [
          { name: match.name?.split(" vs ")[0] || "Team 1", imageId: null },
          { name: match.name?.split(" vs ")[1] || "Team 2", imageId: null }
        ];

    updatedQuestions[0] = {
      ...updatedQuestions[0],
      options: matchTeamsOpts,
    };
    setQuestions(updatedQuestions);

    // Set default deadline to 30 mins before match
    if (match.dateTimeGMT) {
      const matchDate = new Date(match.dateTimeGMT);
      matchDate.setMinutes(matchDate.getMinutes() - 30);
      const local = new Date(matchDate.getTime() - matchDate.getTimezoneOffset() * 60000);
      setDeadline(local.toISOString().slice(0, 16));
    }

    if (match.id !== "manual") {
      const t1Name = match.teams?.[0] || match.name?.split(" vs ")[0];
      const t2Name = match.teams?.[1] || match.name?.split(" vs ")[1];
      fetchSquads(match.id, match.team1Id, match.team2Id, t1Name, t2Name);
    } else {
      setSquads([{ id: 1, name: "Player 1", teamName: "Squad" }, { id: 2, name: "Player 2", teamName: "Squad" }]);
    }
  };

  const fetchSquads = async (matchId, t1, t2, t1Name, t2Name) => {
    setSquadsLoading(true);
    setSquadsError("");
    try {
      const params = new URLSearchParams();
      if (t1) params.append("t1", t1);
      if (t2) params.append("t2", t2);
      if (t1Name) params.append("t1Name", t1Name);
      if (t2Name) params.append("t2Name", t2Name);
      
      const res = await fetch(`/api/matches/${matchId}/squads?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        setSquadsError(data.error || "Failed to fetch squads");
        setSquads([]);
        return;
      }

      setSquads(data.allPlayers || []);
      
      // Auto-populate some initial options using functional state to avoid stale closure overriding Q1
      const allPlayers = data.allPlayers || [];
      if (allPlayers.length > 0) {
        setQuestions((prevQuestions) => {
          const updatedQuestions = [...prevQuestions];
          const shuffledAll = [...allPlayers].sort(() => 0.5 - Math.random());
          
          // MOM: Anyone
          if (updatedQuestions[1].options.length === 0) {
            updatedQuestions[1] = {
              ...updatedQuestions[1],
              options: shuffledAll.slice(0, 5).map(p => p.name)
            };
          }
          
          // Highest Scorer: Batsman or Allrounder or Keeper
          if (updatedQuestions[2].options.length === 0) {
            const validBatRoles = ["Batsman", "WK-Batsman", "Batting Allrounder", "Bowling Allrounder"];
            const batters = shuffledAll.filter(p => !p.role || validBatRoles.includes(p.role));
            updatedQuestions[2] = {
              ...updatedQuestions[2],
              options: (batters.length >= 5 ? batters : shuffledAll).slice(0, 5).map(p => p.name)
            };
          }

          // Most Wickets: Bowler or Allrounder
          if (updatedQuestions[3].options.length === 0) {
            const validBowlRoles = ["Bowler", "Bowling Allrounder", "Batting Allrounder"];
            const bowlers = shuffledAll.filter(p => !p.role || validBowlRoles.includes(p.role));
            updatedQuestions[3] = {
              ...updatedQuestions[3],
              options: (bowlers.length >= 5 ? bowlers : shuffledAll).slice(0, 5).map(p => p.name)
            };
          }
          
          return updatedQuestions;
        });
      }
    } catch (err) {
      console.error("Failed to fetch squads:", err);
      setSquadsError("Network error fetching team squads");
    } finally {
      setSquadsLoading(false);
    }
  };

  const updatePlayerOption = (qIndex, index, value) => {
    const updatedQuestions = [...questions];
    const newOptions = [...updatedQuestions[qIndex].options];
    
    // Prevent duplicate player option across ANY other index in this question natively
    if (newOptions.includes(value)) {
        alert(`${value} is already a candidate for this question.`);
        return;
    }
    
    newOptions[index] = value;
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], options: newOptions };
    setQuestions(updatedQuestions);
  };

  const addPlayerOption = (qIndex) => {
    if (questions[qIndex].options.length < 10) {
      const updatedQuestions = [...questions];
      updatedQuestions[qIndex] = {
        ...updatedQuestions[qIndex],
        options: [...updatedQuestions[qIndex].options, ""],
      };
      setQuestions(updatedQuestions);
    }
  };

  const removePlayerOption = (qIndex, index) => {
    if (questions[qIndex].options.length > 2) {
      const updatedQuestions = [...questions];
      updatedQuestions[qIndex] = {
        ...updatedQuestions[qIndex],
        options: updatedQuestions[qIndex].options.filter((_, i) => i !== index),
      };
      setQuestions(updatedQuestions);
    }
  };

  // Bracket editing functions
  const startEditingBracket = (questionIndex) => {
    const qIdx = questionIndex + 4; // offset for q5, q6, q7
    const q = questions[qIdx];
    setBracketEditValues({
      qIdx,
      options: [...q.options],
    });
    setEditingBracket(qIdx);
  };

  const updateBracketOption = (optIndex, value) => {
    setBracketEditValues((prev) => {
      const newOptions = [...prev.options];
      newOptions[optIndex] = value;
      return { ...prev, options: newOptions };
    });
  };

  const addBracketOption = () => {
    if (bracketEditValues.options.length < 7) {
      setBracketEditValues((prev) => ({
        ...prev,
        options: [...prev.options, ""],
      }));
    }
  };

  const removeBracketOption = (optIndex) => {
    if (bracketEditValues.options.length > 2) {
      setBracketEditValues((prev) => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== optIndex),
      }));
    }
  };

  const saveBracketEdit = () => {
    const updatedQuestions = [...questions];
    const filteredOptions = bracketEditValues.options.filter((o) => o.trim() !== "");
    if (filteredOptions.length >= 2) {
      updatedQuestions[bracketEditValues.qIdx] = {
        ...updatedQuestions[bracketEditValues.qIdx],
        options: filteredOptions,
      };
      setQuestions(updatedQuestions);
    }
    setEditingBracket(null);
    setBracketEditValues({});
  };

  const cancelBracketEdit = () => {
    setEditingBracket(null);
    setBracketEditValues({});
  };

  // Deadline helpers
  const getDeadlineDisplay = () => {
    if (!deadline) return null;
    const d = new Date(deadline);
    return {
      date: d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      time: d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  // Helper to change steps and reset scroll
  const goToStep = (newStep) => {
    setStep(newStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreate = async () => {
    setError("");

    for (let i = 1; i <= 3; i++) {
        const playerOpts = questions[i].options.filter(o => typeof o === 'string' && o.trim() !== "");
        if (playerOpts.length < 2) {
            setError(`Please add at least 2 player options for "${questions[i].label}"`);
            return;
        }
    }

    // Validate custom questions
    for (const cq of customQuestions) {
      if (!cq.label.trim()) {
        setError("Please enter a label for all custom questions.");
        return;
      }
      const validOpts = cq.options.filter(o => typeof o === 'string' && o.trim() !== "");
      if (validOpts.length < 2) {
        setError(`Please add at least 2 options for "${cq.label}"`);
        return;
      }
    }

    if (!deadline) {
      setError("Please set a picks deadline");
      return;
    }

    // Validate deadline against match start time
    if (selectedMatch?.dateTimeGMT) {
      const matchTime = new Date(selectedMatch.dateTimeGMT).getTime();
      const selectedDeadline = new Date(deadline).getTime();
      
      if (selectedDeadline > matchTime) {
        setError("The picks deadline cannot be after the match starts.");
        return;
      }
    }

    // Validate creator picks (including custom questions)
    const allPicksMade = Object.values(creatorPicks).every(p => p !== "");
    if (!allPicksMade) {
      setError("You must select your own picks for all questions before creating the challenge.");
      return;
    }

    setLoading(true);

    try {
      const cleanedQuestions = questions.map((q) => {
        if (q.id === "q1") {
          return { ...q, options: q.options.map((o) => typeof o === "string" ? o : o.name) };
        }
        if (["mom", "highestScorer", "mostWickets"].includes(q.type)) {
          return { ...q, options: q.options.filter((o) => typeof o === 'string' && o.trim() !== "") };
        }
        return q;
      });

      // Re-number and clean custom questions
      const cleanedCustom = customQuestions.map((cq, i) => ({
        id: `q${8 + i}`,
        type: "custom",
        label: cq.label,
        options: cq.options.filter(o => typeof o === 'string' && o.trim() !== ""),
      }));

      const allQuestions = [...cleanedQuestions, ...cleanedCustom];

      const res = await fetch("/api/challenge/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match: selectedMatch,
          questions: allQuestions,
          picksLockedBefore: deadline,
          creatorAnswers: creatorPicks
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setShareCode(data.shareCode);
      setStep(3);
    } catch (err) {
      setError("Failed to create challenge. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/challenge/${shareCode}`;
  const whatsAppMsg = encodeURIComponent(
    `🏏 I've set up a Cricket Dare for ${selectedMatch?.name || "an upcoming match"}!\nMake your picks before ${deadline ? new Date(deadline).toLocaleString() : "the deadline"}:\n${shareUrl}`
  );

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    const btn = document.getElementById("copy-btn");
    if (btn) {
      btn.textContent = "✅ Copied!";
      setTimeout(() => (btn.textContent = "📋 Copy Link"), 2000);
    }
  };

  const deadlineDisplay = getDeadlineDisplay();

  return (
    <div className="wizard-page animate-fade-in">
      <div className="wizard-header">
        <h1>🎯 Create a Cricket Dare</h1>
        <div className="wizard-steps-indicator">
          <span className={`step-dot ${step >= 1 ? (step === 1 ? "active" : "completed") : ""}`} />
          <span className={`step-dot ${step >= 2 ? (step === 2 ? "active" : "completed") : ""}`} />
          <span className={`step-dot ${step >= 3 ? (step === 3 ? "active" : "completed") : ""}`} />
        </div>
        <div className="wizard-step-label">
          <span className={step === 1 ? "active" : ""}>Pick a Match</span>
          <span className={step === 2 ? "active" : ""}>Build Questions</span>
          <span className={step === 3 ? "active" : ""}>Share</span>
        </div>
      </div>

      {/* Step 1: Pick a Match */}
      {step === 1 && (
        <div className="animate-slide-up">
          <h2 style={{ marginBottom: "var(--space-lg)", fontFamily: "var(--font-heading)" }}>
            Select an Upcoming Match
          </h2>
          {matchesLoading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : matches.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📡</div>
              <h3>No matches available</h3>
              <p>Check back later for upcoming matches, or enter match details manually.</p>
              <button
                className="btn btn-primary"
                style={{ display: "inline-flex" }}
                onClick={() => {
                  setSelectedMatch({
                    id: "manual",
                    name: "Custom Match",
                    teams: ["Team A", "Team B"],
                    matchType: "ODI",
                    venue: "TBD",
                    dateTimeGMT: new Date(Date.now() + 86400000).toISOString(),
                  });
                  setStep(2);
                }}
              >
                Enter Manually
              </button>
            </div>
          ) : (
            <div className="match-grid">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className={`match-card ${selectedMatch?.id === match.id ? "selected" : ""}`}
                  onClick={() => selectMatch(match)}
                >
                  <div className="match-card-teams" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap", lineHeight: 1.4 }}>
                    {match.team1ImageId && <img src={`/api/images/${match.team1ImageId}`} alt="" style={{width: "24px", height: "24px", borderRadius: "50%", background: "#fff", objectFit: "contain", padding: "2px"}} />}
                    {match.teams?.[0] || match.name?.split(" vs ")[0]}
                    <span style={{color: "var(--clr-text-secondary)", fontSize: "0.8rem", margin: "0 4px"}}>vs</span>
                    {match.teams?.[1] || match.name?.split(" vs ")[1]}
                    {match.team2ImageId && <img src={`/api/images/${match.team2ImageId}`} alt="" style={{width: "24px", height: "24px", borderRadius: "50%", background: "#fff", objectFit: "contain", padding: "2px"}} />}
                  </div>
                  <div className="match-card-info">
                    <span>📅 {new Date(match.dateTimeGMT || match.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span>🕐 {new Date(match.dateTimeGMT || match.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                    <span>📍 {match.venue || "TBD"}</span>
                  </div>
                  {match.seriesName && (
                    <div className="match-card-series">{match.seriesName}</div>
                  )}
                  {match.matchType && (
                    <span className={`format-badge format-${(match.matchType || "").toLowerCase()}`}>
                      {match.matchType}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="wizard-nav" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {error && <div className="form-error" style={{ width: "100%", margin: "0" }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <div />
              <button
                className="btn btn-primary"
                disabled={!selectedMatch}
                onClick={() => goToStep(2)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Build Questions */}
      {step === 2 && (
        <div className="animate-slide-up">
          <h2 style={{ marginBottom: "var(--space-lg)", fontFamily: "var(--font-heading)" }}>
            Build Your 7 Questions
          </h2>

          {/* Q1: Winner */}
          <div className="question-card">
            <div className="question-card-header">
              <span className="question-number">1</span>
              <h3>{questions[0].label}</h3>
            </div>
            <div className="options-list">
              {questions[0].options.map((opt, i) => {
                const optName = typeof opt === 'string' ? opt : opt.name;
                return (
                  <span key={i} className="option-chip preview" style={{display: "inline-flex", alignItems: "center", gap: "6px"}}>
                    {opt.imageId && <img src={`/api/images/${opt.imageId}`} alt="" style={{width: "18px", height: "18px", borderRadius: "50%", background: "#fff", objectFit: "contain", padding: "1px"}} />}
                    {optName}
                  </span>
                )
              })}
            </div>
            
            <div className="creator-pick-section" style={{ marginTop: "var(--space-md)", paddingTop: "var(--space-sm)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--clr-primary-light)" }}>⭐ Your Prediction (Locked)</label>
              <div className="custom-dropdown-container">
                <div 
                  className={`custom-dropdown-header ${openDropdown === "q1" ? "open" : ""} ${creatorPicks["q1"] ? "has-value" : ""}`}
                  onClick={() => setOpenDropdown(openDropdown === "q1" ? null : "q1")}
                >
                  <span>{creatorPicks["q1"] || "— Select Your Answer —"}</span>
                  <span className="dropdown-arrow">▼</span>
                </div>
                {openDropdown === "q1" && (
                  <div className="custom-dropdown-list">
                    {questions[0].options.filter(o => typeof o === 'string' ? o.trim() !== "" : o.name.trim() !== "").map(opt => {
                      const optName = typeof opt === 'string' ? opt : opt.name;
                      return (
                      <div 
                        key={optName}
                        className={`custom-dropdown-option ${creatorPicks["q1"] === optName ? "selected" : ""}`}
                        onClick={() => {
                          setCreatorPicks({...creatorPicks, q1: optName});
                          setOpenDropdown(null);
                        }}
                        style={{display: "flex", alignItems: "center", gap: "8px"}}
                      >
                        {opt.imageId && <img src={`/api/images/${opt.imageId}`} alt="" style={{width: "20px", height: "20px", borderRadius: "50%", background: "#fff", objectFit: "contain", padding: "1px"}} />}
                        {optName}
                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>
            <p className="question-hint">Options are auto-filled from match teams</p>
          </div>

          {/* Q2, Q3, Q4: Dynamic Player Questions */}
          {[1, 2, 3].map(qIdx => {
            const q = questions[qIdx];
            
            // Filter dropdown options strictly by requested role for Q3 and Q4 dynamically
            const filteredSquadList = squads.filter(p => {
              if (!p.role) return true; // keep unknowns
              if (qIdx === 2) {
                // Highest Scorer
                return ["Batsman", "WK-Batsman", "Batting Allrounder", "Bowling Allrounder"].includes(p.role);
              }
              if (qIdx === 3) {
                 // Most Wickets
                return ["Bowler", "Bowling Allrounder", "Batting Allrounder"].includes(p.role);
              }
              return true; // Q2 Mom
            });

            return (
              <div key={q.id} className="question-card">
                <div className="question-card-header">
                  <span className="question-number">{qIdx + 1}</span>
                  <h3>{q.label}</h3>
                </div>
                
                {squadsLoading ? (
                  <div style={{ color: "var(--clr-text-secondary)", fontSize: "0.9rem" }}>Fetching team rosters...</div>
                ) : squadsError ? (
                  <div className="form-error">{squadsError}</div>
                ) : (
                  <>
                    <p style={{ fontSize: "0.85rem", color: "var(--clr-text-secondary)", marginBottom: "var(--space-sm)" }}>Choose candidates for your friends to pick from:</p>
                    <div className="option-input-grid">
                      {q.options.map((opt, i) => (
                        <div key={i} className="option-input-item" style={{ position: "relative" }}>
                          
                          <FilterablePlayerDropdown 
                            options={filteredSquadList}
                            value={opt}
                            placeholder="Select Player..."
                            isOpen={openDropdown === `${q.id}_opt_${i}`}
                            onToggle={(isOpen) => setOpenDropdown(isOpen ? `${q.id}_opt_${i}` : null)}
                            onSelect={(_, playerName) => updatePlayerOption(qIdx, i, playerName)}
                          />

                          {q.options.length > 2 && (
                            <button
                              className="btn-remove"
                              onClick={() => removePlayerOption(qIdx, i)}
                              title="Remove player"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.options.length < 10 && squads.length > 0 && (
                      <button className="add-option-btn" onClick={() => addPlayerOption(qIdx)}>
                        + Add Player Option
                      </button>
                    )}

                    <div className="creator-pick-section" style={{ marginTop: "var(--space-md)", paddingTop: "var(--space-sm)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--clr-primary-light)" }}>⭐ Your Prediction (Locked)</label>
                      <div className="custom-dropdown-container">
                        <div 
                          className={`custom-dropdown-header ${openDropdown === q.id ? "open" : ""} ${creatorPicks[q.id] ? "has-value" : ""}`}
                          onClick={() => setOpenDropdown(openDropdown === q.id ? null : q.id)}
                        >
                          <span>{creatorPicks[q.id] || "— Select Your Answer —"}</span>
                          <span className="dropdown-arrow">▼</span>
                        </div>
                        {openDropdown === q.id && (
                          <div className="custom-dropdown-list">
                            {q.options.filter(o => typeof o === 'string' && o.trim() !== "").map(opt => (
                              <div 
                                key={opt}
                                className={`custom-dropdown-option ${creatorPicks[q.id] === opt ? "selected" : ""}`}
                                onClick={() => {
                                  setCreatorPicks({...creatorPicks, [q.id]: opt});
                                  setOpenDropdown(null);
                                }}
                              >
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Q5-Q7: Bracket questions with editing */}
          {questions.slice(4).map((q, idx) => (
            <div key={q.id} className="question-card">
              <div className="question-card-header">
                <span className="question-number">{idx + 5}</span>
                <h3>{q.label}</h3>
                <button
                  className="btn-edit-bracket"
                  onClick={() => startEditingBracket(idx)}
                  title="Edit ranges"
                >
                  ✏️ Edit
                </button>
              </div>

              {editingBracket === idx + 4 ? (
                <div className="bracket-editor">
                  <div className="option-input-grid">
                    {bracketEditValues.options.map((opt, optIdx) => (
                      <div key={optIdx} className="option-input-item">
                        <input
                          className="form-input option-input"
                          placeholder={`Range ${optIdx + 1} (e.g. 250–299)`}
                          value={opt}
                          onChange={(e) => updateBracketOption(optIdx, e.target.value)}
                        />
                        {bracketEditValues.options.length > 2 && (
                          <button
                            className="btn-remove"
                            onClick={() => removeBracketOption(optIdx)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {bracketEditValues.options.length < 7 && (
                    <button className="add-option-btn" onClick={addBracketOption}>
                      + Add Range
                    </button>
                  )}
                  <div className="bracket-editor-actions">
                    <button className="btn btn-primary btn-sm" onClick={saveBracketEdit}>
                      ✅ Save
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={cancelBracketEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="options-list">
                  {q.options.map((opt, i) => (
                    <span key={i} className="option-chip preview">
                      {opt}
                    </span>
                  ))}
                </div>
              )}

              <div className="creator-pick-section" style={{ marginTop: "var(--space-md)", paddingTop: "var(--space-sm)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--clr-primary-light)" }}>⭐ Your Prediction (Locked)</label>
                <div className="custom-dropdown-container">
                  <div 
                    className={`custom-dropdown-header ${openDropdown === q.id ? "open" : ""} ${creatorPicks[q.id] ? "has-value" : ""}`}
                    onClick={() => setOpenDropdown(openDropdown === q.id ? null : q.id)}
                  >
                    <span>{creatorPicks[q.id] || "— Select Your Answer —"}</span>
                    <span className="dropdown-arrow">▼</span>
                  </div>
                  {openDropdown === q.id && (
                    <div className="custom-dropdown-list">
                      {q.options.filter(o => o.trim() !== "").map(opt => (
                        <div 
                          key={opt}
                          className={`custom-dropdown-option ${creatorPicks[q.id] === opt ? "selected" : ""}`}
                          onClick={() => {
                            setCreatorPicks({...creatorPicks, [q.id]: opt});
                            setOpenDropdown(null);
                          }}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {/* Custom Questions */}
          {customQuestions.map((cq, cqIdx) => (
            <div key={cq.id} className="question-card" style={{ borderLeft: "3px solid var(--clr-accent)" }}>
              <div className="question-card-header">
                <span className="question-number" style={{ background: "var(--gradient-accent)" }}>{8 + cqIdx}</span>
                <input
                  className="form-input"
                  placeholder="Enter your custom question..."
                  value={cq.label}
                  onChange={(e) => updateCustomQuestionLabel(cqIdx, e.target.value)}
                  style={{ flex: 1, fontSize: "0.95rem", fontWeight: 600 }}
                />
                <button className="btn-remove" onClick={() => removeCustomQuestion(cqIdx)} title="Remove question" style={{ marginLeft: "8px" }}>✕</button>
              </div>

              {/* Compact option type toggle */}
              <div style={{ display: "inline-flex", gap: "0", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "var(--space-sm)" }}>
                <button
                  onClick={() => updateCustomOptionType(cqIdx, "text")}
                  style={{
                    padding: "6px 14px", fontSize: "0.78rem", border: "none", cursor: "pointer",
                    background: cq.optionType === "text" ? "var(--clr-primary)" : "transparent",
                    color: cq.optionType === "text" ? "#fff" : "var(--clr-text-secondary)",
                    transition: "all 0.2s"
                  }}
                >
                  📝 Text
                </button>
                <button
                  onClick={() => updateCustomOptionType(cqIdx, "player")}
                  style={{
                    padding: "6px 14px", fontSize: "0.78rem", border: "none", borderLeft: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                    background: cq.optionType === "player" ? "var(--clr-primary)" : "transparent",
                    color: cq.optionType === "player" ? "#fff" : "var(--clr-text-secondary)",
                    transition: "all 0.2s"
                  }}
                >
                  🏏 Player
                </button>
              </div>

              {/* Options editor */}
              <div className="option-input-grid">
                {cq.options.map((opt, optIdx) => (
                  <div key={optIdx} className="option-input-item" style={{ position: "relative" }}>
                    {cq.optionType === "text" ? (
                      <input
                        className="form-input option-input"
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt}
                        onChange={(e) => updateCustomTextOption(cqIdx, optIdx, e.target.value)}
                      />
                    ) : (
                      <FilterablePlayerDropdown
                        options={squads}
                        value={opt}
                        placeholder="Select Player..."
                        isOpen={openDropdown === `${cq.id}_copt_${optIdx}`}
                        onToggle={(isOpen) => setOpenDropdown(isOpen ? `${cq.id}_copt_${optIdx}` : null)}
                        onSelect={(_, playerName) => updateCustomPlayerOption(cqIdx, optIdx, playerName)}
                      />
                    )}
                    {cq.options.length > 2 && (
                      <button className="btn-remove" onClick={() => removeCustomOption(cqIdx, optIdx)} title="Remove option">✕</button>
                    )}
                  </div>
                ))}
              </div>
              {cq.options.length < 10 && (
                <button className="add-option-btn" onClick={() => addCustomOption(cqIdx)}>
                  + Add Option
                </button>
              )}
              {/* Creator's prediction for this custom question */}
              <div className="creator-pick-section" style={{ marginTop: "var(--space-md)", paddingTop: "var(--space-sm)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "0.85rem", color: "var(--clr-primary-light)" }}>⭐ Your Prediction (Locked)</label>
                <div className="custom-dropdown-container">
                  <div
                    className={`custom-dropdown-header ${openDropdown === cq.id ? "open" : ""} ${creatorPicks[cq.id] ? "has-value" : ""}`}
                    onClick={() => setOpenDropdown(openDropdown === cq.id ? null : cq.id)}
                  >
                    <span>{creatorPicks[cq.id] || "— Select Your Answer —"}</span>
                    <span className="dropdown-arrow">▼</span>
                  </div>
                  {openDropdown === cq.id && (
                    <div className="custom-dropdown-list">
                      {cq.options.filter(o => typeof o === 'string' && o.trim() !== "").map(opt => (
                        <div
                          key={opt}
                          className={`custom-dropdown-option ${creatorPicks[cq.id] === opt ? "selected" : ""}`}
                          onClick={() => {
                            setCreatorPicks({ ...creatorPicks, [cq.id]: opt });
                            setOpenDropdown(null);
                          }}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--clr-text-muted)", marginTop: "6px", fontStyle: "italic" }}>
                  💡 Correct answer for scoring will be entered after the match via the Resolve page.
                </p>
              </div>
            </div>
          ))}

          {/* Add Custom Question Button */}
          <button
            className="add-option-btn"
            onClick={addCustomQuestion}
            style={{ width: "100%", padding: "var(--space-md)", fontSize: "1rem", borderStyle: "dashed", marginBottom: "var(--space-md)" }}
          >
            ➕ Add Custom Question
          </button>

          {/* Deadline — Custom styled */}
          <div className="question-card deadline-card">
            <div className="question-card-header">
              <span className="question-number" style={{ background: "var(--gradient-accent)" }}>⏰</span>
              <h3>Picks Deadline</h3>
            </div>

            <div className="custom-datetime-container">
              <div className="datetime-field">
                <label>Date</label>
                <div className="datetime-input-wrapper">
                  <div className="datetime-icon">📅</div>
                  <input
                    type="date"
                    value={deadline ? deadline.split("T")[0] : ""}
                    onChange={(e) => {
                      const timePart = deadline ? deadline.split("T")[1] : "12:00";
                      setDeadline(`${e.target.value}T${timePart}`);
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    max={selectedMatch?.dateTimeGMT ? new Date(selectedMatch.dateTimeGMT).toISOString().split("T")[0] : undefined}
                  />
                </div>
              </div>
              <div className="datetime-field">
                <label>Time</label>
                <div className="datetime-input-wrapper">
                  <div className="datetime-icon">🕐</div>
                  <input
                    type="time"
                    value={deadline ? deadline.split("T")[1] || "" : ""}
                    onChange={(e) => {
                      const datePart = deadline ? deadline.split("T")[0] : new Date().toISOString().split("T")[0];
                      setDeadline(`${datePart}T${e.target.value}`);
                    }}
                  />
                </div>
              </div>
            </div>

            {deadlineDisplay && (
              <div className="deadline-preview">
                <span className="deadline-preview-icon">🔒</span>
                <span>
                  Picks lock on <strong>{deadlineDisplay.date}</strong> at{" "}
                  <strong>{deadlineDisplay.time}</strong>
                </span>
              </div>
            )}

            <p className="question-hint">
              Friends must lock their picks before this time
            </p>
          </div>

          <div className="wizard-nav" style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
            {error && <div className="form-error" style={{ width: "100%", margin: "0" }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <button className="btn btn-secondary" onClick={() => goToStep(1)}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading || squadsLoading}>
                {loading ? "Creating..." : "Create Dare 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Share */}
      {step === 3 && (
        <div className="animate-slide-up">
          <div className="share-section">
            <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>🎉</div>
            <h3>Your Cricket Dare is Live!</h3>
            <p style={{ color: "var(--clr-text-secondary)", marginBottom: "var(--space-xl)" }}>
              Share this link with your friends and see who knows cricket best
            </p>

            <div className="share-link-box">
              <input
                className="share-link-input"
                value={shareUrl}
                readOnly
              />
              <button id="copy-btn" className="btn btn-primary btn-sm" onClick={copyLink}>
                📋 Copy Link
              </button>
            </div>

            <div className="share-buttons">
              <a
                href={`https://wa.me/?text=${whatsAppMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-btn"
              >
                📱 Share on WhatsApp
              </a>
            </div>

            <div style={{ marginTop: "var(--space-2xl)", display: "flex", gap: "var(--space-md)", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                className="btn btn-secondary"
                onClick={() => router.push(`/challenge/${shareCode}`)}
              >
                View Challenge
              </button>
              <button
                className="btn btn-outline"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
