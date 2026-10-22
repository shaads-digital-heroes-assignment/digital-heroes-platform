import { Search } from "lucide-react";
import type { Charity } from "../types";

interface Props {
  charities: Charity[];
  categories: string[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (c: string) => void;
  onSelectCharity: (charity: Charity) => void;
}

export default function CharitiesPage({
  charities,
  categories,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onSelectCharity,
}: Props) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-14 space-y-10">
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2.5 rounded-xl bg-[#161920] border border-white/15 text-sm focus:outline-none focus:border-[#FF5A36]"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
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
        {charities.map((charity) => (
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
                ${(charity.total_raised_cents / 100).toLocaleString()} raised
              </span>
              <button
                onClick={() => onSelectCharity(charity)}
                className="px-3.5 py-2 rounded-xl bg-[#FF5A36] hover:bg-[#ff6d4d] text-white text-xs font-semibold transition cursor-pointer"
              >
                Profile & 100% Donate
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
