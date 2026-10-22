import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth, type SignupPayload } from "./hooks/useAuth";
import { useCharities } from "./hooks/useCharities";
import { usePageTitle } from "./hooks/usePageTitle";
import { API_URL, type Charity, type UserProfile } from "./types";

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import CharitiesPage from "./pages/CharitiesPage";
import SubscriberDashboard from "./components/SubscriberDashboard.tsx";
import AdminDashboard from "./components/AdminDashboard";
import AuthModal from "./components/AuthModal";
import CharityDetailModal from "./components/CharityDetailModal";
import StripeCheckoutModal, {
  type StripeModalConfig,
} from "./components/StripeCheckoutModal";

export { API_URL, type Charity, type UserProfile };

export default function App() {
  const navigate = useNavigate();
  const {
    user,
    token,
    authLoading,
    authError,
    setAuthError,
    login,
    signup,
    logout,
  } = useAuth();

  const {
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
  } = useCharities();

  usePageTitle(user);

  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [activeCharityModal, setActiveCharityModal] = useState<Charity | null>(
    null,
  );
  const [stripeModal, setStripeModal] = useState<StripeModalConfig | null>(
    null,
  );

  const handleLoginSubmit = async (email: string, pass: string) => {
    try {
      const loggedInUser = await login(email, pass);
      setAuthModal(null);
      navigate(loggedInUser.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      // Error is handled via authError state in useAuth
    }
  };

  const handleSignupSubmit = async (values: SignupPayload) => {
    try {
      await signup(values);
      setAuthModal(null);
      navigate("/dashboard");
    } catch {
      // Error is handled via authError state in useAuth
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#0D0F12] text-[#F5F3EF] font-sans selection:bg-[#FF5A36] selection:text-white">
      <Navbar
        user={user}
        charitiesCount={charities.length}
        apiState={apiState}
        authLoading={authLoading}
        onQuickLogin={handleLoginSubmit}
        onOpenAuthModal={(mode) => {
          setAuthError(null);
          setAuthModal(mode);
        }}
        onLogout={handleLogout}
      />

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              user={user}
              charities={charities}
              featuredCharities={featuredCharities}
              onOpenSignup={() => {
                setAuthError(null);
                setAuthModal("signup");
              }}
              onSelectCharity={setActiveCharityModal}
            />
          }
        />

        <Route
          path="/charities"
          element={
            <CharitiesPage
              charities={filteredCharities}
              categories={categories}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              onSelectCharity={setActiveCharityModal}
            />
          }
        />

        <Route
          path="/dashboard"
          element={
            user && token ? (
              <SubscriberDashboard
                user={user}
                token={token}
                charities={charities}
                onRefreshCharities={fetchCharities}
                onOpenStripeModal={setStripeModal}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin"
          element={
            user && token && user.role === "admin" ? (
              <AdminDashboard
                token={token}
                charities={charities}
                onRefreshCharities={fetchCharities}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {activeCharityModal && (
        <CharityDetailModal
          charity={activeCharityModal}
          user={user}
          onClose={() => setActiveCharityModal(null)}
          onRefreshCharities={fetchCharities}
          onOpenStripeModal={setStripeModal}
        />
      )}

      {authModal && (
        <AuthModal
          mode={authModal}
          charities={charities}
          authLoading={authLoading}
          authError={authError}
          onClose={() => setAuthModal(null)}
          onLogin={handleLoginSubmit}
          onSignup={handleSignupSubmit}
        />
      )}

      {stripeModal && <StripeCheckoutModal {...stripeModal} />}
    </div>
  );
}
