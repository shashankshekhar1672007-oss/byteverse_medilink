import { useState, useEffect } from "react";
import { useApp, PAGES } from "../../context/AppContext";
import { StatCard, SectionHeader, Spinner, ErrorMsg } from "../ui/UI";
import { patients as patientsApi } from "../../services/api";
import styles from "./CSS/Dashboard.module.css";

export default function Dashboard() {
  const { navigate, user } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await patientsApi.getDashboard();
      setData(r.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Rahul";
  const currentDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const stats = data
    ? [
        {
          label: "Total Consultations",
          value: String(data.stats.totalConsultations),
          sub: "All time",
          color: "#3ECF8E",
          positive: true,
        },
        {
          label: "Active Prescriptions",
          value: String(data.stats.activePrescriptions),
          sub: "Currently active",
          color: "#F59E0B",
          positive: null,
        },
        {
          label: "Total Prescriptions",
          value: String(data.stats.totalPrescriptions),
          sub: "All time",
          color: "#4B9EFF",
          positive: null,
        },
      ]
    : [];

  if (loading)
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Spinner size={36} />
        </div>
      </div>
    );
  if (error)
    return (
      <div className={styles.page}>
        <ErrorMsg message={error} onRetry={load} />
      </div>
    );

  return (
    <div className={styles.page}>
      {/* Greeting */}
      <div className={styles.greeting}>
        <h1>Hello, {firstName} 👋</h1>
        <p>{currentDate} · How are you feeling today?</p>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Two-column grid */}
      <div className={styles.grid}>
        {/* Left column */}
        <div className={styles.left}>
          {/* Quick Actions */}
          <section>
            <SectionHeader title="Quick Actions" />
            <div className={styles.quickActions}>
              <QuickCard
                icon="🚨"
                title="SOS"
                subtitle="Emergency connect"
                variant="sos"
                onClick={() => navigate(PAGES.SOS)}
              />
              <QuickCard
                icon="👨‍⚕️"
                title="Consult"
                subtitle="Talk to a doctor now"
                iconBg="var(--primary-dim)"
                onClick={() => navigate(PAGES.DOCTORS)}
              />
              <QuickCard
                icon="💊"
                title="Orders"
                subtitle="Order & track"
                iconBg="var(--blue-dim)"
                onClick={() => navigate(PAGES.ORDERS)}
              />
              <QuickCard
                icon="📝"
                title="Prescription"
                subtitle="View & manage"
                iconBg="var(--accent-dim)"
                onClick={() => navigate(PAGES.PRESCRIPTION_LIST)}
              />
            </div>
          </section>

          {/* Recent Consultations */}
          <section>
            <SectionHeader
              title="Recent Consultations"
              action="View all"
              onAction={() => navigate(PAGES.CONSULTATION_LIST)}
            />
            {data?.recentConsultations?.length > 0 ? (
              data.recentConsultations.map((c) => (
                <ConsultationRow key={c._id} consultation={c} />
              ))
            ) : (
              <p className={styles.emptyText}>
                No consultations yet.{" "}
                <button className={styles.inlineAction} onClick={() => navigate(PAGES.DOCTORS)}>
                  Find a doctor →
                </button>
              </p>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className={styles.right}>
          <div className={`${styles.mapCard} ${styles.healthCard}`}>
            <div className={styles.mapHeader}>
              <h2>Health Profile</h2>
              <p>Your current vitals and details</p>
            </div>
            {data?.patient ? (
              <ProfileCard p={data.patient} />
            ) : (
              <div className={styles.mapEmpty}>
                <p className={styles.mapEmptyText}>
                  Complete your health profile.
                </p>
              </div>
            )}
          </div>

          {/* Pharmacies Map */}
          <div className={styles.mapCard}>
            <div className={styles.mapHeader}>
              <h2>Nearby Pharmacies</h2>
              <p>3 open pharmacies found</p>
            </div>
            <div className={styles.mapBody}>
              <div className={styles.mapGrid} />
              <span className={`${styles.mapDot} ${styles.you}`} />
              <span className={`${styles.mapDot} ${styles.p1}`} />
              <span className={`${styles.mapDot} ${styles.p2}`} />
              <span className={`${styles.mapDot} ${styles.p3}`} />
            </div>
            <div className={styles.pharmacyList}>
              {[
                { name: "Apollo Pharmacy", distance: "0.4 km" },
                { name: "MedPlus", distance: "0.9 km" },
                { name: "HealthKart", distance: "1.3 km" },
              ].map((p) => (
                <div key={p.name} className={styles.pharmacyRow}>
                  <span>{p.name}</span>
                  <span className={styles.dist}>{p.distance}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────── */

function QuickCard({ icon, title, subtitle, variant, iconBg, onClick }) {
  const iconClass =
    variant === "sos"
      ? styles.quickIconSos
      : iconBg === "var(--blue-dim)"
        ? styles.quickIconBlue
        : iconBg === "var(--accent-dim)"
          ? styles.quickIconAccent
          : styles.quickIconPrimary;
  return (
    <button
      className={`${styles.quickCard} ${variant === "sos" ? styles.sosCard : ""}`}
      onClick={onClick}
    >
      <span className={`${styles.quickIcon} ${iconClass}`}>{icon}</span>
      <div>
        <h3 className={variant === "sos" ? styles.quickTitleSos : ""}>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </button>
  );
}

function ConsultationRow({ consultation }) {
  const doc = consultation.doctor?.userId;
  const initials =
    doc?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "DR";
  const statusColor =
    consultation.status === "completed"
      ? "var(--primary)"
      : consultation.status === "active"
        ? "var(--blue)"
        : "var(--muted)";

  return (
    <div className={styles.consultRow}>
      <div className={`${styles.docAvatar} ${styles.docAvatarAccent}`}>
        {initials}
      </div>
      <div className={styles.docInfo}>
        <div className={styles.docName}>{doc?.name || "Doctor"}</div>
        <div className={styles.docSpec}>
          {consultation.doctor?.specialization} ·{" "}
          {consultation.reason || "Consultation"}
        </div>
      </div>
      <div className={styles.consultMeta}>
        <span className={styles.consultDate}>
          {new Date(consultation.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </span>
        <span
          className={`${styles.consultDot} ${styles[`consultDot_${consultation.status}`] || styles.consultDot_default}`}
        />
      </div>
    </div>
  );
}

function ProfileCard({ p }) {
  return (
    <div className={styles.pharmacyList}>
      {p.bloodGroup && (
        <div className={styles.pharmacyRow}>
          <span>Blood Group</span>
          <span className={styles.dist}>{p.bloodGroup}</span>
        </div>
      )}
      {p.age && (
        <div className={styles.pharmacyRow}>
          <span>Age</span>
          <span className={styles.dist}>{p.age} yrs</span>
        </div>
      )}
      {p.bmi && (
        <div className={styles.pharmacyRow}>
          <span>BMI</span>
          <span className={styles.dist}>{p.bmi}</span>
        </div>
      )}
      {p.allergies?.length > 0 && (
        <div className={styles.pharmacyRow}>
          <span>Allergies</span>
          <span className={styles.dist}>{p.allergies.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
