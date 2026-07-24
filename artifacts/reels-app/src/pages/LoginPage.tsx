import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { FaGoogle } from 'react-icons/fa';
import { PlaySquare, Sparkles, MessageCircle, Heart, Terminal, Loader2 } from 'lucide-react';

export function LoginPage() {
  const { signInWithGoogle, signInWithTestAccount, user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [devEmail, setDevEmail] = useState('');
  const [devLoading, setDevLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!loading && user) setLocation('/');
  }, [user, loading]);

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devEmail.trim()) return;
    setDevLoading(true);
    setErrorMsg('');
    try {
      // Append domain if user just writes user1
      const email = devEmail.includes('@') ? devEmail.trim() : `${devEmail.trim()}@example.com`;
      await signInWithTestAccount(email);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to login');
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient orbs (lighter for light theme) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-red-200 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-pink-200 blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-orange-100 blur-3xl animate-pulse delay-500" />
      </div>

      {/* Floating icons */}
      <div className="absolute top-20 left-20 opacity-30 animate-bounce delay-300">
        <Heart className="w-8 h-8 text-red-400" />
      </div>
      <div className="absolute top-40 right-24 opacity-30 animate-bounce delay-700">
        <MessageCircle className="w-6 h-6 text-gray-400" />
      </div>
      <div className="absolute bottom-32 left-32 opacity-30 animate-bounce delay-500">
        <Sparkles className="w-7 h-7 text-yellow-400" />
      </div>
      <div className="absolute bottom-20 right-20 opacity-30 animate-bounce delay-200">
        <PlaySquare className="w-9 h-9 text-red-400" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Card */}
        <div
          className="rounded-3xl border border-gray-200 p-8 flex flex-col items-center gap-6 text-center shadow-xl bg-white/80"
          style={{ backdropFilter: 'blur(20px)' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary"
            >
              <PlaySquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              Monkey<span className="text-primary">YT</span>
            </span>
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-xs leading-relaxed">
              Share reels, connect with friends,<br />and discover amazing content.
            </p>
          </div>

          {/* Google Sign In */}
          <button
            id="google-signin-btn"
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-95 hover:opacity-90 cursor-pointer shadow-sm"
            style={{ background: '#4285f4', color: 'white' }}
          >
            <FaGoogle className="w-4 h-4" />
            Continue with Google
          </button>

          {/* Separator */}
          <div className="flex items-center w-full gap-3 my-1">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Local Developer Bypass */}
          <form onSubmit={handleDevLogin} className="w-full flex flex-col gap-3">
            <div className="text-left">
              <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5 block">
                Local Dev Offline Bypass
              </label>
              <input
                id="dev-email-input"
                value={devEmail}
                onChange={e => setDevEmail(e.target.value)}
                placeholder="Enter test user name (e.g. murali)"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 text-sm placeholder:text-gray-400 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-colors shadow-inner"
              />
            </div>
            {errorMsg && <p className="text-red-500 text-xs text-left">{errorMsg}</p>}
            <button
              type="submit"
              disabled={!devEmail.trim() || devLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-bold text-sm transition-all duration-200 active:scale-95 hover:bg-gray-200 disabled:opacity-50 cursor-pointer bg-gray-100 border border-gray-200 text-gray-800 shadow-sm"
            >
              {devLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              ) : (
                <>
                  <Terminal className="w-4 h-4 text-gray-500" />
                  Dev Local Login
                </>
              )}
            </button>
          </form>

          <p className="text-gray-400 text-[10px]">
            Dev login auto-registers test emails with mock passwords locally.
          </p>
        </div>
      </div>
    </div>
  );
}
