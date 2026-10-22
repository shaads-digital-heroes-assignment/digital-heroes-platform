import React, { useState, useEffect } from "react";
import {
  Users,
  Trophy,
  Heart,
  CheckCircle,
  BarChart3,
  Play,
  Trash2,
  Edit3,
} from "lucide-react";
import { API_URL, type Charity } from "../App";

interface Props {
  token: string;
  charities: Charity[];
  onRefreshCharities: () => void;
}

export default function AdminDashboard({
  token,
  charities,
  onRefreshCharities,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "analytics" | "draws" | "winners" | "users" | "charities"
  >("draws");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [drawsList, setDrawsList] = useState<any[]>([]);
  const [winnersList, setWinnersList] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  const [drawType, setDrawType] = useState<"random" | "algorithmic">("random");
  const [monthTitle, setMonthTitle] = useState("November 2026 Official Draw");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  // Admin Score & User Edit States (Section 11.01)
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editScoreVal, setEditScoreVal] = useState<number>(36);

  // Charity Create / Edit State (Section 11.03)
  const [editingCharityId, setEditingCharityId] = useState<string | null>(null);
  const [newCharity, setNewCharity] = useState({
    name: "",
    category: "Community Impact",
    short_summary: "",
    description: "",
    banner_url:
      "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1200&q=80",
    is_featured: false,
  });

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchAllAdminData = async () => {
    try {
      const [uRes, dRes, wRes, aRes] = await Promise.all([
        fetch(`${API_URL}/admin/draws/users`, { headers: authHeaders }),
        fetch(`${API_URL}/admin/draws`, { headers: authHeaders }),
        fetch(`${API_URL}/admin/draws/winners`, { headers: authHeaders }),
        fetch(`${API_URL}/admin/draws/analytics`, { headers: authHeaders }),
      ]);
      if (uRes.ok) setUsersList(await uRes.json());
      if (dRes.ok) setDrawsList(await dRes.json());
      if (wRes.ok) setWinnersList(await wRes.json());
      if (aRes.ok) setAnalytics(await aRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  const handleSimulateDraw = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/draws/simulate`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ draw_type: drawType, month_title: monthTitle }),
      });
      const data = await res.json();
      if (res.ok) {
        const b = data.simulationBreakdown;
        setAdminMsg(
          `Simulated ${drawType.toUpperCase()} draw! Numbers: [${data.draw.winning_numbers.join(", ")}] • Preview Matches — 5-Match: ${b?.tier5Count || 0}, 4-Match: ${b?.tier4Count || 0}, 3-Match: ${b?.tier3Count || 0}`,
        );
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePublishDraw = async (drawId: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/draws/${drawId}/publish`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMsg(
          `Draw Published! Matched ${data.winners_count ?? data.winnersRecorded ?? 0} winning subscriber ticket(s).`,
        );
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyWinner = async (
    winnerId: string,
    verification_status: string,
    payment_status: string,
  ) => {
    try {
      const res = await fetch(`${API_URL}/admin/draws/winners/${winnerId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ verification_status, payment_status }),
      });
      if (res.ok) {
        setAdminMsg("Winner verification and payout status updated!");
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleUserSub = async (userId: string, status: string) => {
    try {
      await fetch(`${API_URL}/admin/draws/users/${userId}/subscription`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      setAdminMsg(`User subscription updated to ${status}.`);
      fetchAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminUpdateScore = async (scoreId: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/draws/scores/${scoreId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ score: editScoreVal }),
      });
      if (res.ok) {
        setEditingScoreId(null);
        setAdminMsg("User golf score updated by Admin.");
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminDeleteScore = async (scoreId: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/draws/scores/${scoreId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        setAdminMsg("User golf score deleted by Admin.");
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCharity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCharityId
        ? `${API_URL}/charities/${editingCharityId}`
        : `${API_URL}/charities`;
      const method = editingCharityId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(newCharity),
      });
      if (res.ok) {
        setAdminMsg(
          editingCharityId
            ? `Charity "${newCharity.name}" updated!`
            : `Charity "${newCharity.name}" added to directory!`,
        );
        setEditingCharityId(null);
        setNewCharity({
          name: "",
          category: "Community Impact",
          short_summary: "",
          description: "",
          banner_url:
            "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1200&q=80",
          is_featured: false,
        });
        onRefreshCharities();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCharity = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/charities/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        setAdminMsg("Charity removed.");
        onRefreshCharities();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
            Section 11 • Full Platform Control
          </span>
          <h1 className="text-3xl font-extrabold mt-1">
            Administrator Command Surface
          </h1>
        </div>

        <div className="flex flex-wrap gap-2 bg-[#161920] p-1.5 rounded-2xl border border-white/10">
          {[
            { id: "draws", label: "02 Draw Engine", icon: Trophy },
            { id: "winners", label: "04 Winners & Payouts", icon: CheckCircle },
            { id: "users", label: "01 Users & Scores", icon: Users },
            { id: "charities", label: "03 Charities CRUD", icon: Heart },
            {
              id: "analytics",
              label: "05 Reports & Analytics",
              icon: BarChart3,
            },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3.5 py-2 max-sm:w-full justify-center rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === t.id
                    ? "bg-[#FF5A36] text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {adminMsg && (
        <div className="p-4 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-semibold flex justify-between">
          <span>{adminMsg}</span>
          <button
            onClick={() => setAdminMsg(null)}
            className="underline cursor-pointer"
          >
            Close
          </button>
        </div>
      )}

      {/* TAB 02: DRAW MANAGEMENT & SIMULATOR */}
      {activeTab === "draws" && (
        <div className="space-y-8">
          <div className="rounded-3xl bg-[#161920] border border-white/10 p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-bold">
              Configure & Simulate Monthly Draw
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Draw Title / Cadence
                </label>
                <input
                  type="text"
                  value={monthTitle}
                  onChange={(e) => setMonthTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Draw Algorithm Mode (Section 06)
                </label>
                <select
                  value={drawType}
                  onChange={(e) => setDrawType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm"
                >
                  <option value="random">
                    Random (Standard Lottery Style 1–45)
                  </option>
                  <option value="algorithmic">
                    Algorithmic (Weighted by Score Frequency)
                  </option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSimulateDraw}
                  className="w-full py-2.5 rounded-xl bg-[#FF5A36] hover:bg-[#ff6d4d] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Run Simulation</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold">Simulated & Published Draws</h3>
            {drawsList.map((d) => (
              <div
                key={d.id}
                className="p-6 rounded-3xl bg-[#161920] border border-white/10 flex flex-wrap items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        d.status === "published"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {d.status}
                    </span>
                    <span className="text-xs uppercase font-mono text-zinc-400">
                      {d.draw_type}
                    </span>
                    <h4 className="font-bold text-lg">{d.draw_title}</h4>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                    <span>
                      Total Pool:{" "}
                      <strong className="text-emerald-400">
                        ${(d.total_pool_cents / 100).toFixed(2)}
                      </strong>
                    </span>
                    <span>
                      5-Match (40% + Rollover):{" "}
                      <strong className="text-white">
                        ${(d.tier_5_pool_cents / 100).toFixed(2)}
                      </strong>
                    </span>
                    <span>
                      4-Match (35%):{" "}
                      <strong className="text-white">
                        ${(d.tier_4_pool_cents / 100).toFixed(2)}
                      </strong>
                    </span>
                    <span>
                      3-Match (25%):{" "}
                      <strong className="text-white">
                        ${(d.tier_3_pool_cents / 100).toFixed(2)}
                      </strong>
                    </span>
                    {d.rollover_out_cents > 0 && (
                      <span className="text-amber-300">
                        Unclaimed Jackpot Rollover: $
                        {(d.rollover_out_cents / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    {(d.winning_numbers || []).map((n: number, idx: number) => (
                      <span
                        key={idx}
                        className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-mono font-bold text-amber-400"
                      >
                        {n}
                      </span>
                    ))}
                  </div>

                  {d.status === "simulated" && (
                    <button
                      onClick={() => handlePublishDraw(d.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs cursor-pointer"
                    >
                      Publish & Match Winners
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 04: WINNERS VERIFICATION & PAYOUTS */}
      {activeTab === "winners" && (
        <div className="rounded-3xl bg-[#161920] border border-white/10 p-4 md:p-6 space-y-4">
          <h2 className="text-xl font-bold">
            Winner Proof Verification & Payout Queue
          </h2>
          {winnersList.length === 0 ? (
            <p className="text-xs text-zinc-400">
              No winners recorded yet. Simulate and publish a draw to evaluate
              subscriber matches.
            </p>
          ) : (
            <div className="space-y-3">
              {winnersList.map((w) => (
                <div
                  key={w.id}
                  className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-sm text-white">
                      {w.full_name} ({w.email}) —{" "}
                      <span className="text-amber-400">
                        {w.match_tier}-Number Match
                      </span>
                    </div>
                    <div className="text-zinc-400">
                      Prize:{" "}
                      <strong className="text-emerald-400">
                        ${(w.prize_amount_cents / 100).toFixed(2)}
                      </strong>{" "}
                      • Matched: [{(w.matched_numbers || []).join(", ")}] •
                      Snapshot: [{(w.user_scores_snapshot || []).join(", ")}] •
                      Status:{" "}
                      <strong className="uppercase text-white">
                        {w.verification_status}
                      </strong>{" "}
                      /{" "}
                      <strong className="uppercase text-emerald-400">
                        {w.payment_status}
                      </strong>
                    </div>
                    {w.proof_screenshot_url && (
                      <a
                        href={w.proof_screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#FF5A36] underline block"
                      >
                        Inspect Uploaded Screenshot Proof
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() =>
                        handleVerifyWinner(w.id, "approved", w.payment_status)
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold cursor-pointer"
                    >
                      Approve Proof
                    </button>
                    <button
                      onClick={() =>
                        handleVerifyWinner(w.id, "rejected", "pending")
                      }
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 text-xs font-semibold cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() =>
                        handleVerifyWinner(w.id, "approved", "paid")
                      }
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                    >
                      Mark Payout Paid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 01: USER, SUBSCRIPTION & GOLF SCORE MANAGEMENT (Section 11.01) */}
      {activeTab === "users" && (
        <div className="rounded-3xl bg-[#161920] border border-white/10 p-6 space-y-4">
          <h2 className="text-xl font-bold">
            Registered Users, Subscriptions & Golf Score Control
          </h2>
          <div className="space-y-4">
            {usersList.map((u) => (
              <div
                key={u.id}
                className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-sm">
                      {u.full_name}{" "}
                      <span className="text-xs text-zinc-400">({u.email})</span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Role: {u.role} • Charity Split: {u.charity_percentage}% •
                      Sub Status:{" "}
                      <strong className="text-emerald-400 uppercase">
                        {u.subscription_status || "inactive"}
                      </strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleUserSub(u.id, "active")}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold cursor-pointer"
                    >
                      Set Active
                    </button>
                    <button
                      onClick={() => handleToggleUserSub(u.id, "lapsed")}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-xs font-semibold cursor-pointer"
                    >
                      Set Lapsed
                    </button>
                    <button
                      onClick={() => handleToggleUserSub(u.id, "cancelled")}
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 text-xs font-semibold cursor-pointer"
                    >
                      Set Cancelled
                    </button>
                  </div>
                </div>

                {/* User's Latest 5 Scores with Admin Edit/Delete */}
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-zinc-400 mr-1">
                    Active 5 Scores:
                  </span>
                  {(u.scores || []).length === 0 ? (
                    <span className="text-[11px] text-zinc-500">
                      No scores logged
                    </span>
                  ) : (
                    (u.scores || []).map((sc: any) => (
                      <div
                        key={sc.id}
                        className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs flex items-center gap-2"
                      >
                        {editingScoreId === sc.id ? (
                          <>
                            <input
                              type="number"
                              min={1}
                              max={45}
                              value={editScoreVal}
                              onChange={(e) =>
                                setEditScoreVal(Number(e.target.value))
                              }
                              className="w-12 px-1 py-0.5 rounded bg-black border border-white/20 font-mono text-xs"
                            />
                            <button
                              onClick={() => handleAdminUpdateScore(sc.id)}
                              className="text-emerald-400 font-bold cursor-pointer"
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="font-mono font-bold text-amber-400">
                              {sc.score}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              ({String(sc.played_date).split("T")[0]})
                            </span>
                            <button
                              onClick={() => {
                                setEditingScoreId(sc.id);
                                setEditScoreVal(sc.score);
                              }}
                              className="text-zinc-400 hover:text-white cursor-pointer"
                              title="Edit Score"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleAdminDeleteScore(sc.id)}
                              className="text-zinc-400 hover:text-red-400 cursor-pointer"
                              title="Delete Score"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 03: CHARITY MANAGEMENT CRUD (Section 11.03) */}
      {activeTab === "charities" && (
        <div className="grid lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleSaveCharity}
            className="lg:col-span-5 rounded-3xl bg-[#161920] border border-white/10 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingCharityId ? "Edit Charity Listing" : "Add New Charity"}
              </h3>
              {editingCharityId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCharityId(null);
                    setNewCharity({
                      name: "",
                      category: "Community Impact",
                      short_summary: "",
                      description: "",
                      banner_url:
                        "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1200&q=80",
                      is_featured: false,
                    });
                  }}
                  className="text-xs text-zinc-400 underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Charity Name"
              value={newCharity.name}
              onChange={(e) =>
                setNewCharity({ ...newCharity, name: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-sm"
              required
            />
            <input
              type="text"
              placeholder="Category (e.g. Environment, Youth)"
              value={newCharity.category}
              onChange={(e) =>
                setNewCharity({ ...newCharity, category: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-sm"
              required
            />
            <input
              type="text"
              placeholder="Short Summary"
              value={newCharity.short_summary}
              onChange={(e) =>
                setNewCharity({ ...newCharity, short_summary: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-sm"
              required
            />
            <textarea
              placeholder="Full Description"
              value={newCharity.description}
              onChange={(e) =>
                setNewCharity({ ...newCharity, description: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-sm h-24"
              required
            />
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={newCharity.is_featured}
                onChange={(e) =>
                  setNewCharity({
                    ...newCharity,
                    is_featured: e.target.checked,
                  })
                }
              />
              <span>Feature on Homepage Spotlight</span>
            </label>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#FF5A36] text-white font-bold text-xs cursor-pointer"
            >
              {editingCharityId ? "Update Charity" : "Create Charity"}
            </button>
          </form>

          <div className="lg:col-span-7 rounded-3xl bg-[#161920] border border-white/10 p-6 space-y-3">
            <h3 className="text-lg font-bold">
              Listed Charities ({charities.length})
            </h3>
            {charities.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-sm">{c.name}</div>
                  <div className="text-xs text-zinc-400">
                    {c.category} • Raised: $
                    {(c.total_raised_cents / 100).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCharityId(c.id);
                      setNewCharity({
                        name: c.name,
                        category: c.category,
                        short_summary: c.short_summary,
                        description: c.description,
                        banner_url: c.banner_url,
                        is_featured: c.is_featured,
                      });
                    }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer"
                    title="Edit Charity"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCharity(c.id)}
                    className="p-2 rounded-xl bg-red-500/20 text-red-300 hover:bg-red-500/30 cursor-pointer"
                    title="Delete Charity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 05: REPORTS & ANALYTICS (Section 11.05) */}
      {activeTab === "analytics" && analytics && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-[#161920] border border-white/10">
            <span className="text-xs text-zinc-400">Total Users</span>
            <div className="text-3xl font-mono font-extrabold mt-2">
              {analytics.total_users}
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-[#161920] border border-white/10">
            <span className="text-xs text-zinc-400">Active Subscribers</span>
            <div className="text-3xl font-mono font-extrabold text-emerald-400 mt-2">
              {analytics.active_subscribers}
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-[#161920] border border-white/10">
            <span className="text-xs text-zinc-400">Total Charity Raised</span>
            <div className="text-3xl font-mono font-extrabold text-[#FF5A36] mt-2">
              ${(analytics.total_charity_cents / 100).toLocaleString()}
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-[#161920] border border-white/10">
            <span className="text-xs text-zinc-400">
              Total Prize Pools Generated
            </span>
            <div className="text-3xl font-mono font-extrabold text-amber-400 mt-2">
              ${(analytics.total_prize_pool_cents / 100).toLocaleString()}
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-[#161920] border border-white/10">
            <span className="text-xs text-zinc-400">
              Published Monthly Draws
            </span>
            <div className="text-3xl font-mono font-extrabold text-purple-400 mt-2">
              {analytics.published_draws ?? 0}
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-[#161920] border border-white/10">
            <span className="text-xs text-zinc-400">
              Total Draw Winners Recorded
            </span>
            <div className="text-3xl font-mono font-extrabold text-sky-400 mt-2">
              {analytics.total_winners ?? 0}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
