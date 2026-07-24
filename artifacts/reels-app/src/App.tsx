import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { Toaster } from 'sonner';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BottomNav } from '@/components/BottomNav';
import { LoginPage } from '@/pages/LoginPage';
import { FeedPage } from '@/pages/FeedPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { MessagesPage } from '@/pages/MessagesPage';
import { ReelDetailPage } from '@/pages/ReelDetailPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { UploadPage } from '@/pages/admin/Upload';
import { BulkUploadPage } from '@/pages/admin/BulkUpload';
import { AdminLayout } from '@/components/AdminLayout';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

// Route guard for authenticated pages
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  if (!user) {
    setLocation('/login');
    return null;
  }
  return <Component />;
}

// My profile redirect
function MyProfilePage() {
  const { profile } = useAuth();
  const [, setLocation] = useLocation();
  if (profile) {
    setLocation(`/${profile.username}`);
  }
  return null;
}

function Router() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <main className="flex-1 md:ml-20 relative min-h-screen">
        <Switch>
          <Route path="/login" component={LoginPage} />
        <Route path="/" component={FeedPage} />
        <Route path="/explore" component={ExplorePage} />
        <Route path="/messages" component={() => <ProtectedRoute component={MessagesPage} />} />
        <Route path="/messages/:conversationId" component={() => <ProtectedRoute component={MessagesPage} />} />
        <Route path="/reels/:id" component={ReelDetailPage} />
        <Route path="/notifications" component={() => <ProtectedRoute component={NotificationsPage} />} />
        <Route path="/profile" component={() => <ProtectedRoute component={MyProfilePage} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />

        {/* Admin Routes */}
        <Route path="/admin" nest>
          <AdminLayout>
            <Switch>
              <Route path="/" component={AdminDashboard} />
              <Route path="/upload" component={UploadPage} />
              <Route path="/bulk-upload" component={BulkUploadPage} />
              <Route>
                <div className="flex flex-col items-center justify-center h-full min-h-[50vh]">
                  <h2 className="text-2xl font-bold">Admin Page Not Found</h2>
                </div>
              </Route>
            </Switch>
          </AdminLayout>
        </Route>

        {/* Public user profile: /username (like Instagram) - wildcard at bottom */}
        <Route path="/:username" component={ProfilePage} />


          <Route>
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-muted-foreground">Page not found</p>
            </div>
          </Route>
        </Switch>
      </main>

      {/* Bottom nav on all main pages */}
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
      <Toaster theme="dark" position="bottom-center" />
    </QueryClientProvider>
  );
}

export default App;
