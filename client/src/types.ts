export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

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

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "subscriber" | "admin";
  selected_charity_id?: string;
  charity_percentage?: number;
}
