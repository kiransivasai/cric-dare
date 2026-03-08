import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // We will handle admin redirects in the page components instead
    // Middleware sometimes has issues reading the full JWT if not configured perfectly
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/challenge/:path*",
    "/admin/:path*",
    "/api/challenge/:path*",
    "/api/picks/:path*",
    "/api/admin/:path*",
  ],
};
