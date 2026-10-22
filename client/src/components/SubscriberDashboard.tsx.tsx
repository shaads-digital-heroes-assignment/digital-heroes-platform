import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@supabase/supabase-js";
import {
  Trophy,
  Heart,
  Calendar,
  PlusCircle,
  Trash2,
  Edit3,
  UploadCloud,
  RefreshCw,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { API_URL, type Charity, type UserProfile } from "../App";
import { type StripeModalConfig } from "./StripeCheckoutModal";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const scoreSchema = z.object({
  score: z
    .number()
    .int()
    .min(1, "Min score is 1")
    .max(45, "Max Stableford score is 45"),
  played_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid date"),
});

type ScoreFormValues = z.infer<typeof scoreSchema>;

interface Props {
  user: UserProfile;
  token: string;
  charities: Charity[];
  onRefreshCharities: () => void;
  onOpenStripeModal: (config: StripeModalConfig | null) => void;
}

export default function SubscriberDashboard({
  user,
  token,
  charities,
  onRefreshCharities,
  onOpenStripeModal,
}: Props) {
  const [subscription, setSubscription] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [winnings, setWinnings] = useState<any[]>([]);
  const [publishedDraws, setPublishedDraws] = useState<any[]>([]);
  const [selectedCharityId, setSelectedCharityId] = useState(
    user.selected_charity_id || charities[0]?.id || "",
  );
  const [charityPct, setCharityPct] = useState(user.charity_percentage || 15);
  const [statusMsg, setStatusMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [loadingSync, setLoadingSync] = useState<boolean>(false);
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editScoreValue, setEditScoreValue] = useState<number>(36);

  const dashRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScoreFormValues>({
    resolver: zodResolver(scoreSchema),
    defaultValues: {
      score: 36,
      played_date: new Date().toISOString().split("T")[0],
    },
  });

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // GSAP Entrance Animation for Dashboard Modules
  useGSAP(
    () => {
      gsap.fromTo(
        ".gsap-dash-card",
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power2.out" },
      );
    },
    { scope: dashRef },
  );

  const fetchDashboardData = async () => {
    setLoadingSync(true);
    try {
      const [subRes, scoresRes, winRes, drawsRes] = await Promise.all([
        fetch(`${API_URL}/auth/me`, { headers: authHeaders }),
        fetch(`${API_URL}/scores`, { headers: authHeaders }),
        fetch(`${API_URL}/scores/my-winnings`, { headers: authHeaders }),
        fetch(`${API_URL}/admin/draws/public`),
      ]);

      if (subRes.ok) {
        const meData = await subRes.json();
        setSubscription(meData.subscription);
        if (meData.user?.selected_charity_id)
          setSelectedCharityId(meData.user.selected_charity_id);
        if (meData.user?.charity_percentage)
          setCharityPct(meData.user.charity_percentage);
      }
      if (scoresRes.ok) setScores(await scoresRes.json());
      if (winRes.ok) setWinnings(await winRes.json());
      if (drawsRes.ok) {
        const dData = await drawsRes.json();
        setPublishedDraws(
          Array.isArray(dData) ? dData : dData.publishedDraws || [],
        );
      }
    } catch (err) {
      console.error(err);
      setStatusMsg({
        type: "err",
        text: "Failed to sync dashboard data with server.",
      });
    } finally {
      setLoadingSync(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const selectedCharityObj =
    charities.find((c) => c.id === selectedCharityId) || charities[0];

  // Open Interactive Stripe Checkout Modal for Monthly ($15) or Yearly ($144) Plan
  const handleOpenSubscribeModal = (plan_type: "monthly" | "yearly") => {
    const amountCents = plan_type === "yearly" ? 14400 : 1500;
    onOpenStripeModal({
      mode: "subscription",
      planType: plan_type,
      amountCents,
      charityName: selectedCharityObj?.name || "Selected Charity",
      charityPercentage: charityPct,
      onClose: () => onOpenStripeModal(null),
      onSuccess: async ({ cardLast4, simulateDecline }) => {
        const res = await fetch(`${API_URL}/auth/subscribe`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            plan_type,
            card_last4: cardLast4,
            simulate_decline: simulateDecline,
          }),
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Subscription payment failed");

        setStatusMsg({
          type: "ok",
          text: `Stripe Receipt (${data.stripe_receipt?.transaction_id}): ${plan_type.toUpperCase()} plan active! ${charityPct}% credited to ${selectedCharityObj?.name}.`,
        });
        fetchDashboardData();
        onRefreshCharities();
      },
    });
  };

  const handleCancelSubscription = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/cancel-subscription`, {
        method: "POST",
        headers: authHeaders,
      });
      if (res.ok) {
        setStatusMsg({
          type: "ok",
          text: "Subscription cancelled. You can renew anytime via Stripe.",
        });
        fetchDashboardData();
      }
    } catch (err: any) {
      setStatusMsg({ type: "err", text: err.message });
    }
  };

  const onAddScore = async (values: ScoreFormValues) => {
    setStatusMsg(null);
    setSubmittingScore(true);
    try {
      const res = await fetch(`${API_URL}/scores`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatusMsg({
        type: "ok",
        text: "Score logged! Rolling 5-score window updated in reverse chronological order.",
      });
      reset({ score: 36, played_date: new Date().toISOString().split("T")[0] });
      fetchDashboardData();
    } catch (err: any) {
      setStatusMsg({ type: "err", text: err.message });
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleUpdateScore = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/scores/${id}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ score: editScoreValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingScoreId(null);
      setStatusMsg({ type: "ok", text: "Score updated!" });
      fetchDashboardData();
    } catch (err: any) {
      setStatusMsg({ type: "err", text: err.message });
    }
  };

  const handleDeleteScore = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/scores/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        setStatusMsg({ type: "ok", text: "Score entry deleted." });
        fetchDashboardData();
      }
    } catch (err: any) {
      setStatusMsg({ type: "err", text: err.message });
    }
  };

  const handleUpdateCharityPreference = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/charity-settings`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          selected_charity_id: selectedCharityId,
          charity_percentage: charityPct,
        }),
      });
      if (res.ok) {
        setStatusMsg({
          type: "ok",
          text: `Charity preference saved! ${charityPct}% of your membership supports ${selectedCharityObj?.name}.`,
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: "err", text: err.message });
    }
  };

  const handleProofUpload = async (winnerId: string, file: File) => {
    try {
      let proofUrl = `https://placehold.co/600x400/161920/FF5A36?text=Verified+Score+Proof+${encodeURIComponent(file.name)}`;

      if (supabase) {
        const fileName = `proof_${winnerId}_${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
          .from("platform-media")
          .upload(fileName, file, { upsert: true });
        if (!error && data) {
          const { data: pubUrl } = supabase.storage
            .from("platform-media")
            .getPublicUrl(data.path);
          proofUrl = pubUrl.publicUrl;
        }
      }

      const res = await fetch(`${API_URL}/scores/winnings/${winnerId}/proof`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ proof_screenshot_url: proofUrl }),
      });
      if (res.ok) {
        setStatusMsg({
          type: "ok",
          text: "Winner screenshot proof uploaded! Sent for Admin review.",
        });
        fetchDashboardData();
      }
    } catch (err: any) {
      setStatusMsg({ type: "err", text: err.message });
    }
  };

  const isSubActive = subscription?.status === "active";
  const totalWonCents = winnings.reduce(
    (acc, w) => acc + (w.prize_amount_cents || 0),
    0,
  );

  return (
    <div ref={dashRef} className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF5A36]">
            Section 10 • Registered Subscriber Command Center
          </span>
          <h1 className="text-3xl font-extrabold mt-1">
            Welcome, {user.full_name}
          </h1>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loadingSync}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loadingSync ? "animate-spin text-[#FF5A36]" : ""}`}
          />
          <span>{loadingSync ? "Syncing Ledger..." : "Sync Status"}</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
            statusMsg.type === "ok"
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
              : "bg-red-500/15 border-red-500/40 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TOP METRICS ROW */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Module 1: Subscription & Stripe Gateway */}
        <div className="gsap-dash-card rounded-3xl bg-[#161920] border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-zinc-400">
              Stripe Membership Status
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                isSubActive
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {subscription?.status || "Inactive"}
            </span>
          </div>

          {isSubActive ? (
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-extrabold capitalize">
                  {subscription.plan_type} Plan
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Renews on{" "}
                  {new Date(subscription.renewal_date).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleOpenSubscribeModal(
                      subscription.plan_type === "monthly"
                        ? "yearly"
                        : "monthly",
                    )
                  }
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold transition cursor-pointer"
                >
                  Switch Plan
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="flex-1 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Activate via Stripe Checkout to unlock score entry & monthly
                prize draws:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleOpenSubscribeModal("monthly")}
                  className="p-3 rounded-2xl bg-[#FF5A36] hover:bg-[#ff6d4d] text-white text-left transition cursor-pointer"
                >
                  <div className="text-xs opacity-80 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Monthly
                  </div>
                  <div className="text-lg font-extrabold">$15/mo</div>
                </button>
                <button
                  onClick={() => handleOpenSubscribeModal("yearly")}
                  className="p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-left transition cursor-pointer"
                >
                  <div className="text-xs font-bold">Yearly (Save 20%)</div>
                  <div className="text-lg font-extrabold">$144/yr</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Module 2: Selected Charity & Contribution % (10% Mandatory up to 100%) */}
        <div className="gsap-dash-card rounded-3xl bg-[#161920] border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-zinc-400">
              Charity Split (10%–100%)
            </span>
            <Heart className="w-4 h-4 text-[#FF5A36]" />
          </div>
          <div className="space-y-3">
            <select
              value={selectedCharityId}
              onChange={(e) => setSelectedCharityId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs"
            >
              {charities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">
                  Mandatory Min 10% • Slide to 100%
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {charityPct}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={charityPct}
                onChange={(e) => setCharityPct(Number(e.target.value))}
                className="w-full accent-[#FF5A36]"
              />
            </div>
            <button
              onClick={handleUpdateCharityPreference}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold transition cursor-pointer"
            >
              Save Charity Allocation
            </button>
          </div>
        </div>

        {/* Module 3: Participation & Winnings Overview */}
        <div className="gsap-dash-card rounded-3xl bg-[#161920] border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-zinc-400">
              Draws & Winnings
            </span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5">
              <span className="text-[11px] text-zinc-400 block">Total Won</span>
              <span className="text-sm lg:text-2xl font-mono font-extrabold text-emerald-400">
                ${(totalWonCents / 100).toFixed(2)}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/30 border border-white/5">
              <span className="text-[11px] text-zinc-400 block">
                Draw Eligibility
              </span>
              <span className="text-sm lg:text-lg font-mono font-bold text-amber-400">
                {scores.length} / 5 Scores
              </span>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            {publishedDraws.length} published draw(s) completed • Next monthly
            draw at month end.
          </p>
        </div>
      </div>

      {/* MODULE 4: 5-SCORE ROLLING WINDOW MANAGEMENT */}
      <div className="grid lg:grid-cols-12 gap-8">
        <div className="gsap-dash-card lg:col-span-5 rounded-3xl bg-[#161920] border border-white/10 p-4 md:p-6 space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF5A36]">
              Stableford Format (1–45)
            </span>
            <h2 className="text-xl font-bold mt-1">Log a New Golf Score</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Only your latest 5 scores are retained. Entering a 6th score
              automatically replaces your oldest stored round. Duplicate dates
              are blocked.
            </p>
          </div>

          <form onSubmit={handleSubmit(onAddScore)} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">
                Stableford Score (1 to 45)
              </label>
              <input
                type="number"
                min={1}
                max={45}
                {...register("score", { valueAsNumber: true })}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm font-mono"
              />
              {errors.score && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.score.message}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">
                Round Date (1 Score Permitted Per Date)
              </label>
              <input
                type="date"
                {...register("played_date")}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm"
              />
              {errors.played_date && (
                <p className="text-red-400 text-xs mt-1">
                  {errors.played_date.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isSubActive || submittingScore}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                isSubActive
                  ? "bg-[#FF5A36] hover:bg-[#ff6d4d] text-white"
                  : "bg-white/5 text-zinc-500 cursor-not-allowed"
              }`}
            >
              {submittingScore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Rolling 5 Window...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>
                    {isSubActive
                      ? "Submit Score to Rolling 5"
                      : "Active Subscription Required"}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Active 5 Scores Deck */}
        <div className="gsap-dash-card lg:col-span-7 rounded-3xl bg-[#161920] border border-white/10 p-4 md:p-6 space-y-5 max-sm:mx-10">
          <div className="flex items-center justify-between leading-3">
            <div>
              <span className="text-[8px] md:text-xs font-bold uppercase tracking-wider text-amber-400">
                Reverse Chronological Order (Most Recent First)
              </span>
              <h2 className="text-sm md:text-xl font-bold mt-1">
                Your Active 5 Draw Numbers
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/10 text-[8px] md:text-xs font-mono text-center">
              {scores.length}/5 Retained
            </span>
          </div>

          {scores.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm border border-dashed border-white/10 rounded-2xl">
              No scores logged yet. Enter your last 5 rounds to qualify for
              monthly draws.
            </div>
          ) : (
            <div className="space-y-3">
              {scores.map((s, idx) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-black/35 border border-white/10 flex items-center justify-between gap-4 hover:border-white/25 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-[#FF5A36] to-amber-500 flex items-center justify-center font-mono font-extrabold text-xl text-white shadow">
                      {s.score}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[10px] md:text-sm">
                          Slot #{idx + 1} {idx === 0 && "(Most Recent)"}
                        </span>
                        {idx === 4 && (
                          <span className="text-[6px] text-center md:text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            Oldest (Replaced Next)
                          </span>
                        )}
                      </div>
                      <div className="text-[8px] md:text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="size-1.5 md:size-3.5 text-zinc-500" />
                        <span>
                          Played: {String(s.played_date).split("T")[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingScoreId === s.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={45}
                          value={editScoreValue}
                          onChange={(e) =>
                            setEditScoreValue(Number(e.target.value))
                          }
                          className="w-16 px-2 py-1 rounded bg-black border border-white/20 text-sm font-mono"
                        />
                        <button
                          onClick={() => handleUpdateScore(s.id)}
                          className="px-2.5 py-1 rounded bg-emerald-500 text-black text-xs font-bold cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingScoreId(s.id);
                          setEditScoreValue(s.score);
                        }}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 cursor-pointer"
                        title="Edit Score"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteScore(s.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 cursor-pointer"
                      title="Delete Score"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODULE 5: WINNER VERIFICATION & PAYOUT TRACKER */}
      <div className="gsap-dash-card rounded-3xl bg-[#161920] border border-white/10 p-6 space-y-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Section 09 • Winner Verification & Payout Status
          </span>
          <h2 className="text-xl font-bold mt-1">
            Your Winning Matches & Verification Uploads
          </h2>
        </div>

        {winnings.length === 0 ? (
          <p className="text-xs text-zinc-400">
            You have no winning draw tickets yet. Keep your 5 scores updated and
            watch for the next monthly draw!
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {winnings.map((win) => (
              <div
                key={win.id}
                className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                    {win.match_tier}-Number Match Winner!
                  </span>
                  <span className="text-lg font-mono font-extrabold text-emerald-400">
                    ${(win.prize_amount_cents / 100).toFixed(2)}
                  </span>
                </div>

                <div className="text-xs text-zinc-400 space-y-1">
                  <div>Draw: {win.draw_title || "Monthly Prize Draw"}</div>
                  <div>
                    Matched Numbers: {(win.matched_numbers || []).join(", ")}
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <span>
                      Verification:{" "}
                      <strong className="uppercase text-white">
                        {win.verification_status}
                      </strong>
                    </span>
                    <span>
                      Payout:{" "}
                      <strong className="uppercase text-emerald-400">
                        {win.payment_status}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  {win.proof_screenshot_url ? (
                    <a
                      href={win.proof_screenshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#FF5A36] underline"
                    >
                      View Uploaded Score Screenshot
                    </a>
                  ) : (
                    <span className="text-xs text-amber-300">
                      Upload golf platform screenshot to verify & unlock payout:
                    </span>
                  )}

                  <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-[#FF5A36]" />
                    <span>Upload Proof</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0])
                          handleProofUpload(win.id, e.target.files[0]);
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
