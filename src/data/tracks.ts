export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
  liked?: boolean;
}

import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";

export const mockTracks: Track[] = [
  { id: "1", title: "Neon Waves", artist: "Synthia", album: "Electric Dreams", cover: album1, duration: "3:24", liked: true },
  { id: "2", title: "Midnight Run", artist: "DVLM", album: "After Dark", cover: album2, duration: "4:01" },
  { id: "3", title: "Digital Rain", artist: "Pixel Ghost", album: "Cyberspace", cover: album3, duration: "3:45", liked: true },
  { id: "4", title: "Cloud Nine", artist: "Luna", album: "Ethereal", cover: album4, duration: "2:58" },
  { id: "5", title: "Velocity", artist: "Synthia", album: "Electric Dreams", cover: album1, duration: "3:33" },
  { id: "6", title: "Red Horizon", artist: "DVLM", album: "After Dark", cover: album2, duration: "4:12", liked: true },
  { id: "7", title: "Spectrum", artist: "Pixel Ghost", album: "Cyberspace", cover: album3, duration: "3:18" },
  { id: "8", title: "Dreamscape", artist: "Luna", album: "Ethereal", cover: album4, duration: "5:02" },
];

export const trendingTracks = mockTracks.slice(0, 6);
export const newReleases = [...mockTracks].reverse().slice(0, 6);
export const likedTracks = mockTracks.filter(t => t.liked);
