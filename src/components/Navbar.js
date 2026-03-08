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
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <span className="brand-icon">🏏</span>
          <span className="brand-text">CricDare</span>
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${menuOpen ? "open" : ""}`} />
        </button>

        <div className={`navbar-links ${menuOpen ? "active" : ""}`}>
          {session ? (
            <>
              <Link
                href="/dashboard"
                className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/challenge/create"
                className="nav-link nav-cta"
                onClick={() => setMenuOpen(false)}
              >
                🎯 Create Dare
              </Link>
              {session.user?.isAdmin && (
                <Link
                  href="/admin/settings"
                  className={`nav-link ${pathname === "/admin/settings" ? "active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  ⚙️ Admin
                </Link>
              )}
              <div className="nav-user-section">
                <span className="nav-username">@{session.user?.username}</span>
                <button
                  className="nav-logout"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="nav-link"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="nav-link nav-cta"
                onClick={() => setMenuOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
