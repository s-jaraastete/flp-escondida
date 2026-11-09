import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { ToastProvider } from '@/contexts/ToastContext';
import { DataProvider } from '@/contexts/DataContext';
import { ConnectivityProvider } from '@/contexts/ConnectivityContext';
import { SessionProvider } from '@/contexts/SessionContext';
import { TourProvider } from '@/features/demo/TourContext';
import { DemoBar } from '@/features/demo/DemoBar';
import { RequireAuth, RoleGate } from './guards';
import Landing from '@/pages/shared/Landing';
import WebLogin from '@/pages/web/WebLogin';
import MobileLogin from '@/pages/mobile/MobileLogin';
import WebLayout from '@/layouts/WebLayout';
import MobileLayout from '@/layouts/MobileLayout';
// Web
import WebDashboard from '@/pages/web/Dashboard';
import ProjectsPage from '@/pages/web/Projects';
import ProjectDetailPage from '@/pages/web/ProjectDetail';
import CalendarPage from '@/pages/web/Calendar';
import SchedulingPage from '@/pages/web/Scheduling';
import RequestsPage from '@/pages/web/Requests';
import BookPage from '@/pages/web/Book';
import MyVisitsPage from '@/pages/web/MyVisits';
import WebVerificationPage from '@/pages/web/Verification';
import ActionsPage from '@/pages/web/Actions';
import UsersPage from '@/pages/web/Users';
import FlowPage from '@/pages/web/Flow';
// Móvil
import MobileHome from '@/pages/mobile/Home';
import MobileExplore from '@/pages/mobile/Explore';
import MobileProject from '@/pages/mobile/ProjectDetail';
import MobileBookSlot from '@/pages/mobile/BookSlot';
import MobileVisits from '@/pages/mobile/Visits';
import MobileVisitDetail from '@/pages/mobile/VisitDetail';
import MobileVerify from '@/pages/mobile/Verify';
import MobileActions from '@/pages/mobile/Actions';
import MobileProfile from '@/pages/mobile/Profile';
import MobileAgenda from '@/pages/mobile/Agenda';
import MobileSlotEditor from '@/pages/mobile/SlotEditor';
import MobileRequests from '@/pages/mobile/Requests';
import MobileActivities from '@/pages/mobile/Activities';

const W = 'web' as const;
const M = 'mobile' as const;

export default function App() {
  return (
    <ToastProvider>
      <ConnectivityProvider>
      <DataProvider>
        <SessionProvider>
          <HashRouter>
            <TourProvider>
            <DemoBar />
            <Routes>
              <Route path="/" element={<Landing />} />

              {/* ---------------- Plataforma Web ---------------- */}
              <Route path="/web/login" element={<WebLogin />} />
              <Route
                path="/web"
                element={
                  <RequireAuth experience={W}>
                    <WebLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<WebDashboard />} />
                <Route path="proyectos" element={<ProjectsPage />} />
                <Route path="proyectos/:id" element={<ProjectDetailPage />} />
                <Route path="calendario" element={<CalendarPage />} />
                <Route path="programacion" element={<RoleGate experience={W} roles={['admin', 'planner']}><SchedulingPage /></RoleGate>} />
                <Route path="solicitudes" element={<RoleGate experience={W} roles={['admin', 'planner']}><RequestsPage /></RoleGate>} />
                <Route path="reservar" element={<RoleGate experience={W} roles={['user']}><BookPage /></RoleGate>} />
                <Route path="mis-visitas" element={<RoleGate experience={W} roles={['user']}><MyVisitsPage /></RoleGate>} />
                <Route path="verificacion/:bookingId" element={<RoleGate experience={W} roles={['user']}><WebVerificationPage /></RoleGate>} />
                <Route path="acciones" element={<ActionsPage />} />
                <Route path="usuarios" element={<RoleGate experience={W} roles={['admin']}><UsersPage /></RoleGate>} />
                <Route path="flujo" element={<FlowPage />} />
                <Route path="*" element={<Navigate to="/web" replace />} />
              </Route>

              {/* ---------------- Aplicación Móvil ---------------- */}
              <Route path="/app/login" element={<MobileLogin />} />
              <Route
                path="/app"
                element={
                  <RequireAuth experience={M}>
                    <MobileLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<MobileHome />} />
                <Route path="explorar" element={<MobileExplore />} />
                <Route path="proyecto/:id" element={<MobileProject />} />
                <Route path="reservar/:slotId" element={<RoleGate experience={M} roles={['user']}><MobileBookSlot /></RoleGate>} />
                <Route path="visitas" element={<RoleGate experience={M} roles={['user']}><MobileVisits /></RoleGate>} />
                <Route path="visita/:bookingId" element={<RoleGate experience={M} roles={['user']}><MobileVisitDetail /></RoleGate>} />
                <Route path="verificar/:bookingId" element={<RoleGate experience={M} roles={['user']}><MobileVerify /></RoleGate>} />
                <Route path="acciones" element={<MobileActions />} />
                <Route path="perfil" element={<MobileProfile />} />
                <Route path="agenda" element={<RoleGate experience={M} roles={['planner', 'admin']}><MobileAgenda /></RoleGate>} />
                <Route path="disponibilidad/nueva" element={<RoleGate experience={M} roles={['planner', 'admin']}><MobileSlotEditor /></RoleGate>} />
                <Route path="disponibilidad/:slotId" element={<RoleGate experience={M} roles={['planner', 'admin']}><MobileSlotEditor /></RoleGate>} />
                <Route path="solicitudes" element={<RoleGate experience={M} roles={['planner', 'admin']}><MobileRequests /></RoleGate>} />
                <Route path="actividades" element={<RoleGate experience={M} roles={['admin', 'planner']}><MobileActivities /></RoleGate>} />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TourProvider>
          </HashRouter>
        </SessionProvider>
      </DataProvider>
      </ConnectivityProvider>
    </ToastProvider>
  );
}
