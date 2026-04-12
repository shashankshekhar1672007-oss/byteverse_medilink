import styles from "../CSS/Consultation.module.css";

export default function IncomingCallBanner({ onAccept, onDecline, peerName }) {
  return (
    <div className={styles.incomingBanner}>
      <div className={styles.incomingInfo}>
        <div className={styles.ringPulse} />
        <div>
          <div className={styles.incomingTitle}>Incoming video call</div>
          <div className={styles.incomingFrom}>{peerName}</div>
        </div>
      </div>
      <div className={styles.incomingActions}>
        <button className={styles.declineBtn} onClick={onDecline} type="button">
          Decline
        </button>
        <button className={styles.acceptBtn} onClick={onAccept} type="button">
          Accept
        </button>
      </div>
    </div>
  );
}
