import { useState, useEffect } from "react";
import { useApp, PAGES } from "../../context/AppContext";
import { Button, Spinner, ErrorMsg } from "../ui/UI";
import { patients as patientsApi } from "../../services/api";
import styles from "./CSS/ConsultationList.module.css";

const getStatusClassName = (status) =>
  ({
    completed: styles.statusCompleted,
    active: styles.statusActive,
    cancelled: styles.statusCancelled,
  })[status] || styles.statusDefault;

export default function ConsultationList() {
  const { navigate } = useApp();
  const [consultList, setConsultList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await patientsApi.getConsultations();
      setConsultList(r.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered =
    filter === "all"
      ? consultList
      : consultList.filter((c) => c.status === filter);
  const count = (s) => consultList.filter((c) => c.status === s).length;

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
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>My Consultations</h1>
          <p className={styles.headerSubtitle}>
            View and manage your past and active consultations
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate(PAGES.DOCTORS)}>
          + New Consultation
        </Button>
      </div>
      <div className={styles.filterBar}>
        {["all", "active", "completed"].map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} (
            {f === "all" ? consultList.length : count(f)})
          </button>
        ))}
      </div>
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>💬</span>
            <p>No consultations found</p>
          </div>
        ) : (
          filtered.map((c) => {
            const docName =
              c.doctor?.userId?.name || c.doctor?.name || "Doctor";
            const spec = c.doctor?.specialization || "Specialist";
            return (
              <div key={c._id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardInfo}>
                    <div className={styles.title}>
                      {c.reason || "General Consultation"}
                    </div>
                    <div className={styles.meta}>
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      • Dr. {docName.replace("Dr. ", "")} ({spec})
                    </div>
                  </div>
                  <div
                    className={`${styles.status} ${getStatusClassName(c.status)}`}
                  >
                    {c.status}
                  </div>
                </div>
                <div className={styles.actions}>
                  <Button
                    variant={c.status === "active" ? "primary" : "outline"}
                    onClick={() =>
                      navigate(PAGES.CONSULTATION, { consultationId: c._id })
                    }
                  >
                    {c.status === "active" ? "Join Call" : "View Details"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
