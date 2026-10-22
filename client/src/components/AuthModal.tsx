import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, AlertCircle, Loader2 } from "lucide-react";
import type { Charity } from "../types";
import type { SignupPayload } from "../hooks/useAuth";

const signupSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  selected_charity_id: z.uuid("Please select a charity to support"),
  charity_percentage: z
    .number()
    .min(10, "Minimum mandatory contribution is 10%")
    .max(100),
});

interface Props {
  mode: "login" | "signup";
  charities: Charity[];
  authLoading: boolean;
  authError: string | null;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignup: (values: SignupPayload) => Promise<void>;
}

export default function AuthModal({
  mode,
  charities,
  authLoading,
  authError,
  onClose,
  onLogin,
  onSignup,
}: Props) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupPayload>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      charity_percentage: 15,
      selected_charity_id: charities[0]?.id || "",
    },
  });

  useEffect(() => {
    if (charities.length > 0) {
      setValue("selected_charity_id", charities[0].id);
    }
  }, [charities, setValue]);

  const watchedPercentage = watch("charity_percentage", 15);

  useGSAP(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 35, scale: 0.92, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.38, ease: "back.out(1.5)" },
      );
    }
  }, [mode]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        ref={cardRef}
        className="bg-[#161920] border border-white/15 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF5A36]">
              {mode === "login" ? "Member Access" : "10% Minimum Impact Pact"}
            </span>
            <h3 className="text-2xl font-bold mt-0.5">
              {mode === "login" ? "Welcome Back" : "Create Subscriber Account"}
            </h3>
          </div>
          <button
            onClick={onClose}
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

        {mode === "login" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onLogin(loginEmail, loginPassword);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Email</label>
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
          <form onSubmit={handleSubmit(onSignup)} className="space-y-4">
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
              <label className="text-xs text-zinc-400 block mb-1">Email</label>
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
              disabled={isSubmitting || authLoading}
              className="w-full py-3 rounded-xl bg-[#FF5A36] hover:bg-[#ff6d4d] text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting || authLoading ? (
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
  );
}
