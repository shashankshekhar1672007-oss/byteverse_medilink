import { useState, useEffect } from "react";
import { useApp, PAGES } from "../../context/AppContext";
import { Button, Spinner, ErrorMsg } from "../ui/UI";
import { prescriptions as rxApi } from "../../services/api";
import styles from "./CSS/DoctorPrescriptions.module.css";

const getStatusClassName = (status) =>
  ({
    active: styles.statusActive,
    expired: styles.statusExpired,
    revoked: styles.statusCancelled,
    cancelled: styles.statusCancelled,
  })[status] || styles.statusDefault;

export default function DoctorPrescriptions() {
  const { navigate, showToast } = useApp();
  const [rxList, setRxList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [revoking, setRevoking] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await rxApi.getDoctorList();
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

  const handleRevoke = async (id) => {
    if (!confirm("Revoke this prescription?")) return;
    setRevoking(id);
    try {
      await rxApi.updateStatus(id, "cancelled");
      setRxList((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: "cancelled" } : r)),
      );
      showToast("Prescription cancelled");
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setRevoking(null);
    }
  };

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
            Manage all your issued prescriptions
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate(PAGES.CREATE_PRESCRIPTION)}
        >
          + Create New
        </Button>
      </div>
      <div className={styles.filterBar}>
        {["all", "active", "expired", "cancelled"].map((f) => (
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
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📋</span>
            <p>No prescriptions found</p>
          </div>
        ) : (
          filtered.map((rx) => {
            const patName = rx.createdFor?.userId?.name || "Patient";
            return (
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
                      • Patient: {patName}
                    </div>
                  </div>
                  <div
                    className={`${styles.status} ${getStatusClassName(rx.status)}`}
                  >
                    {rx.status}
                  </div>
                </div>
                <div
                  className={`${styles.cardContent} ${styles.cardContentSpacing}`}
                >
                  <div className={styles.medicines}>
                    <span className={`${styles.label} ${styles.labelHeading}`}>
                      Medicines ({rx.medicines?.length || 0})
                    </span>
                    <div
                      className={`${styles.medicineList} ${styles.medicineListWrap}`}
                    >
                      {(rx.medicines || []).slice(0, 2).map((m, i) => (
                        <span
                          key={i}
                          className={`${styles.medicineBadge} ${styles.medicineBadgePill}`}
                        >
                          💊 {m.name}
                        </span>
                      ))}
                      {(rx.medicines?.length || 0) > 2 && (
                        <span className={`${styles.more} ${styles.moreBadge}`}>
                          +{rx.medicines.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.details}>
                    <div className={`${styles.detail} ${styles.detailText}`}>
                      <span
                        className={`${styles.label} ${styles.detailLabelInline}`}
                      >
                        Expires:
                      </span>
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
                <div className={styles.actions}>
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate(PAGES.PRESCRIPTION, { prescriptionId: rx._id })
                    }
                  >
                    View Details
                  </Button>
                  {rx.status === "active" && (
                    <button
                      className={styles.revokeAction}
                      disabled={revoking === rx._id}
                      onClick={() => handleRevoke(rx._id)}
                    >
                      {revoking === rx._id ? "Revoking…" : "Revoke"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
