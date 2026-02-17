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
  spotifyUri?: string;
}

export const mockTracks: Track[] = [
  { id: "1", title: "Nee Kannu Neeli Samudram", artist: "Javed Ali", album: "Uppena", cover: album1, duration: "5:12", liked: true, language: "Telugu", year: 2020, popularity: 92, releaseDate: "Feb 12, 2021", spotifyUri: "spotify:track:1C9SYGI40nNYh98gN87Fwr" },
  { id: "2", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", cover: album2, duration: "3:20", language: "English", year: 2020, popularity: 98, releaseDate: "Nov 29, 2020", spotifyUri: "spotify:track:0VjIjW4GlUZAMYd2vXMi3b" },
  { id: "3", title: "Ranjithame", artist: "Thalapathy Vijay", album: "Varisu", cover: album3, duration: "4:47", liked: true, language: "Tamil", year: 2022, popularity: 95, releaseDate: "Dec 24, 2022", spotifyUri: "spotify:track:1LbBOhicFmu7ktJqIHCELt" },
  { id: "4", title: "Samajavaragamana", artist: "Sid Sriram", album: "Ala Vaikunthapurramuloo", cover: album4, duration: "3:39", language: "Telugu", year: 2019, popularity: 97, releaseDate: "Sep 27, 2019", spotifyUri: "spotify:track:6AxlEmGxNoY8kjtTBLuUNZ" },
  { id: "5", title: "Arabic Kuthu", artist: "Anirudh Ravichander", album: "Beast", cover: album1, duration: "4:39", liked: true, language: "Tamil", year: 2022, popularity: 88, releaseDate: "Feb 14, 2022", spotifyUri: "spotify:track:6yvxu91deFKt3X1QoV6qMv" },
  { id: "6", title: "Inkem Inkem Inkem Kaavaale", artist: "Sid Sriram", album: "Geetha Govindam", cover: album2, duration: "4:26", language: "Telugu", year: 2018, popularity: 99, releaseDate: "Jul 10, 2018", spotifyUri: "spotify:track:3hglFJgXWPZUlHfiDO35b" },
  { id: "7", title: "Butta Bomma", artist: "Armaan Malik", album: "Ala Vaikunthapurramuloo", cover: album3, duration: "3:18", language: "Telugu", year: 2020, popularity: 94, releaseDate: "Jan 12, 2020", spotifyUri: "spotify:track:0dnDTvdUco2UbaBjUtPxNS" },
  { id: "8", title: "Kaavaalaa", artist: "Anirudh Ravichander", album: "Jailer", cover: album4, duration: "3:10", liked: true, language: "Tamil", year: 2023, popularity: 91, releaseDate: "Jun 28, 2023", spotifyUri: "spotify:track:3M9G4jJAgDLB9ycinua8Wo" },
  { id: "9", title: "Oo Antava", artist: "Indravathi Chauhan", album: "Pushpa", cover: album1, duration: "3:43", language: "Telugu", year: 2021, popularity: 90, releaseDate: "Dec 10, 2021", spotifyUri: "spotify:track:3szxldqiYs7nkvtmooRod8" },
];

export const trendingTracks = mockTracks.sort((a, b) => b.popularity - a.popularity);
export const newReleases = [...mockTracks].sort((a, b) => b.year - a.year);
export const likedTracks = mockTracks.filter(t => t.liked);
