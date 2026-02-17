import { NavLink, useLocation } from "react-router-dom";
import { Compass, TrendingUp, Clock, Heart, ListMusic, User } from "lucide-react";

const tabs = [
  { path: "/", icon: Compass, label: "Discover" },
  { path: "/trending", icon: TrendingUp, label: "Top" },
  { path: "/new-releases", icon: Clock, label: "Recent" },
  { path: "/liked", icon: Heart, label: "Liked" },
  { path: "/playlists", icon: ListMusic, label: "Playlists" },
  { path: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border safe-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              className="flex flex-col items-center gap-0.5 px-2 py-1 transition-colors"
            >
              <Icon
                size={20}
                className={isActive ? "text-primary" : "text-muted-foreground"}
                fill={isActive && label === "Liked" ? "currentColor" : "none"}
              />
              <span
                className={`text-[9px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
