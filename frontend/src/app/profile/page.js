"use client";

import { Suspense } from "react";
import UserProfile from "@/components/profile/profile";

function ProfileFallback() {
  return (
    <div className="tn-profile-page">
      <div className="tn-cohorts-loading">
        <div className="tn-spinner" />
        <p>Loading AI Developer Profile...</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <UserProfile />
    </Suspense>
  );
}
