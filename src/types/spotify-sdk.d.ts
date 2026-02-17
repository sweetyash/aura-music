interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: 'ready', callback: (data: { device_id: string }) => void): void;
  addListener(event: 'not_ready', callback: (data: { device_id: string }) => void): void;
  addListener(event: 'player_state_changed', callback: (state: Spotify.PlaybackState | null) => void): void;
  addListener(event: 'initialization_error', callback: (data: { message: string }) => void): void;
  addListener(event: 'authentication_error', callback: (data: { message: string }) => void): void;
  addListener(event: 'account_error', callback: (data: { message: string }) => void): void;
  removeListener(event: string): void;
  getCurrentState(): Promise<Spotify.PlaybackState | null>;
  setName(name: string): Promise<void>;
  getVolume(): Promise<number>;
  setVolume(volume: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  togglePlay(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
}

declare namespace Spotify {
  interface PlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: {
        id: string;
        uri: string;
        name: string;
        duration_ms: number;
        artists: Array<{ name: string; uri: string }>;
        album: {
          name: string;
          uri: string;
          images: Array<{ url: string; height: number; width: number }>;
        };
      };
      previous_tracks: Array<any>;
      next_tracks: Array<any>;
    };
  }
  
  interface Player extends SpotifyPlayer {}
}

interface Window {
  onSpotifyWebPlaybackSDKReady: () => void;
  Spotify: {
    Player: new (options: {
      name: string;
      getOAuthToken: (cb: (token: string) => void) => void;
      volume?: number;
    }) => SpotifyPlayer;
  };
}
