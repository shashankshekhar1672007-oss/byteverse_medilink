import { useEffect, useMemo, useState } from "react";
import { PAGES } from "../../../context/AppContext";
import { doctors as doctorsApi, patients as patientsApi } from "../../../services/api";
import { Button, ErrorMsg, Spinner } from "../../ui/UI";
import styles from "../CSS/Consultation.module.css";

const CURRENT_STATUSES = new Set(["pending", "active"]);

const getStatusClassName = (status) =>
  status === "active"
    ? styles.roomStatusActive
    : status === "pending"
      ? styles.roomStatusPending
      : styles.roomStatusDefault;

const formatDateTime = (value) => {
  if (!value) return "Time not available";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function CurrentConsultationsList({ navigate, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isDoctor = user?.role === "doctor";

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const api = isDoctor ? doctorsApi : patientsApi;
      const response = await api.getConsultations({ limit: 50 });
      setItems(response.data || []);
    } catch (e) {
      setError(e.message || "Could not load consultations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isDoctor]);

  const currentItems = useMemo(
    () => items.filter((item) => CURRENT_STATUSES.has(item.status)),
    [items],
  );

  const openRoom = (consultationId, startVideo = false) => {
    navigate(PAGES.CONSULTATION, {
      consultationId,
      mode: startVideo ? "call" : "chat",
      startVideo,
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <Spinner size={36} />
      </div>
    );
  }

  if (error) {
    return <ErrorMsg message={error} onRetry={load} />;
  }

  return (
    <div className={styles.roomListPage}>
      <div className={styles.greeting}>
        <div>
          <h1>Current Consultations</h1>
          <p>Select a consultation room to continue chat or start a video call.</p>
        </div>
        {!isDoctor && (
          <Button variant="primary" onClick={() => navigate(PAGES.DOCTORS)}>
            New Consultation
          </Button>
        )}
      </div>

      {currentItems.length === 0 ? (
        <div className={styles.roomEmpty}>
          <strong>No current consultations</strong>
          <span>
            Active and pending consultations will appear here with their time.
          </span>
        </div>
      ) : (
        <div className={styles.roomList}>
          {currentItems.map((consultation) => {
            const peer = isDoctor ? consultation.patient : consultation.doctor;
            const peerName =
              peer?.userId?.name || peer?.name || (isDoctor ? "Patient" : "Doctor");
            const detail = isDoctor
              ? "Patient"
              : consultation.doctor?.specialization || "Doctor";
            const time = consultation.startedAt || consultation.createdAt;
            const isActive = consultation.status === "active";

            return (
              <article key={consultation._id} className={styles.roomCard}>
                <div className={styles.roomMain}>
                  <div className={styles.roomTitleRow}>
                    <h2>{peerName}</h2>
                    <span
                      className={`${styles.roomStatus} ${getStatusClassName(
                        consultation.status,
                      )}`}
                    >
                      {consultation.status}
                    </span>
                  </div>
                  <p>{consultation.reason || "General consultation"}</p>
                  <div className={styles.roomMeta}>
                    <span>{detail}</span>
                    <span>{formatDateTime(time)}</span>
                  </div>
                </div>
                <div className={styles.roomActions}>
                  <Button
                    variant={isActive ? "outline" : "primary"}
                    onClick={() => openRoom(consultation._id)}
                  >
                    Chat
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!isActive}
                    onClick={() => openRoom(consultation._id, true)}
                  >
                    Video Call
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
