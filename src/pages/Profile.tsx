import { useState, useEffect } from "react";
import { Settings, ChevronRight, LogOut, Music, Loader2, Sparkles, Play, User as UserIcon, Crown } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyArtist, SpotifyTrack, getArtistImage, getTrackCover } from "@/hooks/useSpotifyApi";
import { toast } from "@/hooks/use-toast";

interface AiRec {
  name: string;
  artist: string;
  reason: string;
}

const Profile = () => {
  const { isConnected, connect, disconnect } = useSpotify();
  const { getCurrentUser, getTopArtists, getTopTracks, getRecentlyPlayed, getAiRecommendations, search } = useSpotifyApi();
  const { playTrack } = useSpotify();
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
        playTrack(track.uri, track.name, track.artists[0]?.name || rec.artist, getTrackCover(track));
      } else {
        toast({ title: "Not Found", description: `"${rec.name}" not found on Spotify.`, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not play track.", variant: "destructive" });
    }
  };

  return (
    <div className="px-4 pt-6 pb-36">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
        <Settings size={22} className="text-muted-foreground" />
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-primary ring-offset-2 ring-offset-background mb-3 bg-secondary flex items-center justify-center">
          {user?.images?.[0]?.url ? (
            <img src={user.images[0].url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={32} className="text-muted-foreground" />
          )}
        </div>
        <h2 className="text-lg font-bold text-foreground">{user?.display_name || "Music Lover"}</h2>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-muted-foreground">{user?.email || ""}</p>
          {user?.product === "premium" && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              <Crown size={10} /> Premium
            </span>
          )}
        </div>
      </div>

      {/* Spotify Connect */}
      <button
        onClick={isConnected ? disconnect : connect}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm mb-6 transition-all active:scale-[0.98] ${
          isConnected
            ? "bg-destructive/10 text-destructive border border-destructive/20"
            : "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
        }`}
      >
        <Music size={18} />
        {isConnected ? "Disconnect Spotify" : "Login with Spotify"}
      </button>

      {/* Stats */}
      {user && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-card rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{user.followers?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="bg-card rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{user.country || "—"}</p>
            <p className="text-xs text-muted-foreground">Country</p>
          </div>
        </div>
      )}

      {/* Top Artists */}
      {isConnected && topArtists.length > 0 && (
        <div className="mb-8">
          <h3 className="text-base font-bold text-foreground mb-3">Your Top Artists</h3>
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
      {isConnected && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
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
                  className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-secondary/60 transition-colors cursor-pointer group"
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
      )}
    </div>
  );
};

export default Profile;
