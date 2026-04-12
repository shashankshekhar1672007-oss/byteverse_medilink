import styles from "../CSS/Consultation.module.css";

export default function ConsultationHeader({ peerName, socketReady, specialization }) {
  return (
    <div className={styles.greeting}>
      <h1>Live Consultation</h1>
      <p className={styles.greetingSub}>
        {socketReady ? (
          <>
            <span className={styles.liveIndicator}>●</span> Connected with{" "}
            {peerName}
            {specialization ? ` · ${specialization}` : ""}
          </>
        ) : (
          `Connecting to ${peerName}...`
        )}
      </p>
    </div>
  );
}
