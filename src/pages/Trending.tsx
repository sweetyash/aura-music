import { useState, useEffect, useCallback } from "react";
import { Flame, Play, Loader2, Music2, ChevronRight } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyTrack, SpotifyPlaylist, getTrackCover, formatDuration } from "@/hooks/useSpotifyApi";

const timeRanges = [
  { value: "short_term", label: "Last 4 weeks" },
  { value: "medium_term", label: "Last 6 months" },
  { value: "long_term", label: "All time" },
] as const;

const LANGUAGE_PLAYLISTS = [
  { lang: "All",     query: "top hits 2024",          emoji: "🌐" },
  { lang: "Telugu",  query: "telugu hits top songs",  emoji: "🎵" },
  { lang: "Tamil",   query: "tamil hits top songs",   emoji: "🎶" },
  { lang: "Hindi",   query: "hindi hits top songs",   emoji: "🎤" },
  { lang: "English", query: "english pop hits",        emoji: "🎸" },
  { lang: "Kannada", query: "kannada hits songs",      emoji: "🥁" },
  { lang: "Malayalam", query: "malayalam hits songs",  emoji: "🎺" },
];

interface LangPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
}

const Trending = () => {
  const { isConnected, playTrackWithQueue, playTrack, connect } = useSpotify();
  const { getTopTracks, search, getPlaylistTracks } = useSpotifyApi();

  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<string>("medium_term");

  // Language playlists state
  const [activeLang, setActiveLang] = useState("All");
  const [langPlaylists, setLangPlaylists] = useState<LangPlaylist[]>([]);
  const [langLoading, setLangLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<LangPlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  // Fetch top tracks
  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    getTopTracks(timeRange, 50)
      .then((data) => setTracks(data.items || []))
      .catch((err) => console.error("Top tracks error:", err))
      .finally(() => setLoading(false));
  }, [isConnected, timeRange, getTopTracks]);

  // Fetch playlists for the active language
  const fetchLangPlaylists = useCallback(async (lang: string) => {
    if (!isConnected) return;
    const entry = LANGUAGE_PLAYLISTS.find(l => l.lang === lang);
    if (!entry) return;
    setLangLoading(true);
    setSelectedPlaylist(null);
    setPlaylistTracks([]);
    try {
      const res = await search(entry.query, "playlist", 10);
      setLangPlaylists(res?.playlists?.items?.filter(Boolean) || []);
    } catch (err) {
      console.error("Lang playlist fetch error:", err);
      setLangPlaylists([]);
    } finally {
      setLangLoading(false);
    }
  }, [isConnected, search]);

  useEffect(() => {
    fetchLangPlaylists(activeLang);
  }, [activeLang, fetchLangPlaylists]);

  // Open a playlist and load its tracks
  const openPlaylist = async (pl: LangPlaylist) => {
    setSelectedPlaylist(pl);
    setPlaylistLoading(true);
    try {
      const res = await getPlaylistTracks(pl.id, 50);
      const items: SpotifyTrack[] = (res?.items || [])
        .map((i: any) => i?.track)
        .filter((t: any) => t && t.id);
      setPlaylistTracks(items);
    } catch (err) {
      console.error("Playlist tracks error:", err);
      setPlaylistTracks([]);
    } finally {
      setPlaylistLoading(false);
    }
  };

  const handlePlayTopTrack = (track: SpotifyTrack, index: number) => {
    const queueTracks = tracks.map(t => ({
      uri: t.uri, title: t.name,
      artist: t.artists[0]?.name || "Unknown",
      cover: getTrackCover(t), previewUrl: t.preview_url, durationMs: t.duration_ms,
    }));
    playTrackWithQueue(queueTracks, index);
  };

  const handlePlayPlaylistTrack = (track: SpotifyTrack, index: number) => {
    const queueTracks = playlistTracks.map(t => ({
      uri: t.uri, title: t.name,
      artist: t.artists[0]?.name || "Unknown",
      cover: getTrackCover(t), previewUrl: t.preview_url, durationMs: t.duration_ms,
    }));
    playTrackWithQueue(queueTracks, index);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Flame size={48} className="text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">Trending</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Connect Spotify to explore trending music</p>
        <button onClick={connect} className="px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20">
          Connect Spotify
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-36">

      {/* ── Language Playlists Section ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Music2 size={20} className="text-primary" />
          <h2 className="text-base font-bold text-foreground">Playlists by Language</h2>
        </div>

        {/* Language tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
          {LANGUAGE_PLAYLISTS.map(({ lang, emoji }) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeLang === lang
                  ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{emoji}</span>
              {lang}
            </button>
          ))}
        </div>

        {/* Playlist cards */}
        {langLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={22} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2">
            {langPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => openPlaylist(pl)}
                className={`flex-shrink-0 w-36 cursor-pointer group rounded-xl overflow-hidden transition-all active:scale-95 ${
                  selectedPlaylist?.id === pl.id ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="w-36 h-36 rounded-xl overflow-hidden bg-secondary relative">
                  {pl.images?.[0]?.url ? (
                    <img src={pl.images[0].url} alt={pl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 size={28} className="text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Play size={14} className="text-primary-foreground ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <p className="text-xs font-semibold text-foreground mt-1.5 truncate">{pl.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{pl.tracks?.total} tracks</p>
              </div>
            ))}
            {langPlaylists.length === 0 && !langLoading && (
              <p className="text-sm text-muted-foreground py-4">No playlists found</p>
            )}
          </div>
        )}

        {/* Expanded playlist tracks */}
        {selectedPlaylist && (
          <div className="mt-4 bg-secondary/30 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{selectedPlaylist.name}</p>
                <p className="text-xs text-muted-foreground">{playlistTracks.length} tracks</p>
              </div>
              <button
                onClick={() => { setSelectedPlaylist(null); setPlaylistTracks([]); }}
                className="text-xs text-muted-foreground hover:text-foreground ml-3 flex-shrink-0"
              >
                Close
              </button>
            </div>
            {playlistLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                {playlistTracks.map((track, i) => (
                  <div
                    key={`${track.id}-${i}`}
                    onClick={() => handlePlayPlaylistTrack(track, i)}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/60 transition-colors group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-4 text-right tabular-nums">{i + 1}</span>
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={getTrackCover(track)} alt={track.album.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play size={12} className="text-foreground" fill="currentColor" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{track.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{track.artists.map(a => a.name).join(", ")}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatDuration(track.duration_ms)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-border mb-5" />

      {/* ── Your Top Tracks Section ── */}
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
              onClick={() => handlePlayTopTrack(track, i)}
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
