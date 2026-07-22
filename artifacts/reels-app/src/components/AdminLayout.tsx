import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Upload, Home, PlaySquare, Layers } from 'lucide-react';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar */}
      <nav className="w-full md:w-64 bg-card border-r border-border shrink-0 flex flex-col h-auto md:h-screen sticky top-0 z-50">
        {/* Logo */}
        <div className="p-4 md:p-6 border-b border-border flex items-center gap-3 h-16 md:h-auto">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(0,255,255,0.4)]">
            <PlaySquare className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden md:block">ReelAdmin</span>
          <span className="font-bold text-lg tracking-tight md:hidden">Reels</span>
        </div>

        {/* Nav Items */}
        <div className="flex flex-row md:flex-col p-2 md:p-4 gap-1 overflow-x-auto md:overflow-x-visible md:flex-1">
          <NavItem href="/" exact icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/upload" icon={Upload} label="Single Upload" />
          <NavItem href="/bulk-upload" icon={Layers} label="Bulk Upload" />
          <div className="flex-1 hidden md:block" />
          <div className="hidden md:block my-4 border-t border-border" />
          <NavItem href="~/" icon={Home} label="Back to App" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  exact = false,
}: {
  href: string;
  icon: any;
  label: string;
  exact?: boolean;
}) {
  const [location] = useLocation();

  // Active check: exact match or prefix match
  const isActive = exact
    ? location === href
    : location.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 whitespace-nowrap font-medium ${
        isActive
          ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(0,255,255,0.2)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
      <span className="hidden md:inline text-sm">{label}</span>
    </Link>
  );
}
