import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
  liked?: boolean;
  language: string;
  year: number;
  popularity: number; // 0-100
}

export const mockTracks: Track[] = [
  { id: "1", title: "Nee Kannu Neeli Samudram", artist: "Anup Rubens", album: "Uppena", cover: album1, duration: "4:24", liked: true, language: "Telugu", year: 2021, popularity: 92 },
  { id: "2", title: "Midnight Run", artist: "DVLM", album: "After Dark", cover: album2, duration: "4:01", language: "English", year: 2024, popularity: 78 },
  { id: "3", title: "Ranjithame", artist: "Anirudh", album: "Vikram", cover: album3, duration: "3:45", liked: true, language: "Tamil", year: 2022, popularity: 95 },
  { id: "4", title: "Cloud Nine", artist: "Luna", album: "Ethereal", cover: album4, duration: "2:58", language: "English", year: 2025, popularity: 64 },
  { id: "5", title: "Samajavaragamana", artist: "Sid Sriram", album: "Ala Vaikunthapurramuloo", cover: album1, duration: "5:33", language: "Telugu", year: 2020, popularity: 97 },
  { id: "6", title: "Arabic Kuthu", artist: "Anirudh", album: "Beast", cover: album2, duration: "4:12", liked: true, language: "Tamil", year: 2022, popularity: 88 },
  { id: "7", title: "Spectrum", artist: "Pixel Ghost", album: "Cyberspace", cover: album3, duration: "3:18", language: "English", year: 2024, popularity: 55 },
  { id: "8", title: "Inkem Inkem", artist: "Sid Sriram", album: "Geetha Govindam", cover: album4, duration: "5:02", language: "Telugu", year: 2018, popularity: 99 },
];

export const trendingTracks = mockTracks.slice(0, 6);
export const newReleases = [...mockTracks].reverse().slice(0, 6);
export const likedTracks = mockTracks.filter(t => t.liked);
