import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import { LangProvider } from '@/lib/lang';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Catalog from '@/pages/Catalog';
import PrintOrders from '@/pages/PrintOrders';
import Stores from '@/pages/Stores';
import Deliveries from '@/pages/Deliveries';
import StoreDetail from '@/pages/StoreDetail';
import Sales from '@/pages/Sales';
import Returns from '@/pages/Returns';
import Payments from '@/pages/Payments';
import Preorders from '@/pages/Preorders';
import Towns from '@/pages/Towns';
import Packages from '@/pages/Packages';
import Expenses from '@/pages/Expenses';
import Rarity from '@/pages/Rarity';
import Settings from '@/pages/Settings';
import { isDesktop } from '@/lib/runtime';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {!isDesktop && <Route path="/login" element={<Login />} />}
      {!isDesktop && <Route path="/register" element={<Register />} />}
      {!isDesktop && <Route path="/forgot-password" element={<ForgotPassword />} />}
      {!isDesktop && <Route path="/reset-password" element={<ResetPassword />} />}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/print-orders" element={<PrintOrders />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/stores/:id" element={<StoreDetail />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/preorders" element={<Preorders />} />
          <Route path="/towns" element={<Towns />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/rarity" element={<Rarity />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const Router = isDesktop ? HashRouter : BrowserRouter;

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <LangProvider>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
        </LangProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App