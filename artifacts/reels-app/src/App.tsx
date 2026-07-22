import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Toaster } from 'sonner';

import { FeedPage } from '@/pages/FeedPage';
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { UploadPage } from '@/pages/admin/Upload';
import { BulkUploadPage } from '@/pages/admin/BulkUpload';
import { AdminLayout } from '@/components/AdminLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={FeedPage} />
      
      {/* Admin Routes wrapped in Layout */}
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

      <Route>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-muted-foreground">Page not found</p>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
      <Toaster theme="dark" position="bottom-center" />
    </QueryClientProvider>
  );
}

export default App;
