import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  ShieldCheck, 
  Video, 
  Mic, 
  BarChart3, 
  FileText, 
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Lock,
  LogIn,
  UserPlus
} from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  // Load saved credentials on mount
  useEffect(() => {
    const saved = localStorage.getItem('weintern_saved_credentials');
    if (saved) {
      try {
        const decrypted = JSON.parse(atob(saved));
        setIdentifier(decrypted.identifier || '');
        setPassword(decrypted.password || '');
        setRememberMe(true);
      } catch (e) {
        console.error('Failed to parse saved credentials', e);
      }
    }
  }, []);

  const formatIdentifier = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed.includes('@')) {
      const cleanPhone = trimmed.replace(/[^0-9+]/g, '');
      if (cleanPhone.length >= 7) {
        return `${cleanPhone}@phone.weintern.com`;
      }
    }
    return trimmed;
  };

  const handleGoogleLogin = async () => {
    try {
      const googleEmail = window.prompt("Enter your Gmail address to continue with Google:");
      if (!googleEmail) return;

      if (!googleEmail.includes('@')) {
        setAuthError("Please enter a valid email address.");
        return;
      }

      setFormLoading(true);
      setAuthError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google' as any,
        options: {
          queryParams: { email: googleEmail.trim() },
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;

      // In demo/mock mode signInWithOAuth completes synchronously — navigate now
      navigate('/');
    } catch (err: any) {
      console.error('Google Auth Login Failed:', err);
      setAuthError(err.message || 'Google Authentication failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setAuthError('Please fill in all fields.');
      return;
    }
    if (isSignUp && !fullName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }

    setFormLoading(true);
    setAuthError(null);

    const formattedEmail = formatIdentifier(identifier);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: formattedEmail,
          password: password,
          options: {
            data: {
              full_name: fullName.trim()
            }
          }
        });

        if (error) throw error;
        
        if (rememberMe) {
          localStorage.setItem('weintern_saved_credentials', btoa(JSON.stringify({ identifier: identifier.trim(), password })));
        } else {
          localStorage.removeItem('weintern_saved_credentials');
        }

        navigate('/');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formattedEmail,
          password: password
        });

        if (error) throw error;

        if (rememberMe) {
          localStorage.setItem('weintern_saved_credentials', btoa(JSON.stringify({ identifier: identifier.trim(), password })));
        } else {
          localStorage.removeItem('weintern_saved_credentials');
        }

        navigate('/');
      }
    } catch (err: any) {
      console.error('Auth action failed:', err);
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setFormLoading(false);
    }
  };

  // Dynamically verify input type for custom icon morphing
  const isPhone = !identifier.includes('@') && /[0-9]/.test(identifier);

  return (
    <div className="min-h-screen bg-dark-950 text-dark-100 flex flex-col justify-between overflow-hidden relative">
      {/* Dynamic Sunset Glow Orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-brand-500/15 rounded-full blur-[140px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-accent-orange/15 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Header */}
      <header className="px-6 py-6 max-w-7xl mx-auto w-full z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke="#f97316" strokeWidth="2" fill="rgba(249, 115, 22, 0.05)" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke="#f59e0b" strokeWidth="2.5" />
            <path d="M12 9l6-3-6-3-6 3 6 3z" stroke="#fbbf24" strokeWidth="2" fill="rgba(251, 191, 36, 0.1)"/>
            <path d="M6 7.5v4c0 1 1 2 6 2s6-1 6-2v-4" stroke="#fbbf24" strokeWidth="2"/>
          </svg>
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-brand-400 to-accent-orange bg-clip-text text-transparent">
            WeIntern
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-dark-400 bg-white/5 border border-white/5 px-3 py-1 rounded-full">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <span>Secured Credentials</span>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 md:py-20 grid md:grid-cols-12 gap-12 items-center z-10">
        <div className="md:col-span-7 space-y-6 animate-slide-up">


          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
            Supercharge Your <br />
            <span className="bg-gradient-to-r from-brand-400 via-accent-orange to-accent-gold bg-clip-text text-transparent">
              Interview Success
            </span>
          </h1>

          <p className="text-dark-300 text-base md:text-lg font-normal leading-relaxed max-w-2xl">
            Practice domain-specific, realistic mock interviews with conversational voice tracking, and get comprehensive performance reports with custom development roadmaps.
          </p>

          {/* Form Card */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 max-w-md w-full relative overflow-hidden backdrop-blur-md shadow-2xl">
            {/* Sliding Tab Header */}
            <div className="flex bg-white/5 p-1 rounded-xl relative">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setAuthError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all relative z-10 ${!isSignUp ? 'text-dark-950' : 'text-dark-300 hover:text-white'}`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setAuthError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all relative z-10 ${isSignUp ? 'text-dark-950' : 'text-dark-300 hover:text-white'}`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </button>
              
              {/* Tab Slider Indicator */}
              <div 
                className="absolute top-1 bottom-1 bg-gradient-to-r from-brand-400 to-accent-orange rounded-lg transition-all duration-300"
                style={{ 
                  left: isSignUp ? 'calc(50% + 2px)' : '4px',
                  width: 'calc(50% - 6px)' 
                }}
              ></div>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="bg-brand-950/40 border border-brand-900/30 text-brand-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-orange animate-ping"></span>
                <span>{authError}</span>
              </div>
            )}

            {/* Actual Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {isSignUp && (
                <div className="relative animate-fade-in">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/5 focus:border-brand-500 rounded-xl text-xs text-white placeholder-dark-400 outline-none transition-all"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-400">
                  {isPhone ? (
                    <Phone className="w-4 h-4 text-brand-400 transition-all duration-200" />
                  ) : (
                    <Mail className="w-4 h-4 text-brand-400 transition-all duration-200" />
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Email or Mobile No."
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/5 focus:border-brand-500 rounded-xl text-xs text-white placeholder-dark-400 outline-none transition-all"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-dark-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/5 focus:border-brand-500 rounded-xl text-xs text-white placeholder-dark-400 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Remember Me Box */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-brand-500 w-3.5 h-3.5 border-white/10 rounded"
                  />
                  <span className="text-[11px] text-dark-400 hover:text-dark-300">Remember credentials & save password</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 bg-gradient-to-r from-brand-400 to-accent-orange text-dark-950 font-extrabold rounded-xl hover:from-brand-500 hover:to-brand-600 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98] text-xs cursor-pointer shadow-lg shadow-brand-500/10"
              >
                {formLoading ? (
                  <div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin"></div>
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Create Free Account
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In to Practice
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 py-2 text-[10px] text-dark-500 uppercase tracking-widest">
              <div className="h-[1px] bg-white/5 flex-1"></div>
              <span>OR</span>
              <div className="h-[1px] bg-white/5 flex-1"></div>
            </div>

            {/* Google OAuth Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 bg-white text-dark-950 font-bold py-3 rounded-xl hover:bg-brand-50 transform active:scale-[0.98] transition-all text-xs cursor-pointer shadow-md"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        {/* Feature Grid with 3D Motion */}
        <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 perspective-1000">
          <div className="glass-panel card-3d-tilt p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-default">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">5 Core Tracks</h3>
              <p className="text-dark-400 text-xs mt-1">Software, Data, Marketing, Finance, HR.</p>
            </div>
          </div>

          <div className="glass-panel card-3d-tilt p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-default" style={{ transitionDelay: '0.05s' }}>
            <div className="w-10 h-10 rounded-xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center text-accent-orange mb-4">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Voice Dictation</h3>
              <p className="text-dark-400 text-xs mt-1">Answer questions naturally using Voice Mode speech-to-text.</p>
            </div>
          </div>

          <div className="glass-panel card-3d-tilt p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-default" style={{ transitionDelay: '0.1s' }}>
            <div className="w-10 h-10 rounded-xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center text-brand-400 mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Visual Analytics</h3>
              <p className="text-dark-400 text-xs mt-1">Radar & progress charts comparing communication, technical accuracy.</p>
            </div>
          </div>

          <div className="glass-panel card-3d-tilt p-6 rounded-2xl flex flex-col justify-between min-h-[160px] cursor-default" style={{ transitionDelay: '0.15s' }}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">PDF Reports</h3>
              <p className="text-dark-400 text-xs mt-1">Download official PDF reports detailing all questions, answers, and scores.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-dark-500 z-10">
        <p>&copy; {new Date().getFullYear()} WeIntern. Designed for next-generation professional growth.</p>
      </footer>
    </div>
  );
};

export default Login;
