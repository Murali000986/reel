import { useLocation } from 'wouter';
import { Home, Compass, PlusSquare, MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Compass, label: 'Explore', href: '/explore' },
  { icon: PlusSquare, label: 'Upload', href: '/admin/upload' },
  { icon: MessageCircle, label: 'Messages', href: '/messages' },
  { icon: User, label: 'Profile', href: '/profile' },
];

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pt-2 pb-safe bg-white/80 backdrop-blur-xl border-t border-gray-200/50 md:bottom-0 md:top-0 md:right-auto md:w-20 md:flex-col md:justify-center md:gap-6 md:border-t-0 md:border-r md:px-0 md:py-8 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] md:shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
    >
      {navItems.map(({ icon: Icon, label, href }) => {
        const isActive = location === href || (href !== '/' && location.startsWith(href));
        return (
          <button
            key={href}
            id={`nav-${label.toLowerCase()}`}
            onClick={() => setLocation(href)}
            className={cn(
              'group flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl transition-all duration-300 md:w-[60px]',
              isActive 
                ? 'text-primary bg-red-50 shadow-inner md:bg-red-50/80 scale-105' 
                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50/80 hover:scale-105 active:scale-95'
            )}
            title={label}
          >
            <Icon
              className={cn('w-6 h-6 transition-all duration-300 shrink-0', isActive ? 'scale-110 drop-shadow-sm' : 'group-hover:-translate-y-0.5')}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span className={cn('text-[10px] font-bold tracking-wide transition-all duration-300 hidden md:block', isActive ? 'opacity-100' : 'opacity-0 md:-translate-y-2 group-hover:opacity-100 group-hover:translate-y-0')}>
              {label}
            </span>
            <span className={cn('text-[10px] font-bold tracking-wide transition-all duration-300 md:hidden', isActive ? 'opacity-100' : 'opacity-0 scale-75 h-0')}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
