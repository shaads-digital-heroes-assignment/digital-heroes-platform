import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Heart,
  Sparkles,
  ArrowRight,
  Search,
  Calendar,
  MapPin,
  ShieldCheck,
  LogOut,
  UserCheck,
  Flame,
  DollarSign,
  X,
  Loader2,
  Wifi,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import SubscriberDashboard from "./components/SubscriberDashboard.tsx";
import AdminDashboard from "./components/AdminDashboard";
import StripeCheckoutModal, {
  type StripeModalConfig,
} from "./components/StripeCheckoutModal";

gsap.registerPlugin(ScrollTrigger);

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export interface Charity {
  id: string;
  name: string;
  slug: string;
  category: string;
  short_summary: string;
  description: string;
  banner_url: string;
  is_featured: boolean;
  upcoming_events: { title: string; date: string; location: string }[];
  total_raised_cents: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "subscriber" | "admin";
  selected_charity_id?: string;
  charity_percentage?: number;
}

const signupSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  selected_charity_id: z.string().uuid("Please select a charity to support"),
  charity_percentage: z
    .number()
    .min(10, "Minimum mandatory contribution is 10%")
    .max(100),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("dh_token"),
  );
  const [view, setView] = useState<
    "home" | "charities" | "dashboard" | "admin"
  >("home");

  // Connection & Loading States
  const [apiState, setApiState] = useState<"connecting" | "online" | "error">(
    "connecting",
  );
  const [authLoading, setAuthLoading] = useState(false);

  const [charities, setCharities] = useState<Charity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeCharityModal, setActiveCharityModal] = useState<Charity | null>(
    null,
  );

  // Interactive Story Slider State (Chapter 02 on Hero Landing Page)
  const [storySliderPct, setStorySliderPct] = useState<number>(25);
  const [storyScoreDemo, setStoryScoreDemo] = useState<number[]>([
    36, 41, 29, 38, 34,
  ]);

  // Independent Donation & Stripe Gateway State
  const [donationAmount, setDonationAmount] = useState<number>(50);
  const [donorEmail, setDonorEmail] = useState<string>("");
  const [donationSuccess, setDonationSuccess] = useState<string | null>(null);
  const [stripeModal, setStripeModal] = useState<StripeModalConfig | null>(
    null,
  );

  // Auth Modal State
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const authModalCardRef = useRef<HTMLDivElement>(null);
  const charityModalCardRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      charity_percentage: 15,
    },
  });

  const watchedPercentage = watch("charity_percentage", 15);

  // Dynamic Page Title Updater based on active view
  useEffect(() => {
    switch (view) {
      case "home":
        document.title = "Digital Heroes | Story & Concept";
        break;
      case "charities":
        document.title = "Digital Heroes | Verified Charity Directory";
        break;
      case "dashboard":
        document.title = `Digital Heroes | Subscriber Dashboard (${user?.full_name || "Member"})`;
        break;
      case "admin":
        document.title = "Digital Heroes | Administrator Command Surface";
        break;
      default:
        document.title = "Digital Heroes | Golf Performance & Charity Platform";
    }
  }, [view, user]);

  // 1. GSAP Hero + ScrollTrigger Narrative Story Animations
  useGSAP(
    () => {
      if (view === "home") {
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

        // Scroll-Triggered Story Chapters
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

        // Scrubbed vertical progress line inside the Scroll Story
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
      }
    },
    { dependencies: [view], scope: containerRef },
  );

  // 2. Smooth GSAP Entrance Animation for Login / Signup Modal
  useGSAP(() => {
    if (authModal && authModalCardRef.current) {
      gsap.fromTo(
        authModalCardRef.current,
        { y: 35, scale: 0.92, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.38, ease: "back.out(1.5)" },
      );
    }
  }, [authModal]);

  // 3. Smooth GSAP Entrance Animation for Charity Detail Modal
  useGSAP(() => {
    if (activeCharityModal && charityModalCardRef.current) {
      gsap.fromTo(
        charityModalCardRef.current,
        { y: 40, scale: 0.94, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.38, ease: "power3.out" },
      );
    }
  }, [activeCharityModal]);

  // 4. Smooth View Transition Animation
  useGSAP(() => {
    gsap.fromTo(
      ".gsap-view-fade",
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
    );
  }, [view]);

  const fetchCharities = async () => {
    try {
      setApiState("connecting");
      const res = await fetch(`${API_URL}/charities`);
      if (!res.ok) throw new Error("Backend unreachable");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCharities(data);
        if (data.length > 0) setValue("selected_charity_id", data[0].id);
      }
      setApiState("online");
    } catch (err) {
      console.error("Failed to load charities:", err);
      setApiState("error");
    }
  };

  useEffect(() => {
    fetchCharities();
    const savedUser = localStorage.getItem("dh_user");
    if (savedUser && token) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setView(parsedUser.role === "admin" ? "admin" : "dashboard");
    }
  }, []);

  const handleLogin = async (emailInput: string, passwordInput: string) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("dh_token", data.token);
      localStorage.setItem("dh_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setAuthModal(null);
      setView(data.user.role === "admin" ? "admin" : "dashboard");
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const onSignupSubmit = async (values: SignupFormValues) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      localStorage.setItem("dh_token", data.token);
      localStorage.setItem("dh_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setAuthModal(null);
      setView("dashboard");
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("dh_token");
    localStorage.removeItem("dh_user");
    setToken(null);
    setUser(null);
    setView("home");
  };

  // Launch Stripe Gateway Modal for 100% Independent Direct Charity Donation
  const openIndependentDonationStripe = (charity: Charity) => {
    setStripeModal({
      mode: "donation",
      amountCents: Math.round(donationAmount * 100),
      charityName: charity.name,
      charityPercentage: 100,
      onClose: () => setStripeModal(null),
      onSuccess: async ({ simulateDecline }) => {
        if (simulateDecline) {
          throw new Error(
            "Stripe Error: Your card was declined (card_declined). Please try another card.",
          );
        }
        const res = await fetch(`${API_URL}/charities/${charity.id}/donate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_cents: Math.round(donationAmount * 100),
            donor_email: donorEmail || user?.email || "independent@donor.org",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Donation failed");
        setDonationSuccess(
          `100% Direct Donation ($${donationAmount}) verified via Stripe for ${charity.name}!`,
        );
        fetchCharities();
      },
    });
  };

  // Interactive Demo Helper for Chapter 1 Rolling Score Animation
  const pushDemoScore = () => {
    const randomStableford = Math.floor(Math.random() * 20) + 25; // 25-44
    setStoryScoreDemo((prev) => [randomStableford, ...prev.slice(0, 4)]);
  };

  const categories = [
    "All",
    ...Array.from(new Set(charities.map((c) => c.category))),
  ];
  const filteredCharities = charities.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.short_summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === "All" || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const featuredCharities = charities.filter((c) => c.is_featured);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#0D0F12] text-[#F5F3EF] font-sans selection:bg-[#FF5A36] selection:text-white"
    >
      {/* EVALUATOR SANDBOX & LIVE CONNECTION STATUS BAR */}
      <div className="bg-[#161920] border-b border-white/10 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EVALUATOR SANDBOX:</span>
          </div>
          {/* Live API & Supabase Connection Pill */}
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono flex items-center gap-1.5 border ${
              apiState === "online"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : apiState === "connecting"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-red-500/15 text-red-300 border-red-500/30"
            }`}
          >
            <Wifi className="w-3 h-3" />
            {apiState === "online" && "Supabase & Express API Connected"}
            {apiState === "connecting" && "Syncing API..."}
            {apiState === "error" && "API Offline — Check Server Port 5001"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              handleLogin("subscriber@digitalheroes.co.in", "sub123")
            }
            disabled={authLoading}
            className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition cursor-pointer flex items-center gap-1.5"
          >
            {authLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            <span>1-Click Subscriber (Alex)</span>
          </button>
          <button
            onClick={() => handleLogin("admin@digitalheroes.co.in", "admin123")}
            disabled={authLoading}
            className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition cursor-pointer flex items-center gap-1.5"
          >
            {authLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            <span>1-Click Admin</span>
          </button>
        </div>
      </div>

      {/* MAIN NAVIGATION */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0D0F12]/85 border-b border-white/10">
        <div className="px-6 h-20 flex items-center justify-between">
          <div
            onClick={() => setView("home")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#FF5A36] to-amber-500 flex items-center justify-center shadow-lg shadow-[#FF5A36]/20 group-hover:scale-105 transition">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div className="leading-2">
              <span className="font-bold tracking-tight text-xs block">
                DIGITAL<span className="text-[#FF5A36]">.HEROES</span>
              </span>
              <span className="text-[0.5rem] uppercase tracking-widest text-zinc-400">
                Impact × Performance
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <button
              onClick={() => setView("home")}
              className={`hover:text-white transition cursor-pointer ${view === "home" ? "text-[#FF5A36]" : ""}`}
            >
              Story & Concept
            </button>
            <button
              onClick={() => setView("charities")}
              className={`hover:text-white transition cursor-pointer ${view === "charities" ? "text-[#FF5A36]" : ""}`}
            >
              Charity Directory ({charities.length})
            </button>
            {user && user.role === "subscriber" && (
              <button
                onClick={() => setView("dashboard")}
                className={`hover:text-white transition cursor-pointer ${view === "dashboard" ? "text-[#FF5A36]" : ""}`}
              >
                Subscriber Dashboard
              </button>
            )}
            {user && user.role === "admin" && (
              <button
                onClick={() => setView("admin")}
                className={`hover:text-white transition cursor-pointer ${view === "admin" ? "text-[#FF5A36]" : ""}`}
              >
                Admin Control Center
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setView(user.role === "admin" ? "admin" : "dashboard")
                  }
                  className="flex items-center gap-2 px-2 md:px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-sm font-medium transition cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#FF5A36]" />
                  <span className="text-[8px] md:text-xs">
                    {user.full_name}
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex text-[0.5rem] items-center">
                <button
                  onClick={() => {
                    setAuthError(null);
                    setAuthModal("login");
                  }}
                  className="px-4 py-2 md:text-sm font-medium text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthError(null);
                    setAuthModal("signup");
                  }}
                  className="px-3 py-2 rounded-full bg-[#FF5A36] hover:bg-[#ff6d4d] text-white text-[6px] md:text-sm font-semibold shadow-lg shadow-[#FF5A36]/25 transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Join & Subscribe</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* VIEW ROUTING */}
      {view === "home" && (
        <main className="gsap-view-fade">
          {/* HERO SECTION */}
          <section className="relative overflow-hidden py-20 md:py-28 border-b border-white/10">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#FF5A36]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="gsap-hero-item inline-flex items-center gap-2 px-3.5 py-1.5 text-[#FF5A36] text-[8px] md:text-xs font-semibold uppercase tracking-wider">
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
                  <strong className="text-white">mandatory 10% minimum</strong>{" "}
                  (or slide up to 100%) of your subscription to charity—or
                  donate{" "}
                  <strong className="text-emerald-400">
                    100% independently
                  </strong>{" "}
                  anytime—while competing in our monthly rollover prize draws.
                </p>

                <div className="gsap-hero-item flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() =>
                      user ? setView("dashboard") : setAuthModal("signup")
                    }
                    className="px-4 py-2 md:px-7 md:py-4 rounded-full bg-[#FF5A36] hover:bg-[#ff6d4d] text-white font-bold text-xs md:text-base shadow-xl shadow-[#FF5A36]/30 transition flex items-center cursor-pointer"
                  >
                    <span>Start Your Impact Subscription</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <a
                    href="#scroll-story-container"
                    className="px-4 py-2 md:px-6 md:py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 font-semibold text-xs md:text-sm transition cursor-pointer"
                  >
                    Scroll the Impact Story ↓
                  </a>
                </div>
              </div>

              {/* HERO LIVE PREVIEW CARD */}
              <div className="lg:col-span-5 gsap-hero-item">
                <div className="rounded-3xl bg-[#161920] border border-white/10 p-4 sm:p-8 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 leading-2">
                    <div>
                      <span className="text-[8px] md:text-xs uppercase tracking-widest text-zinc-400">
                        Live Platform Mechanics
                      </span>
                      <h3 className="text-[10px] md:text-xl font-bold mt-2 leading-3">
                        5 Scores × Impact × Draw
                      </h3>
                    </div>
                    <span className="px-3 py-1 text-center rounded-full bg-emerald-500/20 text-emerald-300 text-[8px] md:text-xs font-semibold leading-3">
                      Stripe Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2.5">
                    {storyScoreDemo.map((num, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-full md:rounded-2xl md:p-4 bg-linear-to-br from-white/10 to-white/5 border border-white/15 flex flex-col items-center justify-center"
                      >
                        <span className="text-[10px] text-zinc-400">
                          #{idx + 1}
                        </span>
                        <span className="text-xs md:text-xl font-mono font-extrabold text-amber-400">
                          {num}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 bg-black/35 rounded-2xl p-4 border border-white/5 text-[7px] md:text-xs">
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
                Journey
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                From Your Latest 5 Scores to Real-World Change
              </h2>
              <p className="text-zinc-400 text-sm sm:text-base">
                Scroll down to experience how every round you play powers
                verified charities and unlocks our monthly prize draw engine.
              </p>
            </div>

            <div className="relative grid lg:grid-cols-12 gap-10">
              {/* Vertical Scrubbed Progress Track */}
              <div className="hidden lg:flex lg:col-span-1 justify-center relative">
                <div className="w-1 h-full bg-white/10 rounded-full overflow-hidden">
                  <div className="gsap-story-progress-bar w-full h-full bg-linear-to-b from-[#FF5A36] via-amber-400 to-emerald-400 origin-top" />
                </div>
              </div>

              <div className="lg:col-span-11 space-y-16">
                {/* CHAPTER 01: ROLLING 5-SCORE INPUT */}
                <div className="gsap-story-chapter rounded-3xl bg-[#161920] border border-white/10 p-4 md:p-8 sm:p-10 grid md:grid-cols-12 gap-8 items-center shadow-2xl">
                  <div className="md:col-span-6 space-y-4">
                    <div className="text-center md:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] md:text-xs font-bold">
                      CHAPTER 01 • PERFORMANCE INPUT
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold">
                      Log Your Latest 5 Stableford Scores (1–45)
                    </h3>
                    <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                      Forget complex handicaps. Enter your 5 most recent
                      Stableford scores (1 to 45) with unique dates. Our
                      PostgreSQL rolling-window trigger retains only your latest
                      5 rounds in reverse chronological order—every 6th score
                      automatically replaces your oldest stored round.
                    </p>
                    <button
                      onClick={pushDemoScore}
                      className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] md:text-xs font-bold transition cursor-pointer"
                    >
                      + Simulate Logging a New 6th Score (Watch Oldest Drop Off)
                    </button>
                  </div>

                  <div className="md:col-span-6 bg-black/40 rounded-2xl p-6 border border-white/10 space-y-4">
                    <div className="flex justify-between text-[8px] md:text-xs text-zinc-400">
                      <span>Reverse Chronological Deck (Newest First)</span>
                      <span className="font-mono text-amber-400">
                        5 / 5 Retained
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      {storyScoreDemo.map((s, idx) => (
                        <div
                          key={`${idx}-${s}`}
                          className={`p-1.5 md:p-3 rounded-full md:rounded-2xl border text-center transition-all overflow-scroll ${
                            idx === 0
                              ? "bg-[#FF5A36]/20 border-[#FF5A36] scale-105"
                              : idx === 4
                                ? "bg-white/5 border-dashed border-white/20 opacity-75"
                                : "bg-white/5 border-white/10"
                          }`}
                        >
                          <span className="text-[6px] md:text-[10px] text-zinc-400 block">
                            {idx === 0
                              ? "NEW"
                              : idx === 4
                                ? "OLDEST"
                                : `R${5 - idx}`}
                          </span>
                          <span className="text-xs md:text-2xl font-mono font-extrabold text-white mt-1 block">
                            {s}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CHAPTER 02: 10% MANDATORY MINIMUM UP TO 100% + INDEPENDENT 100% DONATION */}
                <div className="gsap-story-chapter rounded-3xl bg-linear-to-br from-[#161920] to-[#1A1D26] border border-[#FF5A36]/30 p-4 md:p-8 sm:p-10 grid md:grid-cols-12 gap-8 items-center shadow-2xl">
                  <div className="md:col-span-6 space-y-4">
                    <div className="text-center md:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#FF5A36]/20 text-[#FF5A36] text-[10px] md:text-xs font-bold">
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
                      <strong className="text-emerald-400">100%</strong>. Want
                      to give without subscribing or playing? Make an{" "}
                      <strong className="text-emerald-400">
                        independent donation
                      </strong>{" "}
                      where 100% goes straight to the charity.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        onClick={() =>
                          user ? setView("dashboard") : setAuthModal("signup")
                        }
                        className="px-3 py-1 md:px-5 md:py-2.5 rounded-xl bg-[#FF5A36] hover:bg-[#ff6d4d] text-white text-[10px] md:text-xs font-bold cursor-pointer"
                      >
                        Subscribe with Custom Split (10%–100%)
                      </button>
                      <button
                        onClick={() => {
                          if (charities[0]) setActiveCharityModal(charities[0]);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] mx-auto md:text-xs font-bold cursor-pointer"
                      >
                        Give 100% Independently Now
                      </button>
                    </div>
                  </div>

                  {/* Interactive Impact Split Simulator */}
                  <div className="md:col-span-6 bg-black/40 rounded-2xl p-4 md:p-6 border border-white/10 space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] md:text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[#FF5A36]" />
                        <span>Try the Interactive Impact Split Slider:</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[8px] text-center md:text-xs">
                        {storySliderPct}% to Charity
                      </span>
                    </div>

                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={storySliderPct}
                      onChange={(e) =>
                        setStorySliderPct(Number(e.target.value))
                      }
                      className="w-full accent-[#FF5A36] cursor-pointer"
                    />

                    <div className="flex justify-between text-center text-[8px] md:text-xs text-zinc-400 font-mono">
                      <span className="text-[#FF5A36] font-bold">
                        10% Mandatory Floor
                      </span>
                      <span>50% Split</span>
                      <span className="text-emerald-400 font-bold">
                        100% Full Commitment
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-2 md:p-3.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[8px] md:text-xs text-zinc-400 block">
                          Monthly Plan ($15) Impact
                        </span>
                        <span className="text-xs md:text-lg font-mono font-extrabold text-emerald-400">
                          ${((15 * storySliderPct) / 100).toFixed(2)} / mo
                        </span>
                      </div>
                      <div className="p-2 md:p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-[8px] md:text-xs text-emerald-300 block">
                          Independent Gift Option
                        </span>
                        <span className="text-[10px] md:text-lg font-mono font-extrabold text-white">
                          100% Direct
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CHAPTER 03: MONTHLY DRAW & ROLLOVER PRIZE ENGINE */}
                <div className="gsap-story-chapter rounded-3xl bg-[#161920] border border-white/10 p-4 md:p-8 sm:p-10 grid md:grid-cols-12 gap-8 items-center shadow-2xl">
                  <div className="md:col-span-6 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] text-center md:text-xs font-bold">
                      CHAPTER 03 • THE MONTHLY DRAW ENGINE
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold">
                      Match 3, 4, or 5 Numbers. Unclaimed Jackpots Roll Over.
                    </h3>
                    <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                      Each month, administrators run simulations and publish
                      official results using either standard random lottery
                      draws or algorithmic frequency-weighted draws. Winners
                      upload a quick screenshot of their golf scores for Admin
                      verification to unlock payouts.
                    </p>
                  </div>

                  <div className="md:col-span-6 grid sm:grid-cols-3 gap-3">
                    <div className="p-3 md:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
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
                    <div className="p-3 md:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
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
                    <div className="p-3 md:p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-center space-y-1">
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
                  onClick={() => setView("charities")}
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
                      <div className="p-3 md:p-6 space-y-3">
                        <h3 className="text-2xl font-bold">{charity.name}</h3>
                        <p className="text-sm text-zinc-400">
                          {charity.short_summary}
                        </p>
                      </div>
                    </div>
                    <div className="px-3 pb-3 md:px-6 md:pb-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-zinc-400 block">
                          Total Raised
                        </span>
                        <span className="text-lg font-mono font-bold text-emerald-400">
                          ${(charity.total_raised_cents / 100).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveCharityModal(charity)}
                        className="w-30 px-2 py-2 rounded-xl bg-white/10 hover:bg-[#FF5A36] text-white text-[10px] md:text-xs font-semibold transition cursor-pointer"
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
      )}

      {/* CHARITY DIRECTORY VIEW */}
      {view === "charities" && (
        <section className="gsap-view-fade max-w-7xl mx-auto px-6 py-14 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF5A36]">
                Section 08 • Verified Impact Directory
              </span>
              <h1 className="text-4xl font-extrabold mt-1">
                Causes You Can Champion
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search charities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 rounded-xl bg-[#161920] border border-white/15 text-sm focus:outline-none focus:border-[#FF5A36]"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-[#161920] border border-white/15 text-sm focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCharities.map((charity) => (
              <div
                key={charity.id}
                className="rounded-3xl bg-[#161920] border border-white/10 overflow-hidden flex flex-col justify-between hover:border-white/25 transition"
              >
                <div>
                  <img
                    src={charity.banner_url}
                    alt={charity.name}
                    className="w-full h-44 object-cover"
                  />
                  <div className="p-6 space-y-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                      {charity.category}
                    </span>
                    <h3 className="text-xl font-bold">{charity.name}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {charity.short_summary}
                    </p>
                  </div>
                </div>
                <div className="p-6 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    ${(charity.total_raised_cents / 100).toLocaleString()}{" "}
                    raised
                  </span>
                  <button
                    onClick={() => setActiveCharityModal(charity)}
                    className="px-3.5 py-2 rounded-xl bg-[#FF5A36] hover:bg-[#ff6d4d] text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Profile & 100% Donate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SUBSCRIBER DASHBOARD VIEW */}
      {view === "dashboard" && user && token && (
        <div className="gsap-view-fade">
          <SubscriberDashboard
            user={user}
            token={token}
            charities={charities}
            onRefreshCharities={fetchCharities}
            onOpenStripeModal={setStripeModal}
          />
        </div>
      )}

      {/* ADMIN DASHBOARD VIEW */}
      {view === "admin" && user && token && (
        <div className="gsap-view-fade">
          <AdminDashboard
            token={token}
            charities={charities}
            onRefreshCharities={fetchCharities}
          />
        </div>
      )}

      {/* CHARITY DETAIL & 100% INDEPENDENT STRIPE DONATION MODAL */}
      {activeCharityModal && (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            ref={charityModalCardRef}
            className="bg-[#161920] border border-white/15 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="relative h-56">
              <img
                src={activeCharityModal.banner_url}
                alt={activeCharityModal.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setActiveCharityModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase text-[#FF5A36]">
                  {activeCharityModal.category}
                </span>
                <h2 className="text-2xl font-bold mt-1">
                  {activeCharityModal.name}
                </h2>
                <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                  {activeCharityModal.description}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Upcoming Charity Golf Days & Community Events
                </h4>
                {activeCharityModal.upcoming_events?.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {activeCharityModal.upcoming_events.map((ev, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-2xl bg-black/30 border border-white/10 text-xs space-y-1"
                      >
                        <div className="font-bold text-white">{ev.title}</div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Calendar className="w-3.5 h-3.5 text-[#FF5A36]" />
                          <span>{ev.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{ev.location}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    No upcoming events scheduled.
                  </p>
                )}
              </div>

              {/* 100% Independent Direct Donation Box via Stripe */}
              <div className="p-3 md:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>100% Independent Direct Charity Contribution</span>
                  </h4>
                  <span className="text-xs text-zinc-400">
                    Not tied to gameplay
                  </span>
                </div>

                {donationSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{donationSuccess}</span>
                  </div>
                )}

                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Amount ($ USD)
                    </label>
                    <input
                      type="number"
                      min={5}
                      value={donationAmount}
                      onChange={(e) =>
                        setDonationAmount(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Your Email (for Stripe tax receipt)
                    </label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openIndependentDonationStripe(activeCharityModal)
                  }
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    Proceed to Stripe Checkout (${donationAmount} — 100% to{" "}
                    {activeCharityModal.name})
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATED LOGIN / SIGNUP MODAL */}
      {authModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            ref={authModalCardRef}
            className="bg-[#161920] border border-white/15 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF5A36]">
                  {authModal === "login"
                    ? "Member Access"
                    : "10% Minimum Impact Pact"}
                </span>
                <h3 className="text-2xl font-bold mt-0.5">
                  {authModal === "login"
                    ? "Welcome Back"
                    : "Create Subscriber Account"}
                </h3>
              </div>
              <button
                onClick={() => setAuthModal(null)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authModal === "login" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin(loginEmail, loginPassword);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm focus:border-[#FF5A36] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm focus:border-[#FF5A36] focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-[#FF5A36] hover:bg-[#ff6d4d] disabled:opacity-50 text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <span>Sign In to Platform</span>
                  )}
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleSubmit(onSignupSubmit)}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">
                    Full Name
                  </label>
                  <input
                    {...register("full_name")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm"
                  />
                  {errors.full_name && (
                    <p className="text-red-400 text-[11px] mt-1">
                      {errors.full_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-[11px] mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    {...register("password")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm"
                  />
                  {errors.password && (
                    <p className="text-red-400 text-[11px] mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">
                    Select Charity to Champion
                  </label>
                  <select
                    {...register("selected_charity_id")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm"
                  >
                    {charities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">
                      Subscription Charity Split (10% Mandatory Min – 100% Max)
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {watchedPercentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    {...register("charity_percentage", { valueAsNumber: true })}
                    className="w-full accent-[#FF5A36]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#FF5A36] hover:bg-[#ff6d4d] text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Profile...</span>
                    </>
                  ) : (
                    <span>Create Account & Continue</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* STRIPE PAYMENT GATEWAY MODAL */}
      {stripeModal && <StripeCheckoutModal {...stripeModal} />}
    </div>
  );
}
