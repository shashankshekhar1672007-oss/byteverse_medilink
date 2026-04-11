import { useApp, PAGES } from "../../context/AppContext";
import styles from "./Sidebar.module.css";

const PATIENT_NAV_ITEMS = [
  { page: PAGES.DASHBOARD, label: "Dashboard", icon: GridIcon },
  { page: PAGES.DOCTORS, label: "Consult Doctor", icon: UserIcon },
  { page: PAGES.CONSULTATION_LIST, label: "Consultations", icon: MessageIcon },
  { page: PAGES.PRESCRIPTION_LIST, label: "Prescriptions", icon: FileIcon },
  { page: PAGES.RECORDS, label: "Health Records", icon: PlusSquareIcon },
  { page: PAGES.ORDERS, label: "Orders", icon: BoxIcon },
];

const DOCTOR_NAV_ITEMS = [
  { page: PAGES.DOCTOR_DASHBOARD, label: "Dashboard", icon: GridIcon },
  { page: PAGES.CREATE_PRESCRIPTION, label: "New Prescription", icon: PlusIcon },
  { page: PAGES.DOCTOR_PRESCRIPTIONS, label: "My Prescriptions", icon: FileIcon },
  { page: PAGES.CONSULTATION, label: "Consultations", icon: MessageIcon },
];

export default function Sidebar() {
  const { activePage, navigate, user, logout } = useApp();

  const NAV_ITEMS = user?.role === "doctor" ? DOCTOR_NAV_ITEMS : PATIENT_NAV_ITEMS;
  const showSOS = user?.role === "patient";

  return (
    <aside className={styles.sidebar}>
      <span className={styles.label}>Menu</span>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
          <button
            key={page}
            className={`${styles.navItem} ${activePage === page ? styles.active : ""}`}
            onClick={() => navigate(page)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      <div className={styles.spacer} />

      {showSOS && (
        <button className={styles.sosBtn} onClick={() => navigate(PAGES.SOS)}>
          <span className={styles.sosPulse} />
          SOS Emergency
        </button>
      )}

      <button className={styles.logoutBtn} onClick={logout}>
        <LogoutIcon />
        Logout
      </button>
    </aside>
  );
}

/* ── Icons ───────────────────────────────────────── */
function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function MessageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M14.5 4.5v5c0 1.1-.9 2-2 2h-1.5l-3 3-3-3h-1.5c-1.1 0-2-.9-2-2v-5c0-1.1.9-2 2-2h9c1.1 0 2 .9 2 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function PlusSquareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 4V2h6v2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M10 2H12a2 2 0 012 2v8a2 2 0 01-2 2h-2M6 12l4-4m0 0l-4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
