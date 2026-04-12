import { useState, useEffect } from "react";
import { useApp, PAGES } from "../../context/AppContext";
import { Button, StatCard, Spinner, ErrorMsg } from "../ui/UI";
import { doctors as doctorsApi } from "../../services/api";
import styles from "./CSS/DoctorDashboard.module.css";

export default function DoctorDashboard() {
  const { user, navigate } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await doctorsApi.getDashboard();
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

  const stats = data
    ? [
        {
          label: "Total Consultations",
          value: String(data.stats.total),
          sub: "All time",
          color: "#3ECF8E",
          positive: true,
        },
        {
          label: "Active Now",
          value: String(data.stats.active),
          sub: "In progress",
          color: "#4B9EFF",
          positive: null,
        },
        {
          label: "Completed",
          value: String(data.stats.completed),
          sub: "Finished",
          color: "#8B5CF6",
          positive: null,
        },
        {
          label: "Rating",
          value: data.stats.rating ? `${data.stats.rating} ★` : "N/A",
          sub: `${data.stats.ratingCount || 0} reviews`,
          color: "#F59E0B",
          positive: null,
        },
      ]
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Welcome, {user?.name} 👋</h1>
          <p className={styles.headerSubtitle}>
            Manage your consultations and prescriptions
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate(PAGES.CREATE_PRESCRIPTION)}
        >
          + New Prescription
        </Button>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>
      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionGrid}>
          <button
            className={styles.actionCard}
            onClick={() => navigate(PAGES.CREATE_PRESCRIPTION)}
          >
            <span className={styles.actionIcon}>📝</span>
            <div className={styles.actionText}>
              <div className={styles.actionTitle}>Create Prescription</div>
              <div className={styles.actionDesc}>Issue new prescription</div>
            </div>
          </button>
          <button
            className={styles.actionCard}
            onClick={() => navigate(PAGES.DOCTOR_PRESCRIPTIONS)}
          >
            <span className={styles.actionIcon}>📋</span>
            <div className={styles.actionText}>
              <div className={styles.actionTitle}>My Prescriptions</div>
              <div className={styles.actionDesc}>
                View all issued prescriptions
              </div>
            </div>
          </button>
          <button
            className={styles.actionCard}
            onClick={() => navigate(PAGES.CONSULTATION)}
          >
            <span className={styles.actionIcon}>💬</span>
            <div className={styles.actionText}>
              <div className={styles.actionTitle}>Consultations</div>
              <div className={styles.actionDesc}>View active consultations</div>
            </div>
          </button>
        </div>
      </div>
      <div className={styles.recentSection}>
        <h2 className={styles.sectionTitle}>Recent Consultations</h2>
        {!data?.recentConsultations?.length ? (
          <div className={styles.empty}>No consultations yet</div>
        ) : (
          <div className={styles.prescriptionsList}>
            {data.recentConsultations.map((c) => (
              <div key={c._id} className={styles.prescriptionItem}>
                <div className={styles.itemInfo}>
                  <div className={styles.itemTitle}>
                    {c.reason || "Consultation"}
                  </div>
                  <div className={styles.itemMeta}>
                    Patient: {c.patient?.userId?.name || "—"} ·{" "}
                    {new Date(c.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <button
                  className={styles.viewLink}
                  onClick={() =>
                    navigate(PAGES.CONSULTATION, { consultationId: c._id })
                  }
                >
                  View →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
