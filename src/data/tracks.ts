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
  language: "Telugu" | "Tamil" | "English";
  year: number;
  popularity: number;
  releaseDate: string;
}

export const mockTracks: Track[] = [
  { id: "1", title: "Nee Kannu Neeli Samudram", artist: "Anup Rubens", album: "Uppena", cover: album1, duration: "4:24", liked: true, language: "Telugu", year: 2021, popularity: 92, releaseDate: "Feb 12, 2021" },
  { id: "2", title: "Midnight Run", artist: "DVLM", album: "After Dark", cover: album2, duration: "4:01", language: "English", year: 2024, popularity: 78, releaseDate: "Jan 5, 2024" },
  { id: "3", title: "Ranjithame", artist: "Anirudh", album: "Vikram", cover: album3, duration: "3:45", liked: true, language: "Tamil", year: 2022, popularity: 95, releaseDate: "Jun 3, 2022" },
  { id: "4", title: "Cloud Nine", artist: "Luna", album: "Ethereal", cover: album4, duration: "2:58", language: "English", year: 2025, popularity: 64, releaseDate: "Mar 18, 2025" },
  { id: "5", title: "Samajavaragamana", artist: "Sid Sriram", album: "Ala Vaikunthapurramuloo", cover: album1, duration: "5:33", language: "Telugu", year: 2020, popularity: 97, releaseDate: "Jan 12, 2020" },
  { id: "6", title: "Arabic Kuthu", artist: "Anirudh", album: "Beast", cover: album2, duration: "4:12", liked: true, language: "Tamil", year: 2022, popularity: 88, releaseDate: "Apr 13, 2022" },
  { id: "7", title: "Spectrum", artist: "Pixel Ghost", album: "Cyberspace", cover: album3, duration: "3:18", language: "English", year: 2024, popularity: 55, releaseDate: "Nov 20, 2024" },
  { id: "8", title: "Inkem Inkem", artist: "Sid Sriram", album: "Geetha Govindam", cover: album4, duration: "5:02", language: "Telugu", year: 2018, popularity: 99, releaseDate: "Aug 15, 2018" },
  { id: "9", title: "Butta Bomma", artist: "Armaan Malik", album: "Ala Vaikunthapurramuloo", cover: album1, duration: "3:47", language: "Telugu", year: 2020, popularity: 94, releaseDate: "Jan 12, 2020" },
  { id: "10", title: "Kaavaalaa", artist: "Anirudh", album: "Jailer", cover: album3, duration: "3:55", liked: true, language: "Tamil", year: 2023, popularity: 91, releaseDate: "Jun 28, 2023" },
  { id: "11", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", cover: album2, duration: "3:20", language: "English", year: 2020, popularity: 98, releaseDate: "Nov 29, 2020" },
  { id: "12", title: "Oo Antava", artist: "Indravathi Chauhan", album: "Pushpa", cover: album4, duration: "3:10", language: "Telugu", year: 2021, popularity: 90, releaseDate: "Dec 17, 2021" },
];

export const trendingTracks = mockTracks.sort((a, b) => b.popularity - a.popularity);
export const newReleases = [...mockTracks].sort((a, b) => b.year - a.year);
export const likedTracks = mockTracks.filter(t => t.liked);
