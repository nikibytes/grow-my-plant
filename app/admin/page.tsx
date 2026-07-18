"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminLeaf {
  id: string;
  username: string;
  displayUsername: string;
  leafStyle: number;
  anchorIndex: number;
  status: string;
  createdAt: string;
}
interface AdminEvent {
  id: string;
  eventType: string;
  eventKey: string;
  processingStatus: string;
  errorMessage: string | null;
  receivedAt: string;
}
interface BlockedUser {
  id: string;
  instagramUsername: string | null;
  reason: string | null;
  createdAt: string;
}
interface CampaignInfo {
  id: string;
  name: string;
  slug: string;
  instagramMediaId: string | null;
  instagramPermalink: string | null;
  triggerTerms: string[];
  isActive: boolean;
  moderationMode: string;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [slug, setSlug] = useState("community-plant");
  const [data, setData] = useState<{
    campaign: CampaignInfo;
    totalLeaves: number;
    stage: string;
    leaves: AdminLeaf[];
    blockedUsers: BlockedUser[];
    recentEvents: AdminEvent[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const headers = useCallback(
    () => ({ "Content-Type": "application/json", "x-admin-secret": secret }),
    [secret],
  );

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/admin?slug=${encodeURIComponent(slug)}`, {
      headers: { "x-admin-secret": secret },
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "failed");
      setData(null);
      return;
    }
    setData(json);
  }, [slug, secret]);

  useEffect(() => {
    if (secret && slug) load();
  }, [secret, slug, load]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    const res = await fetch(`/api/admin`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "action failed");
    } else {
      setError(null);
      await load();
    }
  };

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/leaves/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "status update failed");
    } else {
      await load();
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">🌱 Admin · Community Plant</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="admin secret"
          className="rounded border border-bark/30 px-3 py-2 text-sm"
          type="password"
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="campaign slug"
          className="rounded border border-bark/30 px-3 py-2 text-sm"
        />
        <button onClick={load} className="rounded bg-leaf px-4 py-2 text-sm font-semibold text-white">
          Load
        </button>
      </div>

      {error && <p className="mt-3 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}

      {data && (
        <div className="mt-6 space-y-6">
          <section className="rounded-xl bg-white/80 p-4 shadow-sm">
            <h2 className="font-bold">{data.campaign.name}</h2>
            <p className="text-sm text-bark/70">
              {data.totalLeaves} leaves · stage {data.stage} ·{" "}
              {data.campaign.isActive ? "active" : "inactive"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                disabled={busy}
                onClick={() => post({ action: "addTestLeaf", campaignId: data.campaign.id, username: `test_${Math.floor(Math.random() * 9999)}` })}
                className="rounded bg-leaf px-3 py-1.5 text-xs font-semibold text-white"
              >
                + Add test leaf
              </button>
              <button
                disabled={busy}
                onClick={() => post({ action: data.campaign.isActive ? "deactivate" : "activate", id: data.campaign.id })}
                className="rounded bg-bark px-3 py-1.5 text-xs font-semibold text-white"
              >
                {data.campaign.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                disabled={busy}
                onClick={() => post({ action: "resetDemo", id: data.campaign.id })}
                className="rounded bg-red-200 px-3 py-1.5 text-xs font-semibold text-red-800"
              >
                Reset demo
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                defaultValue={(data.campaign.triggerTerms || ["🌱"]).join(",")}
                id="trig"
                className="rounded border px-2 py-1 text-xs"
                placeholder="triggers, comma-sep"
              />
              <button
                onClick={() =>
                  post({
                    action: "setTrigger",
                    id: data.campaign.id,
                    triggerTerms: (document.getElementById("trig") as HTMLInputElement)
                      .value.split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="rounded bg-leaf-light px-3 py-1.5 text-xs font-semibold text-leaf-dark"
              >
                Save triggers
              </button>
            </div>
          </section>

          <section>
            <h2 className="font-bold">Leaves ({data.leaves.length})</h2>
            <ul className="mt-2 divide-y rounded-xl bg-white/80 shadow-sm">
              {data.leaves.map((l) => (
                <li key={l.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>
                    <span className="font-medium">@{l.username}</span>{" "}
                    <span className="text-bark/50">#{l.anchorIndex + 1}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-bark/50">{l.status}</span>
                    <button onClick={() => setStatus(l.id, "hidden")} className="text-xs text-amber-700 underline">
                      hide
                    </button>
                    <button onClick={() => setStatus(l.id, "visible")} className="text-xs text-leaf-dark underline">
                      show
                    </button>
                    <button onClick={() => setStatus(l.id, "removed")} className="text-xs text-red-700 underline">
                      remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-bold">Blocked users ({data.blockedUsers.length})</h2>
            <ul className="mt-2 divide-y rounded-xl bg-white/80 shadow-sm">
              {data.blockedUsers.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>@{b.instagramUsername ?? "(unknown)"}</span>
                  <button
                    onClick={() => post({ action: "unblock", campaignId: data.campaign.id, username: b.instagramUsername })}
                    className="text-xs text-red-700 underline"
                  >
                    unblock
                  </button>
                </li>
              ))}
              {data.blockedUsers.length === 0 && (
                <li className="px-4 py-2 text-sm text-bark/50">none</li>
              )}
            </ul>
          </section>

          <section>
            <h2 className="font-bold">Recent events (processing log)</h2>
            <ul className="mt-2 divide-y rounded-xl bg-white/80 text-xs shadow-sm">
              {data.recentEvents.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-4 py-2">
                  <span>
                    <span className="font-medium">{e.eventType}</span>{" "}
                    <span className="text-bark/50">{e.processingStatus}</span>
                  </span>
                  <span className="text-bark/50">{new Date(e.receivedAt).toLocaleTimeString()}</span>
                </li>
              ))}
              {data.recentEvents.length === 0 && (
                <li className="px-4 py-2 text-bark/50">no events yet</li>
              )}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
