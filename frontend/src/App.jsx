import Profile from "./components/pages/Profile";
import { AppProvider, useApp, PAGES } from "./context/AppContext";
import AppShell from "./components/layout/AppShell";
import DoctorShell from "./components/layout/DoctorShell";
import IncomingCallNotice from "./components/layout/IncomingCallNotice";
import Login from "./components/pages/Login";
import Dashboard from "./components/pages/Dashboard";
import DoctorDashboard from "./components/pages/DoctorDashboard";
import DoctorList from "./components/pages/DoctorList";
import Consultation from "./components/pages/Consultation";
import Prescription from "./components/pages/Prescription";
import PrescriptionList from "./components/pages/PrescriptionList";
import ConsultationList from "./components/pages/ConsultationList";
import CreatePrescription from "./components/pages/CreatePrescription";
import DoctorPrescriptions from "./components/pages/DoctorPrescriptions";
import HealthRecords from "./components/pages/HealthRecords";
import Orders from "./components/pages/Orders";
import SOSPage from "./components/pages/SOSPage";
import AdminDashboard from "./components/pages/AdminDashboard";
import ChatbotWidget from "./components/ui/ChatbotWidget";
import Toast from "./components/ui/Toast";
import "./styles/globals.css";

function PageRouter() {
  const { activePage, user } = useApp();
  if (user?.role === "admin") {
    const adminPages = {
      [PAGES.ADMIN_DASHBOARD]: <AdminDashboard />,
      [PAGES.PROFILE]: <Profile />,
    };
    return adminPages[activePage] ?? <AdminDashboard />;
  }
  if (user?.role === "doctor") {
    const doctorPages = {
      [PAGES.DOCTOR_DASHBOARD]: <DoctorDashboard />,
      [PAGES.CREATE_PRESCRIPTION]: <CreatePrescription />,
      [PAGES.DOCTOR_PRESCRIPTIONS]: <DoctorPrescriptions />,
      [PAGES.CONSULTATION]: <Consultation />,
      [PAGES.PRESCRIPTION]: <Prescription />,
      [PAGES.PROFILE]: <Profile />,
    };
    return doctorPages[activePage] ?? <DoctorDashboard />;
  }
  const patientPages = {
    [PAGES.DASHBOARD]: <Dashboard />,
    [PAGES.DOCTORS]: <DoctorList />,
    [PAGES.CONSULTATION]: <Consultation />,
    [PAGES.PRESCRIPTION]: <Prescription />,
    [PAGES.PRESCRIPTION_LIST]: <PrescriptionList />,
    [PAGES.CONSULTATION_LIST]: <ConsultationList />,
    [PAGES.RECORDS]: <HealthRecords />,
    [PAGES.ORDERS]: <Orders />,
    [PAGES.SOS]: <SOSPage />,
    [PAGES.PROFILE]: <Profile />,
  };
  return patientPages[activePage] ?? <Dashboard />;
}

function AppContent() {
  const { isAuthenticated, loading, user, toast } = useApp();
  if (loading)
    return (
      <div className="spinner-page">
        <div className="spinner" />
      </div>
    );
  if (!isAuthenticated) return <Login />;
  const Shell = user?.role === "doctor" ? DoctorShell : AppShell;
  return (
    <Shell>
      <IncomingCallNotice />
      <PageRouter />
      {toast && <Toast message={toast.message} type={toast.type} />}
      <ChatbotWidget />
    </Shell>
  );
}

export default function App() {
  return (
    <div className="light-theme">
      <AppProvider>
        <AppContent />
      </AppProvider>
    </div>
  );
}
