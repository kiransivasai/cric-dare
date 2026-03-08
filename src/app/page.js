import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-emoji">🏏</span>
          <h1 className="hero-title">
            Dare Your Friends.
            <br />
            <span className="highlight">Predict the Match.</span>
            <br />
            <span className="highlight-accent">Prove You Know Cricket.</span>
          </h1>
          <p className="hero-subtitle">
            Create prediction challenges for upcoming cricket matches, share
            with friends, and see who really knows the game. Pick the winner,
            Man of the Match, total runs — and more!
          </p>
          <div className="hero-actions">
            {session ? (
              <>
                <Link href="/challenge/create" className="btn btn-primary btn-lg">
                  🎯 Start a Dare
                </Link>
                <Link href="/dashboard" className="btn btn-secondary btn-lg">
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signup" className="btn btn-primary btn-lg">
                  🎯 Start a Dare
                </Link>
                <Link href="/auth/login" className="btn btn-secondary btn-lg">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <span className="step-emoji">📋</span>
            <div className="step-number">1</div>
            <h3>Pick a Match</h3>
            <p>
              Choose from upcoming international cricket matches — ODIs, T20s,
              or Tests.
            </p>
          </div>
          <div className="step-card">
            <span className="step-emoji">🎯</span>
            <div className="step-number">2</div>
            <h3>Set Your Dare</h3>
            <p>
              Build 5 prediction questions — who wins, Man of the Match, total
              runs, sixes, and fours.
            </p>
          </div>
          <div className="step-card">
            <span className="step-emoji">📱</span>
            <div className="step-number">3</div>
            <h3>Share with Friends</h3>
            <p>
              Send a link via WhatsApp or copy it. Friends sign up, make their
              picks, and lock in.
            </p>
          </div>
          <div className="step-card">
            <span className="step-emoji">🏆</span>
            <div className="step-number">4</div>
            <h3>See the Results</h3>
            <p>
              After the match, results are auto-resolved. See the leaderboard
              and who nailed it!
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
