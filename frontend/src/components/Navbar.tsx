import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { LogOut, LayoutDashboard, Play, User as UserIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export const Navbar: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!user) return null;

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  const avatar = user.user_metadata?.avatar_url;

  return (
    <nav className="glass-panel sticky top-0 z-50 border-b border-white/5 bg-dark-950/80 px-6 py-4 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3">
            <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke="#f97316" strokeWidth="2.0" fill="rgba(249, 115, 22, 0.05)" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke="#f59e0b" strokeWidth="2.5" />
              <path d="M12 9l6-3-6-3-6 3 6 3z" stroke="#fbbf24" strokeWidth="2" fill="rgba(251, 191, 36, 0.1)"/>
              <path d="M6 7.5v4c0 1 1 2 6 2s6-1 6-2v-4" stroke="#fbbf24" strokeWidth="2"/>
            </svg>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-brand-400 to-accent-orange bg-clip-text text-transparent">
              WeIntern
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1">
            <Link 
              to="/" 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === '/' || location.pathname === '/dashboard'
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                  : 'text-dark-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link 
              to="/setup" 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === '/setup'
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                  : 'text-dark-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Play className="w-4 h-4" />
              New Interview
            </Link>
            <Link 
              to="/profile" 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === '/profile'
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                  : 'text-dark-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Profile
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/profile" className="flex items-center gap-3 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full hover:bg-white/10 hover:border-brand-500/30 transition-all">
            {avatar ? (
              <img src={avatar} alt={name} className="w-6 h-6 rounded-full border border-brand-500/30" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="hidden sm:inline text-xs font-semibold text-dark-200">{name}</span>
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-xs font-semibold text-orange-400/90 hover:text-orange-400 bg-orange-500/10 border border-orange-500/25 px-4 py-2 rounded-xl hover:bg-orange-500/20 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
