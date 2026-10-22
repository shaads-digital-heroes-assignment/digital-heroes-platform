import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Heart, ArrowRight, Sliders } from "lucide-react";
import type { Charity, UserProfile } from "../types";

gsap.registerPlugin(ScrollTrigger);

interface Props {
  user: UserProfile | null;
  charities: Charity[];
  featuredCharities: Charity[];
  onOpenSignup: () => void;
  onSelectCharity: (charity: Charity) => void;
}

export default function HomePage({
  user,
  charities,
  featuredCharities,
  onOpenSignup,
  onSelectCharity,
}: Props) {
  const navigate = useNavigate();
  const homeRef = useRef<HTMLElement>(null);

  const [storySliderPct, setStorySliderPct] = useState<number>(25);
  const [storyScoreDemo, setStoryScoreDemo] = useState<number[]>([
    36, 41, 29, 38, 34,
  ]);

  useGSAP(
    () => {
      gsap.fromTo(
        ".gsap-hero-item",
        { y: 35, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.75,
          stagger: 0.12,
          ease: "power3.out",
        },
      );

      const chapters = gsap.utils.toArray<HTMLElement>(".gsap-story-chapter");
      chapters.forEach((chapter) => {
        gsap.fromTo(
          chapter,
          { y: 60, opacity: 0, scale: 0.96 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: chapter,
              start: "top 82%",
              end: "bottom 20%",
              toggleActions: "play none none reverse",
            },
          },
        );
      });

      gsap.fromTo(
        ".gsap-story-progress-bar",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "#scroll-story-container",
            start: "top 65%",
            end: "bottom 75%",
            scrub: 0.5,
          },
        },
      );
    },
    { scope: homeRef },
  );

  const pushDemoScore = () => {
    const randomStableford = Math.floor(Math.random() * 20) + 25;
    setStoryScoreDemo((prev) => [randomStableford, ...prev.slice(0, 4)]);
  };

  const handlePrimaryCTA = () => {
    if (user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } else {
      onOpenSignup();
    }
  };

  return (
    <main ref={homeRef}>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-20 md:py-28 border-b border-white/10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#FF5A36]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="gsap-hero-item inline-flex items-center gap-2 px-3.5 py-1.5 text-[#FF5A36] text-[10px] md:text-xs font-semibold uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 fill-current animate-bounce" />
              <span>Feel, Not Fairway • Purpose-Driven Performance</span>
            </div>

            <h1 className="gsap-hero-item text-3xl md:text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.06]">
              Every Golf Score You Log{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#FF5A36] via-amber-400 to-emerald-400">
                Champions a Cause.
              </span>
            </h1>

            <p className="gsap-hero-item text-xs md:text-lg text-zinc-400 max-w-2xl leading-relaxed">
              Enter your latest 5 Stableford rounds (1–45). Commit a{" "}
              <strong className="text-white">mandatory 10% minimum</strong> (or
              slide up to 100%) of your subscription to charity—or donate{" "}
              <strong className="text-emerald-400">100% independently</strong>{" "}
              anytime—while competing in our monthly rollover prize draws.
            </p>

            <div className="gsap-hero-item flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={handlePrimaryCTA}
                className="px-5 py-3 md:px-7 md:py-4 rounded-full bg-[#FF5A36] hover:bg-[#ff6d4d] text-white font-bold text-xs md:text-base shadow-xl shadow-[#FF5A36]/30 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Start Your Impact Subscription</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#scroll-story-container"
                className="px-5 py-3 md:px-6 md:py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 font-semibold text-xs md:text-sm transition cursor-pointer"
              >
                Scroll the Impact Story ↓
              </a>
            </div>
          </div>

          {/* HERO LIVE PREVIEW CARD */}
          <div className="lg:col-span-5 gsap-hero-item">
            <div className="rounded-3xl bg-[#161920] border border-white/10 p-5 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] md:text-xs uppercase tracking-widest text-zinc-400">
                    Live Platform Mechanics
                  </span>
                  <h3 className="text-sm md:text-xl font-bold mt-1">
                    5 Scores × Impact × Draw
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] md:text-xs font-semibold">
                  Stripe Verified
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2.5">
                {storyScoreDemo.map((num, idx) => (
                  <div
                    key={idx}
                    className="aspect-square rounded-2xl bg-linear-to-br from-white/10 to-white/5 border border-white/15 flex flex-col items-center justify-center"
                  >
                    <span className="text-[10px] text-zinc-400">
                      #{idx + 1}
                    </span>
                    <span className="text-sm md:text-xl font-mono font-extrabold text-amber-400">
                      {num}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 bg-black/35 rounded-2xl p-4 border border-white/5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">
                    Mandatory Subscription Charity Floor
                  </span>
                  <span className="font-mono font-bold text-[#FF5A36]">
                    10% Minimum
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">
                    Voluntary Subscriber Slider OR Direct Gift
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    Up to 100%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">
                    Monthly Prize Tiers (5 / 4 / 3 Match)
                  </span>
                  <span className="font-mono font-bold text-amber-400">
                    40% / 35% / 25%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SCROLL-TRIGGERED INTERACTIVE STORYTELLING SECTION */}
      <section
        id="scroll-story-container"
        className="py-24 max-w-7xl mx-auto px-6 relative"
      >
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#FF5A36]">
            Interactive Journey
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            From Your Latest 5 Scores to Real-World Change
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base">
            Scroll down to experience how every round you play powers verified
            charities and unlocks our monthly prize draw engine.
          </p>
        </div>

        <div className="relative grid lg:grid-cols-12 gap-10">
          <div className="hidden lg:flex lg:col-span-1 justify-center relative">
            <div className="w-1 h-full bg-white/10 rounded-full overflow-hidden">
              <div className="gsap-story-progress-bar w-full h-full bg-linear-to-b from-[#FF5A36] via-amber-400 to-emerald-400 origin-top" />
            </div>
          </div>

          <div className="lg:col-span-11 space-y-16">
            {/* CHAPTER 01 */}
            <div className="gsap-story-chapter rounded-3xl bg-[#161920] border border-white/10 p-6 sm:p-10 grid md:grid-cols-12 gap-8 items-center shadow-2xl">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                  CHAPTER 01 • PERFORMANCE INPUT
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold">
                  Log Your Latest 5 Stableford Scores (1–45)
                </h3>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                  Forget complex handicaps. Enter your 5 most recent Stableford
                  scores (1 to 45) with unique dates. Our PostgreSQL
                  rolling-window trigger retains only your latest 5 rounds in
                  reverse chronological order—every 6th score automatically
                  replaces your oldest stored round.
                </p>
                <button
                  onClick={pushDemoScore}
                  className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition cursor-pointer"
                >
                  + Simulate Logging a New 6th Score (Watch Oldest Drop Off)
                </button>
              </div>

              <div className="md:col-span-6 bg-black/40 rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Reverse Chronological Deck (Newest First)</span>
                  <span className="font-mono text-amber-400">
                    5 / 5 Retained
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {storyScoreDemo.map((s, idx) => (
                    <div
                      key={`${idx}-${s}`}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        idx === 0
                          ? "bg-[#FF5A36]/20 border-[#FF5A36] scale-105"
                          : idx === 4
                            ? "bg-white/5 border-dashed border-white/20 opacity-75"
                            : "bg-white/5 border-white/10"
                      }`}
                    >
                      <span className="text-[10px] text-zinc-400 block">
                        {idx === 0
                          ? "NEW"
                          : idx === 4
                            ? "OLDEST"
                            : `R${5 - idx}`}
                      </span>
                      <span className="text-lg md:text-2xl font-mono font-extrabold text-white mt-1 block">
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CHAPTER 02 */}
            <div className="gsap-story-chapter rounded-3xl bg-linear-to-br from-[#161920] to-[#1A1D26] border border-[#FF5A36]/30 p-6 sm:p-10 grid md:grid-cols-12 gap-8 items-center shadow-2xl">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF5A36]/20 text-[#FF5A36] text-xs font-bold">
                  CHAPTER 02 • THE CHARITY COMMITMENT PACT
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold">
                  10% Mandatory Minimum. Slide Up to 100%—Or Give 100%
                  Independently.
                </h3>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                  Charitable impact leads our story. Every subscriber must
                  direct a{" "}
                  <strong className="text-white">minimum of 10%</strong> of
                  their subscription fee to a cause they choose—and can
                  voluntarily slide their contribution all the way to{" "}
                  <strong className="text-emerald-400">100%</strong>.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    onClick={handlePrimaryCTA}
                    className="px-5 py-2.5 rounded-xl bg-[#FF5A36] hover:bg-[#ff6d4d] text-white text-xs font-bold cursor-pointer"
                  >
                    Subscribe with Custom Split (10%–100%)
                  </button>
                  <button
                    onClick={() => {
                      if (charities[0]) onSelectCharity(charities[0]);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold cursor-pointer"
                  >
                    Give 100% Independently Now
                  </button>
                </div>
              </div>

              <div className="md:col-span-6 bg-black/40 rounded-2xl p-6 border border-white/10 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#FF5A36]" />
                    <span>Interactive Impact Split Slider:</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs">
                    {storySliderPct}% to Charity
                  </span>
                </div>

                <input
                  type="range"
                  min={10}
                  max={100}
                  value={storySliderPct}
                  onChange={(e) => setStorySliderPct(Number(e.target.value))}
                  className="w-full accent-[#FF5A36] cursor-pointer"
                />

                <div className="flex justify-between text-xs text-zinc-400 font-mono">
                  <span className="text-[#FF5A36] font-bold">
                    10% Mandatory Floor
                  </span>
                  <span>50% Split</span>
                  <span className="text-emerald-400 font-bold">
                    100% Full Commitment
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-zinc-400 block">
                      Monthly Plan ($15) Impact
                    </span>
                    <span className="text-lg font-mono font-extrabold text-emerald-400">
                      ${((15 * storySliderPct) / 100).toFixed(2)} / mo
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-xs text-emerald-300 block">
                      Independent Gift Option
                    </span>
                    <span className="text-lg font-mono font-extrabold text-white">
                      100% Direct
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CHAPTER 03 */}
            <div className="gsap-story-chapter rounded-3xl bg-[#161920] border border-white/10 p-6 sm:p-10 grid md:grid-cols-12 gap-8 items-center shadow-2xl">
              <div className="md:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                  CHAPTER 03 • THE MONTHLY DRAW ENGINE
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold">
                  Match 3, 4, or 5 Numbers. Unclaimed Jackpots Roll Over.
                </h3>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                  Each month, administrators run simulations and publish
                  official results using either standard random lottery draws or
                  algorithmic frequency-weighted draws. Winners upload a quick
                  screenshot of their golf scores for Admin verification to
                  unlock payouts.
                </p>
              </div>

              <div className="md:col-span-6 grid sm:grid-cols-3 gap-3">
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                  <span className="text-xs text-emerald-300 font-bold">
                    5-Number Match
                  </span>
                  <div className="text-3xl font-mono font-extrabold text-white">
                    40%
                  </div>
                  <span className="text-[11px] text-emerald-400 block">
                    Jackpot + Rollover
                  </span>
                </div>
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
                  <span className="text-xs text-amber-300 font-bold">
                    4-Number Match
                  </span>
                  <div className="text-3xl font-mono font-extrabold text-white">
                    35%
                  </div>
                  <span className="text-[11px] text-zinc-400 block">
                    Equal Tier Split
                  </span>
                </div>
                <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-center space-y-1">
                  <span className="text-xs text-sky-300 font-bold">
                    3-Number Match
                  </span>
                  <div className="text-3xl font-mono font-extrabold text-white">
                    25%
                  </div>
                  <span className="text-[11px] text-zinc-400 block">
                    Equal Tier Split
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOMEPAGE CHARITY SPOTLIGHT */}
      <section className="py-20 bg-[#12151B] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Homepage Spotlight
              </span>
              <h2 className="text-3xl font-bold mt-1">
                Featured Impact Partners
              </h2>
            </div>
            <button
              onClick={() => navigate("/charities")}
              className="text-sm font-semibold text-[#FF5A36] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <span>View Full Charity Directory</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {featuredCharities.map((charity) => (
              <div
                key={charity.id}
                className="rounded-3xl overflow-hidden bg-[#161920] border border-white/10 flex flex-col justify-between group"
              >
                <div>
                  <div className="h-56 overflow-hidden relative">
                    <img
                      src={charity.banner_url}
                      alt={charity.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-semibold text-emerald-300">
                      {charity.category}
                    </span>
                  </div>
                  <div className="p-6 space-y-3">
                    <h3 className="text-2xl font-bold">{charity.name}</h3>
                    <p className="text-sm text-zinc-400">
                      {charity.short_summary}
                    </p>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-zinc-400 block">
                      Total Raised
                    </span>
                    <span className="text-lg font-mono font-bold text-emerald-400">
                      ${(charity.total_raised_cents / 100).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectCharity(charity)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-[#FF5A36] text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Events & 100% Direct Donate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
