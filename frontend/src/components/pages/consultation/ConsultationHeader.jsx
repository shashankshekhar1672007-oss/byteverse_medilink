import styles from "../CSS/Consultation.module.css";

export default function ConsultationHeader({
  accepting,
  canAccept,
  consultationStatus,
  isActive,
  onAccept,
  peerName,
  socketReady,
  specialization,
}) {
  const statusText =
    consultationStatus === "pending"
      ? "Waiting for doctor acceptance"
      : consultationStatus
        ? consultationStatus.charAt(0).toUpperCase() +
          consultationStatus.slice(1)
        : "Connecting";

  return (
    <div className={styles.greeting}>
      <div>
        <h1>{isActive ? "Live Consultation" : "Consultation Request"}</h1>
        <p className={styles.greetingSub}>
          {socketReady ? (
            <>
              <span className={styles.liveIndicator}>●</span> Connected with{" "}
              {peerName}
              {specialization ? ` · ${specialization}` : ""} · {statusText}
            </>
          ) : (
            `Connecting to ${peerName}...`
          )}
        </p>
      </div>

      {canAccept && (
        <button
          className={styles.acceptConsultationBtn}
          onClick={onAccept}
          disabled={accepting}
          type="button"
        >
          {accepting ? "Accepting..." : "Accept Consultation"}
        </button>
      )}
    </div>
  );
}
