import { useState, useEffect } from "react";
import { Settings, LogOut, Music, Loader2, Sparkles, Play, User as UserIcon, Crown, ExternalLink, Users, MapPin, Download } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyArtist, SpotifyTrack, getArtistImage, getTrackCover } from "@/hooks/useSpotifyApi";
import { toast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";

interface AiRec {
  name: string;
  artist: string;
  reason: string;
}

const Profile = () => {
  const { isConnected, connect, disconnect } = useSpotify();
  const { getCurrentUser, getTopArtists, getTopTracks, getRecentlyPlayed, getAiRecommendations, search } = useSpotifyApi();
  const { playTrack } = useSpotify();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [topArtists, setTopArtists] = useState<SpotifyArtist[]>([]);
  const [aiRecs, setAiRecs] = useState<AiRec[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    Promise.all([
      getCurrentUser().catch(() => null),
      getTopArtists("medium_term", 6).catch(() => ({ items: [] })),
    ]).then(([userData, artistData]) => {
      setUser(userData);
      setTopArtists(artistData?.items || []);
    }).finally(() => setLoading(false));
  }, [isConnected, getCurrentUser, getTopArtists]);

  const handleLogout = () => {
    disconnect();
    setUser(null);
    setTopArtists([]);
    setAiRecs([]);
    navigate("/");
  };

  const fetchAiRecs = async () => {
    setAiLoading(true);
    try {
      const [topTracksData, topArtistsData, recentData] = await Promise.all([
        getTopTracks("medium_term", 10).catch(() => ({ items: [] })),
        getTopArtists("medium_term", 10).catch(() => ({ items: [] })),
        getRecentlyPlayed(10).catch(() => ({ items: [] })),
      ]);
      const data = await getAiRecommendations(
        topTracksData.items || [],
        topArtistsData.items || [],
        (recentData.items || []).map((i: any) => i.track)
      );
      setAiRecs(data.recommendations || []);
    } catch (err) {
      console.error("AI recommendations error:", err);
      toast({ title: "AI Error", description: "Could not get recommendations. Try again later.", variant: "destructive" });
    }
    setAiLoading(false);
  };

  const playAiRec = async (rec: AiRec) => {
    try {
      const data = await search(`${rec.name} ${rec.artist}`, "track", 1);
      const track = data.tracks?.items?.[0];
      if (track) {
        playTrack(track.uri, track.name, track.artists[0]?.name || rec.artist, getTrackCover(track), track.preview_url, track.duration_ms);
      } else {
        toast({ title: "Not Found", description: `"${rec.name}" not found on Spotify.`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not play track.", variant: "destructive" });
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="px-4 pt-6 pb-36 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-6">
          <UserIcon size={40} className="text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Welcome to Aura</h1>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-[280px]">
          Connect your Spotify account to see your profile, stats, and get personalized recommendations.
        </p>
        <button
          onClick={connect}
          className="flex items-center justify-center gap-2 py-3 px-8 rounded-xl font-semibold text-sm gradient-primary text-primary-foreground shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <Music size={18} />
          Login with Spotify
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-36 flex items-center justify-center min-h-[70vh]">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  const joinedDate = user?.birthdate || null;
  const followerCount = user?.followers?.total || 0;

  return (
    <div className="px-4 pt-6 pb-36">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 px-3 py-1.5 rounded-full hover:bg-destructive/20 transition-colors"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-card rounded-2xl p-5 mb-6 border border-border/50">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary ring-offset-2 ring-offset-background flex-shrink-0 bg-secondary flex items-center justify-center">
            {user?.images?.[0]?.url ? (
              <img src={user.images[0].url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={28} className="text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-foreground truncate">{user?.display_name || "Music Lover"}</h2>
              {user?.product === "premium" && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary shrink-0">
                  <Crown size={10} /> Premium
                </span>
              )}
            </div>
            {user?.email && (
              <p className="text-xs text-muted-foreground truncate mb-2">{user.email}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users size={12} />
                {followerCount.toLocaleString()} followers
              </span>
              {user?.country && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {user.country}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Spotify Profile Link */}
        {user?.external_urls?.spotify && (
          <a
            href={user.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mt-4 py-2 rounded-lg text-xs font-medium text-muted-foreground bg-secondary/60 hover:bg-secondary transition-colors"
          >
            <ExternalLink size={12} />
            Open Spotify Profile
          </a>
        )}
      </div>

      {/* Account Details */}
      <div className="bg-card rounded-2xl p-4 mb-6 border border-border/50">
        <h3 className="text-sm font-bold text-foreground mb-3">Account Details</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Spotify ID</span>
            <span className="text-xs font-medium text-foreground">{user?.id || "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Subscription</span>
            <span className="text-xs font-medium text-foreground capitalize">{user?.product || "Free"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Country</span>
            <span className="text-xs font-medium text-foreground">{user?.country || "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Email</span>
            <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{user?.email || "—"}</span>
          </div>
        </div>
      </div>

      {/* Top Artists */}
      {topArtists.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-foreground mb-3">Your Top Artists</h3>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4">
            {topArtists.map((artist) => (
              <div key={artist.id} className="flex-shrink-0 w-20 text-center">
                <div className="w-20 h-20 rounded-full overflow-hidden mb-2 bg-secondary">
                  <img src={getArtistImage(artist)} alt={artist.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs font-medium text-foreground truncate">{artist.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            AI Recommendations
          </h3>
          <button
            onClick={fetchAiRecs}
            disabled={aiLoading}
            className="text-xs font-semibold text-primary px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : aiRecs.length ? "Refresh" : "Get Suggestions"}
          </button>
        </div>

        {aiRecs.length > 0 && (
          <div className="flex flex-col gap-2">
            {aiRecs.map((rec, i) => (
              <div
                key={`${rec.name}-${i}`}
                onClick={() => playAiRec(rec)}
                className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-secondary/60 transition-colors cursor-pointer group border border-border/30"
              >
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                  <Play size={14} className="text-primary-foreground ml-0.5" fill="currentColor" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{rec.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{rec.artist}</p>
                  <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{rec.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Install App */}
      <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <Download size={18} className="text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Install Aura Music</p>
            <p className="text-xs text-muted-foreground">Add to your home screen like a real app</p>
          </div>
          <Link
            to="/install"
            className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
          >
            Install
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-destructive/5 rounded-2xl p-4 border border-destructive/10">
        <h3 className="text-sm font-bold text-destructive mb-2">Disconnect</h3>
        <p className="text-xs text-muted-foreground mb-3">This will log you out and clear all Spotify data from this session.</p>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors active:scale-[0.98]"
        >
          <LogOut size={16} />
          Disconnect & Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;
