import { useState, useEffect, useCallback, useMemo } from "react";
import { API_URL, type Charity } from "../types";

export function useCharities() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [apiState, setApiState] = useState<"connecting" | "online" | "error">(
    "connecting",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const fetchCharities = useCallback(async () => {
    try {
      setApiState("connecting");
      const res = await fetch(`${API_URL}/charities`);
      if (!res.ok) throw new Error("Backend unreachable");
      const data = await res.json();
      if (Array.isArray(data)) {
        setCharities(data);
      }
      setApiState("online");
    } catch (err) {
      console.error("Failed to load charities:", err);
      setApiState("error");
    }
  }, []);

  useEffect(() => {
    fetchCharities();
  }, [fetchCharities]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(charities.map((c) => c.category)))],
    [charities],
  );

  const filteredCharities = useMemo(
    () =>
      charities.filter((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.short_summary.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCat =
          selectedCategory === "All" || c.category === selectedCategory;
        return matchesSearch && matchesCat;
      }),
    [charities, searchQuery, selectedCategory],
  );

  const featuredCharities = useMemo(
    () => charities.filter((c) => c.is_featured),
    [charities],
  );

  return {
    charities,
    featuredCharities,
    filteredCharities,
    categories,
    apiState,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    fetchCharities,
  };
}
