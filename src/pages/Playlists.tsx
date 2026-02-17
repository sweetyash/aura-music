import { useState, useEffect } from "react";
import { ListMusic, Play, Plus, Loader2, Music, ChevronRight } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { useSpotifyApi, SpotifyPlaylist, SpotifyTrack, getTrackCover, formatDuration } from "@/hooks/useSpotifyApi";
import { toast } from "@/hooks/use-toast";

const Playlists = () => {
  const { isConnected, playTrack, connect } = useSpotify();
  const { getPlaylists, getPlaylistTracks, createPlaylist, getCurrentUser } = useSpotifyApi();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<{ track: SpotifyTrack }[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

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
    if (!newName.trim()) return;
    try {
      const user = await getCurrentUser();
      const playlist = await createPlaylist(user.id, newName.trim(), "", false);
      setPlaylists((prev) => [playlist, ...prev]);
      setNewName("");
      setCreating(false);
      toast({ title: "Playlist Created", description: `"${newName.trim()}" has been created.` });
    } catch (err) {
      console.error("Create playlist error:", err);
      toast({ title: "Error", description: "Could not create playlist.", variant: "destructive" });
    }
  };

  const handlePlay = (t: SpotifyTrack) => {
    playTrack(t.uri, t.name, t.artists[0]?.name || "Unknown", getTrackCover(t));
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
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            <img src={selectedPlaylist.images?.[0]?.url || "/placeholder.svg"} alt={selectedPlaylist.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{selectedPlaylist.name}</h1>
            <p className="text-xs text-muted-foreground">{selectedPlaylist.tracks.total} tracks · {selectedPlaylist.owner.display_name}</p>
          </div>
        </div>

        {tracksLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {playlistTracks.map(({ track: t }, i) => (
              t && (
                <div
                  key={`${t.id}-${i}`}
                  onClick={() => handlePlay(t)}
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
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-36">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ListMusic size={22} className="text-primary" />
          <h1 className="text-xl font-bold text-foreground">Your Playlists</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20"
        >
          <Plus size={18} />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{playlists.length} playlists</p>

      {/* Create playlist */}
      {creating && (
        <div className="flex gap-2 mb-5 animate-fade-in">
          <input
            type="text"
            placeholder="Playlist name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="flex-1 h-10 px-3 rounded-xl bg-secondary text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button onClick={handleCreate} className="px-4 h-10 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold">
            Create
          </button>
          <button onClick={() => { setCreating(false); setNewName(""); }} className="px-3 h-10 rounded-xl bg-secondary text-muted-foreground text-sm">
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-primary" />
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
                <p className="text-xs text-muted-foreground truncate">{playlist.tracks.total} tracks · {playlist.owner.display_name}</p>
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
