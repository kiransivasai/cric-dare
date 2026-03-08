"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // We removed the eager update() here because NextAuth update() alters the session
  // state and triggers re-renders, causing infinite loops when placed inside useEffect.

  const isAuthPage =
    pathname?.startsWith("/auth/login") || pathname?.startsWith("/auth/signup");
  if (isAuthPage) return null;

  return (
    <>
      {/* --- DESKTOP TOP NAV --- */}
      <nav className="navbar desktop-only">
        <div className="navbar-inner">
          <Link href="/" className="navbar-brand">
            <span className="brand-icon">🏏</span>
            <span className="brand-text">CricDare</span>
          </Link>

          <div className="navbar-links">
            {session ? (
              <>
                <Link href="/dashboard" className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}>
                  Dashboard
                </Link>
                <Link href="/challenge/create" className="nav-link nav-cta">
                  🎯 Create Dare
                </Link>
                {session.user?.isAdmin && (
                  <Link href="/admin/settings" className={`nav-link ${pathname === "/admin/settings" ? "active" : ""}`}>
                    ⚙️ Admin
                  </Link>
                )}
                <div className="nav-user-section">
                  <span className="nav-username">@{session.user?.username}</span>
                  <button className="nav-logout" onClick={() => signOut({ callbackUrl: "/" })}>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="nav-link">Login</Link>
                <Link href="/auth/signup" className="nav-link nav-cta">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* --- MOBILE TOP HEADER (Logo Only) --- */}
      <div className="mobile-only mobile-header">
        <Link href="/" className="navbar-brand">
          <span className="brand-icon">🏏</span>
          <span className="brand-text">CricDare</span>
        </Link>
      </div>

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className="mobile-bottom-nav mobile-only">
        {session ? (
          <>
            <Link href="/dashboard" className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}>
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </Link>
            <Link href="/challenge/create" className="nav-link nav-cta">
              <span className="nav-icon">🎯</span>
              <span className="nav-text">Create</span>
            </Link>
            {session.user?.isAdmin && (
              <Link href="/admin/settings" className={`nav-link ${pathname === "/admin/settings" ? "active" : ""}`}>
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">Admin</span>
              </Link>
            )}
            <Link href="/profile" className={`nav-link ${pathname === "/profile" ? "active" : ""}`}>
              <span className="nav-icon">👤</span>
              <span className="nav-text">Profile</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="nav-link">
              <span className="nav-icon">🔑</span>
              <span className="nav-text">Login</span>
            </Link>
            <Link href="/auth/signup" className="nav-link nav-cta">
              <span className="nav-icon">✨</span>
              <span className="nav-text">Sign Up</span>
            </Link>
          </>
        )}
      </nav>
    </>
  );
}
