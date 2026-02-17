import { useState, useEffect } from "react";
import { Flame, Play, Clock, Loader2 } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyTrack, getTrackCover, formatDuration } from "@/hooks/useSpotifyApi";

const timeRanges = [
  { value: "short_term", label: "Last 4 weeks" },
  { value: "medium_term", label: "Last 6 months" },
  { value: "long_term", label: "All time" },
] as const;

const Trending = () => {
  const { isConnected, playTrack, connect } = useSpotify();
  const { getTopTracks } = useSpotifyApi();
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<string>("medium_term");

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    getTopTracks(timeRange, 50)
      .then((data) => setTracks(data.items || []))
      .catch((err) => console.error("Top tracks error:", err))
      .finally(() => setLoading(false));
  }, [isConnected, timeRange, getTopTracks]);

  const handlePlay = (track: SpotifyTrack) => {
    playTrack(track.uri, track.name, track.artists[0]?.name || "Unknown", getTrackCover(track));
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Flame size={48} className="text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">Your Top Tracks</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Connect Spotify to see your most played songs</p>
        <button onClick={connect} className="px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20">
          Connect Spotify
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-36">
      <div className="flex items-center gap-2 mb-1">
        <Flame size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-foreground">Your Top Tracks</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{tracks.length} tracks</p>

      {/* Time range filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar -mx-4 px-4">
        {timeRanges.map((r) => (
          <button
            key={r.value}
            onClick={() => setTimeRange(r.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              timeRange === r.value
                ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tracks.map((track, i) => (
            <div
              key={track.id}
              onClick={() => handlePlay(track)}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group cursor-pointer"
            >
              <span className="text-xs font-bold text-muted-foreground w-5 text-right tabular-nums">{i + 1}</span>
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={getTrackCover(track)} alt={track.album.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play size={16} className="text-foreground" fill="currentColor" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{track.name}</p>
                <p className="text-xs text-muted-foreground truncate">{track.artists.map((a) => a.name).join(", ")}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">{formatDuration(track.duration_ms)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trending;
