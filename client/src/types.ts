export interface CharityEvent {
  title: string;
  date: string;
  location: string;
}

export interface Charity {
  id: string;
  name: string;
  slug: string;
  category: string;
  short_summary: string;
  description: string;
  banner_url: string;
  is_featured: boolean;
  upcoming_events: CharityEvent[];
  total_raised_cents: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "subscriber" | "admin";
  selected_charity_id?: string;
  charity_percentage?: number;
  charity_name?: string;
  charity_category?: string;
}

export interface Subscription {
  id: string;
  plan_type: "monthly" | "yearly";
  status: "active" | "cancelled" | "lapsed" | "inactive";
  amount_cents: number;
  renewal_date: string;
}

export interface GolfScore {
  id: string;
  score: number;
  played_date: string;
  created_at: string;
}

export interface Draw {
  id: string;
  draw_title: string;
  draw_type: "random" | "algorithmic";
  status: "simulated" | "published";
  winning_numbers: number[];
  active_subscribers_count: number;
  base_pool_cents: number;
  rollover_added_cents: number;
  total_pool_cents: number;
  tier_5_pool_cents: number;
  tier_4_pool_cents: number;
  tier_3_pool_cents: number;
  jackpot_claimed: boolean;
  rollover_out_cents: number;
  published_at?: string;
}
