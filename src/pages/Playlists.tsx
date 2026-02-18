import { useState, useEffect } from "react";
import { ListMusic, Play, Plus, Loader2, Music, ChevronRight, X, Lock, Globe } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyPlaylist, SpotifyTrack, getTrackCover, formatDuration } from "@/hooks/useSpotifyApi";
import { toast } from "@/hooks/use-toast";

const Playlists = () => {
  const { isConnected, playTrackWithQueue, connect } = useSpotify();
  const { getPlaylists, getPlaylistTracks, createPlaylist, getCurrentUser } = useSpotifyApi();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<{ track: SpotifyTrack }[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);
    getPlaylists(50)
      .then((data) => setPlaylists(data.items || []))
      .catch((err) => console.error("Playlists error:", err))
      .finally(() => setLoading(false));
  }, [isConnected, getPlaylists]);

  const openPlaylist = async (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    setTracksLoading(true);
    try {
      const data = await getPlaylistTracks(playlist.id, 100);
      setPlaylistTracks(data.items || []);
    } catch (err) {
      console.error("Playlist tracks error:", err);
    }
    setTracksLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: "Name required", description: "Please enter a playlist name.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const user = await getCurrentUser();
      const playlist = await createPlaylist(user.id, newName.trim(), newDesc.trim(), isPublic);
      setPlaylists((prev) => [playlist, ...prev]);
      setNewName("");
      setNewDesc("");
      setIsPublic(false);
      setShowCreate(false);
      toast({ title: "✅ Playlist Created!", description: `"${newName.trim()}" is ready on Spotify.` });
    } catch (err) {
      console.error("Create playlist error:", err);
      toast({ title: "Error", description: "Could not create playlist. Please try again.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handlePlayPlaylist = (tracks: { track: SpotifyTrack }[], startIndex: number) => {
    const queueTracks = tracks
      .map(({ track: t }) => t)
      .filter(Boolean)
      .map(t => ({
        uri: t.uri, title: t.name,
        artist: t.artists[0]?.name || "Unknown",
        cover: getTrackCover(t), previewUrl: t.preview_url, durationMs: t.duration_ms,
      }));
    playTrackWithQueue(queueTracks, startIndex);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <ListMusic size={48} className="text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">Your Playlists</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Connect Spotify to see and manage your playlists</p>
        <button onClick={connect} className="px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20">
          Connect Spotify
        </button>
      </div>
    );
  }

  // Playlist detail view
  if (selectedPlaylist) {
    return (
      <div className="px-4 pt-6 pb-36">
        <button onClick={() => setSelectedPlaylist(null)} className="text-sm text-primary font-semibold mb-4">
          ← Back to Playlists
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-secondary">
            {selectedPlaylist.images?.[0]?.url ? (
              <img src={selectedPlaylist.images[0].url} alt={selectedPlaylist.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music size={24} className="text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{selectedPlaylist.name}</h1>
            <p className="text-xs text-muted-foreground">{selectedPlaylist.tracks?.total || 0} tracks · {selectedPlaylist.owner?.display_name || "You"}</p>
          </div>
          {playlistTracks.length > 0 && (
            <button
              onClick={() => handlePlayPlaylist(playlistTracks, 0)}
              className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20 flex-shrink-0"
            >
              <Play size={16} fill="currentColor" className="ml-0.5" />
            </button>
          )}
        </div>

        {tracksLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {playlistTracks.map(({ track: t }, i) =>
              t && (
                <div
                  key={`${t.id}-${i}`}
                  onClick={() => handlePlayPlaylist(playlistTracks, i)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-colors group cursor-pointer"
                >
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right tabular-nums">{i + 1}</span>
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={getTrackCover(t)} alt={t.album?.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={14} className="text-foreground" fill="currentColor" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.artists?.map((a) => a.name).join(", ")}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDuration(t.duration_ms)}</span>
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-36">

      {/* Create Playlist Bottom Sheet Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => { if (!creating) setShowCreate(false); }}
          />
          <div className="relative w-full max-w-lg bg-card border border-border rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            {/* Handle bar */}
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-foreground">Create New Playlist</h2>
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Playlist icon preview */}
            <div className="flex justify-center mb-5">
              <div className="w-20 h-20 rounded-2xl bg-secondary/80 flex flex-col items-center justify-center border-2 border-dashed border-border gap-1">
                <Music size={28} className="text-muted-foreground/40" />
                <span className="text-[9px] text-muted-foreground/40 font-medium">PLAYLIST</span>
              </div>
            </div>

            {/* Name */}
            <div className="mb-3">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="My awesome playlist..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                maxLength={100}
                className="w-full h-11 px-4 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition-all"
                onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{newName.length}/100</p>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Description <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <textarea
                placeholder="Add an optional description..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                maxLength={300}
                className="w-full px-4 py-3 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
              />
            </div>

            {/* Public / Private toggle */}
            <div
              className="flex items-center justify-between p-3.5 rounded-xl bg-secondary mb-5 cursor-pointer"
              onClick={() => setIsPublic(!isPublic)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPublic ? "bg-primary/15" : "bg-muted"}`}>
                  {isPublic
                    ? <Globe size={16} className="text-primary" />
                    : <Lock size={16} className="text-muted-foreground" />
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{isPublic ? "Public" : "Private"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isPublic ? "Anyone on Spotify can find this" : "Only visible to you"}
                  </p>
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${isPublic ? "bg-primary" : "bg-border"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowCreate(false); setNewName(""); setNewDesc(""); setIsPublic(false); }}
                disabled={creating}
                className="flex-1 h-12 rounded-xl bg-secondary text-sm font-semibold text-muted-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creating ? "Creating..." : "Create Playlist"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ListMusic size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Your Playlists</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3.5 h-9 rounded-full gradient-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 active:scale-95 transition-transform"
        >
          <Plus size={15} />
          New
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{playlists.length} playlists</p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Music size={28} className="text-muted-foreground/40" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">No playlists yet</p>
          <p className="text-sm text-muted-foreground mb-5">Create your first playlist to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20"
          >
            <Plus size={16} /> Create Playlist
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => openPlaylist(playlist)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-secondary">
                {playlist.images?.[0]?.url ? (
                  <img src={playlist.images[0].url} alt={playlist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music size={20} className="text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{playlist.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {playlist.tracks?.total || 0} tracks · {playlist.owner?.display_name || "You"}
                </p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Playlists;
