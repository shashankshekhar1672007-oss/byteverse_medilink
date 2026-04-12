import styles from "./UI.module.css";

/* ── Badge ─────────────────────────────────────── */
export function Badge({ type = "default", children }) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${type}`]}`}>
      {children}
    </span>
  );
}

/* ── StatusBadge (online / offline) ────────────── */
export function StatusBadge({ online }) {
  return (
    <span
      className={`${styles.statusBadge} ${online ? styles.online : styles.offline}`}
    >
      <span className={styles.statusDot} />
      {online ? "Online" : "Offline"}
    </span>
  );
}

/* ── Avatar / Initials circle ───────────────────── */
export function Avatar({ initials, color = "#3ECF8E", size = 38 }) {
  return (
    <div
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        color,
        fontSize: size * 0.34,
        borderRadius: size * 0.26,
      }}
    >
      {initials}
    </div>
  );
}

/* ── Button variants ────────────────────────────── */
export function Button({
  variant = "primary",
  onClick,
  disabled,
  children,
  fullWidth,
  className = "",
  type,
}) {
  return (
    <button
      className={`${styles.btn} ${styles[`btn_${variant}`]} ${fullWidth ? styles.fullWidth : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}

/* ── Stat Card ──────────────────────────────────── */
export function StatCard({ label, value, sub, color, positive }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ color }}>
        {value}
      </div>
      <div
        className={`${styles.statSub} ${
          positive === true
            ? styles.statUp
            : positive === false
              ? styles.statDown
              : ""
        }`}
      >
        {sub}
      </div>
    </div>
  );
}

/* ── Section Header ─────────────────────────────── */
export function SectionHeader({ title, action, onAction }) {
  return (
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {action && (
        <span className={styles.sectionAction} onClick={onAction}>
          {action}
        </span>
      )}
    </div>
  );
}

/* ── Icon Button ────────────────────────────────── */
export function IconBtn({
  children,
  badge,
  onClick,
  title,
  ariaLabel,
  active,
  className = "",
}) {
  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${active ? styles.iconBtnActive : ""} ${className}`}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
    >
      {children}
      {badge && <span className={styles.iconBadge} />}
    </button>
  );
}

export function Spinner({ size = 28 }) {
  return (
    <div
      className={styles.spinner}
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, size * 0.1),
      }}
    />
  );
}

export function ErrorMsg({ message, onRetry }) {
  return (
    <div className={styles.errorMsg}>
      <span>⚠ {message}</span>
      {onRetry && (
        <button className={styles.retryBtn} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "📭", title, subtitle, action, onAction }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <div className={styles.emptyTitle}>{title}</div>
      {subtitle && <div className={styles.emptySub}>{subtitle}</div>}
      {action && (
        <Button variant="primary" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}
