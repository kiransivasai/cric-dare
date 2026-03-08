import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata = {
  title: "CricDare — Cricket Prediction Challenges",
  description:
    "Challenge your friends with cricket match predictions. Pick the winner, Man of the Match, and more. See who knows cricket best!",
  keywords: "cricket, prediction, challenge, dare, friends, IPL, ODI, T20",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ScrollToTop />
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
