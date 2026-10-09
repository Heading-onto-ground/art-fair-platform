"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/app/components/TopBar";
import "@/app/components/history/history.css";

type Claim = {
  id: string;
  status: string;
  note: string | null;
  submittedAt: string;
  artist: { slug: string; canonicalName: string; nativeName: string | null };
  user: { email: string };
};

export default function HistoryClaimsAdmin() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/history/claims")
      .then((response) => response.json())
      .then((data) => setClaims(Array.isArray(data.claims) ? data.claims : []))
      .catch(() => setMessage("Could not load claims."));
  }, []);

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    const response = await fetch("/api/admin/history/claims", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Could not review the claim.");
      return;
    }
    setClaims((current) => current.filter((claim) => claim.id !== id));
  }

  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap">
        <h1 className="rh-title">Claims</h1>
        <p>Pending artist claims. Notes stay on this admin page.</p>
        {claims.length === 0 ? <p>No pending claims.</p> : null}
        {claims.map((claim) => (
          <article key={claim.id} className="rh-card">
            <Link href={`/artists/${claim.artist.slug}`}>{claim.artist.canonicalName}</Link>
            <p>{claim.user.email}</p>
            {claim.note ? <p>{claim.note}</p> : null}
            <button className="rh-button" type="button" onClick={() => review(claim.id, "APPROVED")}>Approve</button>
            <button className="rh-button" type="button" onClick={() => review(claim.id, "REJECTED")}>Reject</button>
          </article>
        ))}
        {message ? <p>{message}</p> : null}
      </main>
    </div>
  );
}
