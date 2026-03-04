import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ScanReport from './pages/ScanReport';

import MedsQuery from './pages/MedsQuery';
import Scheduler from './pages/Scheduler';
import Settings from './pages/Settings';
import FamilyProfiles from './pages/FamilyProfiles';
import FoodLens from './pages/FoodLens';
import HealthExpenses from './pages/HealthExpenses';
import FirstAid from './pages/FirstAid';
import Emergency from './pages/Emergency';
import AppLayout from './components/AppLayout';
import { useAuthState } from './hooks/useAuth';

// Family Profile Context
const ProfileContext = createContext();

export function useProfile() {
  return useContext(ProfileContext);
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthState();

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
}

// Settings Context
const SettingsContext = createContext();

export function useSettings() {
  return useContext(SettingsContext);
}

function App() {
  const { user } = useAuthState();
  const [currentProfile, setCurrentProfile] = useState(null); // null = Main User
  const [familyMembers, setFamilyMembers] = useState([]); // Shared Family State

  // Settings State
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('English');

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Reset profile on logout/login & Fetch Family
  useEffect(() => {
    if (user) {
      setCurrentProfile({ id: user.uid, name: user.displayName || 'User', isMain: true });

      const fetchFamily = async () => {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFamilyMembers(docSnap.data().family || []);
        }
      };
      fetchFamily();
    } else {
      setFamilyMembers([]);
    }
  }, [user]);

  return (
    <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage }}>
      <ProfileContext.Provider value={{ currentProfile, setCurrentProfile, familyMembers, setFamilyMembers }}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Main App Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="report" element={<ScanReport />} />

              <Route path="meds" element={<MedsQuery />} />
              <Route path="food" element={<FoodLens />} />
              <Route path="expenses" element={<HealthExpenses />} />
              <Route path="scheduler" element={<Scheduler />} />
              <Route path="first-aid" element={<FirstAid />} />
              <Route path="emergency" element={<Emergency />} />
              <Route path="family" element={<FamilyProfiles />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </ProfileContext.Provider>
    </SettingsContext.Provider>
  );
}

export default App;
