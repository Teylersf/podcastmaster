"use client";

import { useEffect } from "react";
import { useUser } from "@stackframe/stack";

// Fires exactly once per browser session after the user is signed in. Its job
// is to trigger the server-side lazy creation of the UserProfile row so:
//   1. A referral code is allocated the moment the user has an identity.
//   2. The signup IP hash is captured near sign-up time (not months later
//      when they finally hit the dashboard).
//
// We flag success in sessionStorage so it doesn't refetch on every route
// change within a single session — but it will re-fire on a fresh tab, which
// is fine (the endpoint is idempotent).
const HYDRATED_KEY = "pm_profile_hydrated";

export default function ProfileHydrator() {
  const user = useUser();

  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(HYDRATED_KEY) === user.id) return;

    fetch("/api/user/profile", { method: "GET", cache: "no-store" })
      .then((r) => {
        if (r.ok) sessionStorage.setItem(HYDRATED_KEY, user.id);
      })
      .catch(() => {
        // Non-fatal — the profile will be created lazily on the next request
        // that touches it (e.g. the paywall check). No need to retry here.
      });
  }, [user]);

  return null;
}
