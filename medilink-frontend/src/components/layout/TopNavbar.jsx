import { useApp, PAGES } from "../../context/AppContext";
import { IconBtn } from "../ui/UI";
import styles from "./TopNavbar.module.css";
import logo from "../../assets/logo.png";

export default function TopNavbar() {
  const { notifications, user, navigate } = useApp();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const isDoctor = user?.role === "doctor";

  return (
    <header className={styles.navbar}>
      <div className={styles.logo}>
        <img src={logo} alt="MediLink logo" className={styles.logoImage} />
        {isDoctor && <span className={styles.badge}>Doctor</span>}
      </div>

      <div className={styles.search}>
        <SearchIcon />
        <input placeholder="Search symptoms, doctors, medicines…" />
      </div>

      <div className={styles.right}>
        <IconBtn badge={notifications > 0}>
          <BellIcon />
        </IconBtn>

      <button 
        className={styles.userInfo} 
        onClick={() => {
          console.log("Avatar clicked! Navigating to:", PAGES.PROFILE);
          navigate(PAGES.PROFILE);
        }}
        style={{ cursor: "pointer", background: "none", border: "none", display: "flex", alignItems: "center", padding: 0, textAlign: "left" }}
      >
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.userName}>{user?.name}</div>
        </button>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="#7A8694" strokeWidth="1.5" />
      <path d="M11 11l3 3" stroke="#7A8694" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1a5 5 0 015 5c0 3 1 4 2 5H1c1-1 2-2 2-5a5 5 0 015-5z" stroke="#7A8694" strokeWidth="1.3" />
      <path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="#7A8694" strokeWidth="1.3" />
    </svg>
  );
}
