import { useState, useEffect } from 'react';
import { AuthScreen } from '@/components/AuthScreen';
import { HomeFeed } from '@/components/HomeFeed';
import { BiddingScreen } from '@/components/BiddingScreen';
import { PostLivestock } from '@/components/PostLivestock';
import { MyListings } from '@/components/MyListings';
import { Notifications } from '@/components/Notifications';
import { BottomNavigation } from '@/components/BottomNavigation';
import { PaymentStatus } from '@/components/PaymentStatus';
import { PaymentHistory } from '@/components/PaymentHistory';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { LivestockItem } from './types';
import { Helmet } from 'react-helmet';

export default function App() {
  const { isAuthenticated, user, isLoading, checkAuth } = useAuthStore();
  const { theme, setTheme } = useAppStore();
  const [currentTab, setCurrentTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'bidding'>('main');
  const [selectedLivestock, setSelectedLivestock] = useState<LivestockItem | null>(null);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  // Initialize auth
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // detect paynow return URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference') || params.get('merchant_reference');
    if (ref) {
      setPaymentReference(ref);
    }
  }, []);

  // Initialize theme on app start
  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  const handleLogin = () => {
    // Login is handled by the auth store
  };

  const handleItemClick = (item: LivestockItem) => {
    setSelectedLivestock(item);
    setCurrentScreen('bidding');
  };

  const handleBackToMain = () => {
    setCurrentScreen('main');
    setSelectedLivestock(null);
  };

  const handleClearPayment = () => {
    setPaymentReference(null);
    // Clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete('reference');
    url.searchParams.delete('merchant_reference');
    window.history.replaceState({}, '', url.pathname);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // if we were redirected from Paynow show a status page instead of the app
  if (paymentReference) {
    return (
      <PaymentStatus
        reference={paymentReference}
        onBack={handleClearPayment}
      />
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (currentScreen === 'bidding' && selectedLivestock) {
    return (
      <BiddingScreen
        onBack={handleBackToMain}
        livestockItem={selectedLivestock}
      />
    );
  }

  const renderCurrentTab = () => {
    switch (currentTab) {
      case 'home':
        return <HomeFeed onItemClick={handleItemClick} />;
      case 'post':
        return <PostLivestock onBack={() => setCurrentTab('home')} />;
      case 'listings':
        return <MyListings />;
      case 'notifications':
        return <Notifications />;
      case 'payments':
        return <PaymentHistory />;
      default:
        return <HomeFeed onItemClick={handleItemClick} />;
    }
  };

  return (
    <>
      <Helmet>
        <title>ZimLivestock - Zimbabwe's Premier Livestock Marketplace</title>
        <meta name="description" content="Connect with farmers across Zimbabwe to buy and sell livestock through our secure auction platform. Cattle, goats, sheep, pigs, and chickens." />
        <meta name="keywords" content="livestock, zimbabwe, farming, cattle, goats, sheep, pigs, chickens, auction, marketplace" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="ZimLivestock - Zimbabwe's Premier Livestock Marketplace" />
        <meta property="og:description" content="Connect with farmers across Zimbabwe to buy and sell livestock through our secure auction platform." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ZimLivestock - Zimbabwe's Premier Livestock Marketplace" />
        <meta name="twitter:description" content="Connect with farmers across Zimbabwe to buy and sell livestock through our secure auction platform." />
      </Helmet>
      <div className="min-h-screen bg-background">
        {renderCurrentTab()}
        <BottomNavigation
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          notificationCount={3}
          messageCount={2}
        />
      </div>
    </>
  );
}
