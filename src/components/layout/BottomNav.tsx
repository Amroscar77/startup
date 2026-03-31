import { Home, PlusCircle, BarChart3, User, Map as MapIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import React from 'react';

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-white/80 backdrop-blur-xl border-t border-surface-container shadow-[0_-4px_20px_0_rgba(0,0,0,0.05)] rounded-t-[2rem] px-4 pb-6 pt-3 flex justify-around items-center">
      <NavLink to="/" icon={<Home size={24} />} label="Home" active={location.pathname === '/'} />
      <NavLink to="/map" icon={<MapIcon size={24} />} label="Map" active={location.pathname === '/map'} />
      <NavLink to="/add" icon={<PlusCircle size={24} />} label="Add Price" active={location.pathname === '/add'} />
      <NavLink to="/rankings" icon={<BarChart3 size={24} />} label="Rankings" active={location.pathname === '/rankings'} />
      <NavLink to="/profile" icon={<User size={24} />} label="Profile" active={location.pathname === '/profile'} />
    </nav>
  );
}

function NavLink({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center justify-center px-5 py-2 transition-all duration-300 ease-out active:scale-90 rounded-full",
        active ? "bg-primary/10 text-primary" : "text-outline hover:text-primary"
      )}
    >
      <div className={cn("mb-1", active && "fill-current")}>{icon}</div>
      <span className="font-sans text-[11px] font-semibold uppercase tracking-wider">{label}</span>
    </Link>
  );
}
