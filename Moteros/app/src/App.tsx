import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { MainLayout } from './layouts/MainLayout'
import { LandingPage } from './pages/LandingPage'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { Explore } from './pages/Explore'
import { Map } from './pages/Map'
import { Marketplace } from './pages/Marketplace'
import { Messages } from './pages/Messages'
import { Clubs } from './pages/Clubs'
import { Profile } from './pages/Profile'
import { MyBikes } from './pages/MyBikes'
import { Settings } from './pages/Settings'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Toaster } from './components/ui/sonner'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page - Página pública */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        
        {/* App Routes - Con navegación principal */}
        <Route path="/app" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="explore" element={<Explore />} />
          <Route path="map" element={<Map />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="messages" element={<Messages />} />
          <Route path="clubs" element={<Clubs />} />
          <Route path="profile" element={<Profile />} />
          <Route path="my-bikes" element={<MyBikes />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App
