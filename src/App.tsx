import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import Layout from './components/Layout';
import WelcomeModal from './components/WelcomeModal';
import GiftNotification from './components/GiftNotification';
import ServerStatusGuard from './components/ServerStatusGuard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import InfluenceMap from './pages/Map';
import Properties from './pages/Properties';
import Market from './pages/Market';
import Crimes from './pages/Crimes';
import Trade from './pages/Trade';
import Bank from './pages/Bank';
import Character from './pages/Character';
import Casino from './pages/Casino';
import Gangs from './pages/Gangs';
import Hospital from './pages/Hospital';
import Gym from './pages/Gym';
import Inventory from './pages/Inventory';
import Police from './pages/Police';
import Airport from './pages/Airport';
import Government from './pages/Government';
import PMOffice from './pages/PMOffice';
import MinisterOffice from './pages/MinisterOffice';
import Family from './pages/Family';
import Bounties from './pages/Bounties';
import Heists from './pages/Heists';
import Attack from './pages/Attack';
import Admin from './pages/Admin';
import Messages from './pages/Messages';
import Prison from './pages/Prison';
import Players from './pages/Players';
import DailyReward from './pages/DailyReward';
import MafiaStreets from './pages/MafiaStreets';
import CityMall from './pages/CityMall';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuthStore();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-red-500 font-bold animate-pulse text-xl">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (!profile) return <Navigate to="/login" />;

  // Force redirect to prison if imprisoned
  if (profile.isImprisoned && location.pathname !== '/prison') {
    return <Navigate to="/prison" />;
  }
  
  return <Layout>{children}</Layout>;
};

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <ServerStatusGuard>
      <BrowserRouter>
        <Toaster 
          position="top-center" 
          dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} 
          toastOptions={{
            className: 'bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-3xl text-white font-medium px-6 py-4 flex items-center gap-4',
            descriptionClassName: 'text-white/70 text-sm mt-1',
          }}
        />
        <WelcomeModal />
        <GiftNotification />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/mafia-streets" element={<PrivateRoute><MafiaStreets /></PrivateRoute>} />
          <Route path="/daily-reward" element={<PrivateRoute><DailyReward /></PrivateRoute>} />
          <Route path="/city-mall" element={<PrivateRoute><CityMall /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/character" element={<PrivateRoute><Character /></PrivateRoute>} />
          <Route path="/map" element={<PrivateRoute><InfluenceMap /></PrivateRoute>} />
          <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
          <Route path="/market" element={<PrivateRoute><Market /></PrivateRoute>} />
          <Route path="/crimes" element={<PrivateRoute><Crimes /></PrivateRoute>} />
          <Route path="/trade" element={<PrivateRoute><Trade /></PrivateRoute>} />
          <Route path="/bank" element={<PrivateRoute><Bank /></PrivateRoute>} />
          <Route path="/casino" element={<PrivateRoute><Casino /></PrivateRoute>} />
          <Route path="/gangs" element={<PrivateRoute><Gangs /></PrivateRoute>} />
          <Route path="/hospital" element={<PrivateRoute><Hospital /></PrivateRoute>} />
          <Route path="/gym" element={<PrivateRoute><Gym /></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
          <Route path="/police" element={<PrivateRoute><Police /></PrivateRoute>} />
          <Route path="/airport" element={<PrivateRoute><Airport /></PrivateRoute>} />
          <Route path="/government" element={<PrivateRoute><Government /></PrivateRoute>} />
          <Route path="/pm-office" element={<PrivateRoute><PMOffice /></PrivateRoute>} />
          <Route path="/minister-office" element={<PrivateRoute><MinisterOffice /></PrivateRoute>} />
          <Route path="/family" element={<PrivateRoute><Family /></PrivateRoute>} />
          <Route path="/bounties" element={<PrivateRoute><Bounties /></PrivateRoute>} />
          <Route path="/heists" element={<PrivateRoute><Heists /></PrivateRoute>} />
          <Route path="/prison" element={<PrivateRoute><Prison /></PrivateRoute>} />
          <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
          <Route path="/players" element={<PrivateRoute><Players /></PrivateRoute>} />
          <Route path="/attack/:id" element={<PrivateRoute><Attack /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ServerStatusGuard>
  );
}

export default App;
