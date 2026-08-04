import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import './App.css'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RiderOnlyRoute } from './components/RiderOnlyRoute'
import { InstallPrompt } from './components/InstallPrompt'
import { Toaster } from './components/ui/sonner'

const MainLayout = lazy(() => import('./layouts/MainLayout').then((module) => ({ default: module.MainLayout })))
const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })))
const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })))
const SectionMenu = lazy(() => import('./pages/SectionMenu').then((module) => ({ default: module.SectionMenu })))
const Explore = lazy(() => import('./pages/Explore').then((module) => ({ default: module.Explore })))
const Map = lazy(() => import('./pages/Map').then((module) => ({ default: module.Map })))
const RouteDetail = lazy(() => import('./pages/RouteDetail').then((module) => ({ default: module.RouteDetail })))
const Marketplace = lazy(() => import('./pages/Marketplace').then((module) => ({ default: module.Marketplace })))
const PremiumRoutes = lazy(() => import('./pages/PremiumRoutes').then((module) => ({ default: module.PremiumRoutes })))
const Messages = lazy(() => import('./pages/Messages').then((module) => ({ default: module.Messages })))
const Clubs = lazy(() => import('./pages/Clubs').then((module) => ({ default: module.Clubs })))
const Profile = lazy(() => import('./pages/Profile').then((module) => ({ default: module.Profile })))
const BusinessProfile = lazy(() => import('./pages/BusinessProfile').then((module) => ({ default: module.BusinessProfile })))
const MyBikes = lazy(() => import('./pages/MyBikes').then((module) => ({ default: module.MyBikes })))
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })))
const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })))
const Notifications = lazy(() => import('./pages/Notifications').then((module) => ({ default: module.Notifications })))

function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-moto-dark text-moto-orange" role="status" aria-label="Cargando pantalla">
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          <Route path="/app" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="routes" element={<RiderOnlyRoute><SectionMenu kind="routes" /></RiderOnlyRoute>} />
            <Route path="community" element={<RiderOnlyRoute><SectionMenu kind="community" /></RiderOnlyRoute>} />
            <Route path="clubs" element={<RiderOnlyRoute><SectionMenu kind="clubs" /></RiderOnlyRoute>} />
            <Route path="explore" element={<RiderOnlyRoute><Explore /></RiderOnlyRoute>} />
            <Route path="map" element={<RiderOnlyRoute><Map /></RiderOnlyRoute>} />
            <Route path="routes/:routeId" element={<RiderOnlyRoute><RouteDetail /></RiderOnlyRoute>} />
            <Route path="premium-routes" element={<RiderOnlyRoute><PremiumRoutes /></RiderOnlyRoute>} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="messages" element={<RiderOnlyRoute><Messages /></RiderOnlyRoute>} />
            <Route path="clubs/manage" element={<RiderOnlyRoute><Clubs /></RiderOnlyRoute>} />
            <Route path="profile" element={<Profile />} />
            <Route path="business/:businessId" element={<BusinessProfile />} />
            <Route path="garage" element={<RiderOnlyRoute><MyBikes /></RiderOnlyRoute>} />
            <Route path="garage/:section" element={<RiderOnlyRoute><MyBikes /></RiderOnlyRoute>} />
            <Route path="garage/:bikeId/:section" element={<RiderOnlyRoute><MyBikes /></RiderOnlyRoute>} />
            <Route path="bikes" element={<RiderOnlyRoute><MyBikes /></RiderOnlyRoute>} />
            <Route path="bikes/:section" element={<RiderOnlyRoute><MyBikes /></RiderOnlyRoute>} />
            <Route path="bikes/:bikeId/:section" element={<RiderOnlyRoute><MyBikes /></RiderOnlyRoute>} />
            <Route path="my-bikes" element={<RiderOnlyRoute><MyBikes /></RiderOnlyRoute>} />
            <Route path="settings" element={<Settings />} />
            <Route path="plan" element={<Navigate to="/app/settings?section=plan" replace />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/app/home" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <InstallPrompt />
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App
