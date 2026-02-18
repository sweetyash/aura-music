import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SpotifyProvider } from "@/contexts/SpotifyContext";
import BottomNav from "@/components/BottomNav";
import MiniPlayer from "@/components/MiniPlayer";
import Discover from "@/pages/Discover";
import Trending from "@/pages/Trending";
import NewReleases from "@/pages/NewReleases";
import LikedSongs from "@/pages/LikedSongs";
import Playlists from "@/pages/Playlists";
import Profile from "@/pages/Profile";
import Install from "@/pages/Install";
import NotFound from "./pages/NotFound";
import React from "react";

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any) { console.error("[AppError]", err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 bg-background text-foreground">
          <p className="text-lg font-bold">Something went wrong</p>
          <p className="text-sm text-muted-foreground text-center">Please refresh the page to continue.</p>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
          >
            Refresh App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SpotifyProvider>
            <div className="max-w-lg mx-auto min-h-screen relative">
              <Routes>
                <Route path="/" element={<Discover />} />
                <Route path="/trending" element={<Trending />} />
                <Route path="/new-releases" element={<NewReleases />} />
                <Route path="/liked" element={<LikedSongs />} />
                <Route path="/playlists" element={<Playlists />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/install" element={<Install />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <MiniPlayer />
              <BottomNav />
            </div>
          </SpotifyProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
