import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { UserProfile } from "../types";

export function usePageTitle(user: UserProfile | null) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/") {
      document.title = "Digital Heroes | Story & Concept";
    } else if (pathname.startsWith("/charities")) {
      document.title = "Digital Heroes | Verified Charity Directory";
    } else if (pathname.startsWith("/dashboard")) {
      document.title = `Digital Heroes | Subscriber Dashboard (${user?.full_name || "Member"})`;
    } else if (pathname.startsWith("/admin")) {
      document.title = "Digital Heroes | Administrator Command Surface";
    } else {
      document.title = "Digital Heroes | Golf Performance & Charity Platform";
    }
  }, [pathname, user]);
}
