import { Settings, ChevronRight, LogOut, Bell, Shield, HelpCircle, Music } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";
import album1 from "@/assets/album-1.jpg";

const menuItems = [
  { icon: Bell, label: "Notifications" },
  { icon: Shield, label: "Privacy" },
  { icon: HelpCircle, label: "Help & Support" },
  { icon: LogOut, label: "Log Out" },
];

const Profile = () => {
  const { isConnected, connect } = useSpotify();

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
        <Settings size={22} className="text-muted-foreground" />
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-primary ring-offset-2 ring-offset-background mb-3">
          <img src={album1} alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Alex Rivera</h2>
        <p className="text-sm text-muted-foreground">@alexrivera</p>
      </div>

      {/* Spotify Connect */}
      <button
        onClick={connect}
        disabled={isConnected}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm mb-6 transition-all active:scale-[0.98] ${
          isConnected
            ? "bg-primary/20 text-primary cursor-default"
            : "gradient-primary text-primary-foreground shadow-md shadow-primary/20"
        }`}
      >
        <Music size={18} />
        {isConnected ? "Connected to Spotify" : "Login with Spotify"}
      </button>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Playlists", value: "12" },
          { label: "Followers", value: "284" },
          { label: "Following", value: "156" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div className="bg-card rounded-xl overflow-hidden">
        {menuItems.map(({ icon: Icon, label }, i) => (
          <button
            key={label}
            className={`flex items-center w-full px-4 py-3.5 hover:bg-secondary/60 transition-colors ${
              i < menuItems.length - 1 ? "border-b border-border" : ""
            } ${label === "Log Out" ? "text-destructive" : "text-foreground"}`}
          >
            <Icon size={18} className="mr-3" />
            <span className="text-sm font-medium flex-1 text-left">{label}</span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Profile;
