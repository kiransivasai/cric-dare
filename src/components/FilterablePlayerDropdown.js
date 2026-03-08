'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

// Expect options in this format structure minimally: 
// { id: '...', name: 'Virat', teamName: 'India', role: 'Batter' }
export default function FilterablePlayerDropdown({
  options,
  value,
  onSelect,
  placeholder = "Select Player...",
  isOpen,
  onToggle
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Group generic array of players dynamically by `teamName` or 'Squad'
  const groupedOptions = useMemo(() => {
    const rawOptions = Array.isArray(options) ? options : [];
    
    // Default group if teamName is missing from RapidAPI model gracefully
    const groups = rawOptions.reduce((acc, player) => {
      const g = player.teamName || "Squads";
      if (!acc[g]) acc[g] = [];
      
      // Filter logic: match on player name
      if (
        !searchTerm ||
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (player.role && player.role.toLowerCase().includes(searchTerm.toLowerCase()))
      ) {
        acc[g].push(player);
      }
      return acc;
    }, {});

    // Remove empty groups after filtering
    Object.keys(groups).forEach((g) => {
      if (groups[g].length === 0) delete groups[g];
    });

    return groups;
  }, [options, searchTerm]);

  // Click outside listener handled by parent normally, but keeping internal trap safe
  useEffect(() => {
    if (!isOpen) setSearchTerm(""); // Clear search when closed
  }, [isOpen]);

  const handleSelect = (playerId, playerName) => {
    onSelect(playerId, playerName);
    onToggle(false);
  };

  return (
    <div className="custom-dropdown-container" ref={dropdownRef}>
      <div 
        className={`custom-dropdown-header ${isOpen ? "open" : ""} ${value ? "has-value" : ""}`}
        onClick={() => onToggle(!isOpen)}
        style={{ minHeight: "42px", display: "flex", alignItems: "center" }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
          {value || placeholder}
        </span>
        <span className="dropdown-arrow">▼</span>
      </div>

      {isOpen && (
        <div className="custom-dropdown-list" style={{ maxHeight: "300px", zIndex: 50 }}>
          {/* Prevent click closing when interacting with Input */}
          <div className="dropdown-search-container" onClick={(e) => e.stopPropagation()}>
            <input 
              type="text" 
              className="dropdown-search-input"
              placeholder="Search players..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="dropdown-options-scrollable">
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="custom-dropdown-option no-results" style={{ fontStyle: "italic", cursor: "default", opacity: 0.7 }}>
                No players found
              </div>
            ) : (
              Object.entries(groupedOptions).map(([teamName, players]) => (
                <div key={teamName} className="dropdown-group">
                  <div className="dropdown-group-header">{teamName}</div>
                  {players.map(player => (
                    <div
                      key={player.id || player.name}
                      className={`custom-dropdown-option ${value === player.name ? "selected" : ""}`}
                      onClick={() => handleSelect(player.id, player.name)}
                      style={{ display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      {player.imageId && (
                         <img 
                           src={`/api/images/${player.imageId}`} 
                           alt="" 
                           style={{width: "20px", height: "20px", borderRadius: "50%", background: "#fff", objectFit: "contain", padding: "1px"}} 
                         />
                      )}
                      <span>
                        {player.name} {player.role ? <span className="player-role-badge">({player.role})</span> : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
