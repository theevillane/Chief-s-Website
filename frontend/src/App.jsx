import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

// Pages
import HomePage           from './pages/HomePage';
import LoginPage          from './pages/LoginPage';
import RegisterPage       from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import RequestLetterPage  from './pages/RequestLetterPage';
import ReportDisputePage  from './pages/ReportDisputePage';
import ReportSecurityPage from './pages/ReportSecurityPage';
import ReportIllicitPage  from './pages/ReportIllicitPage';
import AnnouncementsPage  from './pages/AnnouncementsPage';
import CitizenDashboard   from './pages/CitizenDashboard';
import AdminDashboard     from './pages/AdminDashboard';
import AboutPage          from './pages/AboutPage';
import VerifyPhonePage    from './pages/VerifyPhonePage';
import ContactPage        from './pages/ContactPage';
import HelpFAQPage        from './pages/HelpFAQPage';
import TermsPage          from './pages/TermsPage';
import PrivacyPolicyPage  from './pages/PrivacyPolicyPage';
import AccountSettingsPage from './pages/AccountSettingsPage';

// Shared layout
import Topbar             from './components/Topbar';
import SiteFooter         from './components/SiteFooter';

const NON_FOOTER_PAGES  = ['admin', 'home'];
const NON_FOOTER_ROUTES = new Set(NON_FOOTER_PAGES);

export default function App() {
  const { user, isAdmin, logout } = useAuth();
  const [page, setPage] = useState('home');

  // Redirect authenticated users away from login; admins off citizen dashboard
  useEffect(() => {
    if (!user) return;
    if (page === 'login') {
      setPage(isAdmin ? 'admin' : 'dashboard');
      return;
    }
    if (page === 'forgot_password') {
      setPage(isAdmin ? 'admin' : 'dashboard');
      return;
    }
    // Successful OTP on VerifyPhonePage sets user — close the OTP screen
    if (page === 'verify_phone') {
      setPage(isAdmin ? 'admin' : 'dashboard');
      return;
    }
    if (page === 'dashboard' && isAdmin) {
      setPage('admin');
    }
  }, [user, page, isAdmin]);

  // Guard protected pages
  const navigate = (p) => {
    const protectedPages = ['dashboard', 'request_letter', 'report_dispute'];
    if (protectedPages.includes(p) && !user) {
      setPage('login');
      return;
    }
    if (p === 'admin' && user && !isAdmin) {
      setPage('dashboard');
      return;
    }
    if (p === 'dashboard' && user && isAdmin) {
      setPage('admin');
      return;
    }
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    const props = { setPage: navigate, user };
    switch (page) {
      case 'home':            return <HomePage          {...props} />;
      case 'login':           return <LoginPage         {...props} />;
      case 'register':        return <RegisterPage      {...props} />;
      case 'forgot_password': return <ForgotPasswordPage {...props} />;
      case 'verify_phone':    return <VerifyPhonePage   {...props} />;
      case 'request_letter':  return <RequestLetterPage {...props} />;
      case 'report_dispute':  return <ReportDisputePage {...props} />;
      case 'report_security': return <ReportSecurityPage {...props} />;
      case 'report_illicit':  return <ReportIllicitPage  {...props} />;
      case 'announcements':   return <AnnouncementsPage  {...props} />;
      case 'dashboard':       return user ? <CitizenDashboard {...props} /> : <LoginPage {...props} />;
      case 'admin':           return isAdmin ? <AdminDashboard {...props} /> : <LoginPage {...props} />;
      case 'about':           return <AboutPage          {...props} />;
      case 'contact':         return <ContactPage        {...props} />;
      case 'help_faq':        return <HelpFAQPage        {...props} />;
      case 'terms':           return <TermsPage          {...props} />;
      case 'privacy':         return <PrivacyPolicyPage  {...props} />;
      case 'account':         return <AccountSettingsPage {...props} />;
      default:                return <HomePage          {...props} />;
    }
  };

  const handleLogout = async () => {
    await logout();
    setPage('home');
  };

  return (
    <div>
      <Topbar page={page} setPage={navigate} onLogout={handleLogout} />
      <div style={{ minHeight: 'calc(100vh - 60px)' }}>
        {renderPage()}
        {!NON_FOOTER_ROUTES.has(page) && <SiteFooter setPage={navigate} />}
      </div>
    </div>
  );
}
