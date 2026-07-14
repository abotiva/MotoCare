import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { MainLayout } from './layouts/MainLayout'
import { LandingPage } from './pages/LandingPage'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { Map } from './pages/Map'
import { RouteDetail } from './pages/RouteDetail'
import { Marketplace } from './pages/Marketplace'
import { PremiumRoutes } from './pages/PremiumRoutes'
import { Messages } from './pages/Messages'
import { Clubs } from './pages/Clubs'
import { Profile } from './pages/Profile'
import { MyBikes } from './pages/MyBikes'
import { Settings } from './pages/Settings'
import { Admin } from './pages/Admin'
import { Notifications } from './pages/Notifications'
import { ProtectedRoute } from './components/ProtectedRoute'
import { InstallPrompt } from './components/InstallPrompt'
import { Toaster } from './components/ui/sonner'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page - página pública */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        
        {/* App Routes - con navegacion principal */}
        <Route path="/app" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="explore" element={<Navigate to="/app/home" replace />} />
          <Route path="map" element={<Map />} />
          <Route path="routes/:routeId" element={<RouteDetail />} />
          <Route path="premium-routes" element={<PremiumRoutes />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="messages" element={<Messages />} />
          <Route path="community" element={<Navigate to="/app/messages" replace />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="profile" element={<Profile />} />
          <Route path="my-bikes" element={<MyBikes />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/app/home" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App
