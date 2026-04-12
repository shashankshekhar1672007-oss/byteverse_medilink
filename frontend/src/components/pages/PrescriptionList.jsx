import { useState, useEffect } from "react";
import { useApp, PAGES } from "../../context/AppContext";
import { Button, Spinner, ErrorMsg } from "../ui/UI";
import { patients as patientsApi } from "../../services/api";
import styles from "./CSS/PrescriptionList.module.css";

const getStatusClassName = (status) =>
  ({
    active: styles.statusActive,
    expired: styles.statusExpired,
    revoked: styles.statusCancelled,
    cancelled: styles.statusCancelled,
  })[status] || styles.statusDefault;

export default function PrescriptionList() {
  const { navigate } = useApp();
  const [rxList, setRxList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await patientsApi.getPrescriptions();
      setRxList(r.data || []);
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
    filter === "all" ? rxList : rxList.filter((r) => r.status === filter);
  const count = (s) => rxList.filter((r) => r.status === s).length;

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
          <h1 className={styles.headerTitle}>My Prescriptions</h1>
          <p className={styles.headerSubtitle}>
            View and manage your prescriptions
          </p>
        </div>
      </div>

      <div className={styles.filterBar}>
        {["all", "active", "expired"].map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} (
            {f === "all" ? rxList.length : count(f)})
          </button>
        ))}
      </div>

      <div className={`${styles.prescriptionsList} ${styles.listSpacing}`}>
        {filtered.length === 0 && (
          <p className={styles.emptyText}>No prescriptions found.</p>
        )}

        {filtered.map((rx) => (
          <div key={rx._id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardInfo}>
                <div className={styles.diagnosis}>{rx.diagnosis}</div>
                <div className={styles.meta}>
                  {new Date(rx.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  • Prescribed by Dr.{" "}
                  {rx.createdBy?.userId?.name?.replace("Dr. ", "") || "Doctor"}
                </div>
              </div>
              <div
                className={`${styles.status} ${getStatusClassName(rx.status)}`}
              >
                {rx.status}
              </div>
            </div>

            <div className={`${styles.cardContent} ${styles.contentSpacing}`}>
              <div className={styles.medicines}>
                <div className={`${styles.label} ${styles.labelHeading}`}>
                  Medicines
                </div>
                <div className={styles.medicineItems}>
                  {(rx.medicines || []).map((m, i) => (
                    <div key={i} className={styles.medicineItem}>
                      <div className={styles.medicineName}>💊 {m.name}</div>
                      <div className={styles.medicineMeta}>
                        {m.dosage} • {m.frequency} • {m.duration}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.expiryRow}>
                  <span className={styles.expiryLabel}>Expires:</span>
                  <span>
                    {rx.expiresAt
                      ? new Date(rx.expiresAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {rx.advice && (
              <div className={styles.instructions}>
                <strong>Instructions:</strong> {rx.advice}
              </div>
            )}

            <div className={styles.actions}>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(PAGES.PRESCRIPTION, { prescriptionId: rx._id })
                }
              >
                View More
              </Button>
              <Button
                variant="primary"
                disabled={rx.status !== "active"}
                onClick={() => {
                  if (rx.status === "active") {
                    navigate(PAGES.ORDERS);
                  }
                }}
              >
                Order Medicine
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
