import { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  X,
  Calendar,
  MapPin,
  DollarSign,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { API_URL, type Charity, type UserProfile } from "../types";
import type { StripeModalConfig } from "./StripeCheckoutModal";

interface Props {
  charity: Charity;
  user: UserProfile | null;
  onClose: () => void;
  onRefreshCharities: () => void;
  onOpenStripeModal: (config: StripeModalConfig | null) => void;
}

export default function CharityDetailModal({
  charity,
  user,
  onClose,
  onRefreshCharities,
  onOpenStripeModal,
}: Props) {
  const [donationAmount, setDonationAmount] = useState<number>(50);
  const [donorEmail, setDonorEmail] = useState<string>(user?.email || "");
  const [donationSuccess, setDonationSuccess] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 40, scale: 0.94, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.38, ease: "power3.out" },
      );
    }
  }, [charity.id]);

  const handleOpenStripeDonation = () => {
    onOpenStripeModal({
      mode: "donation",
      amountCents: Math.round(donationAmount * 100),
      charityName: charity.name,
      charityPercentage: 100,
      onClose: () => onOpenStripeModal(null),
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
            user_id: user?.id || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Donation failed");
        setDonationSuccess(
          `100% Direct Donation ($${donationAmount}) verified via Stripe for ${charity.name}!`,
        );
        onRefreshCharities();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        ref={cardRef}
        className="bg-[#161920] border border-white/15 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="relative h-56">
          <img
            src={charity.banner_url}
            alt={charity.name}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase text-[#FF5A36]">
              {charity.category}
            </span>
            <h2 className="text-2xl font-bold mt-1">{charity.name}</h2>
            <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
              {charity.description}
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Upcoming Charity Golf Days & Community Events
            </h4>
            {charity.upcoming_events?.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {charity.upcoming_events.map((ev, i) => (
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
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
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
                  onChange={(e) => setDonationAmount(Number(e.target.value))}
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
              onClick={handleOpenStripeDonation}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                Proceed to Stripe Checkout (${donationAmount} — 100% to{" "}
                {charity.name})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
