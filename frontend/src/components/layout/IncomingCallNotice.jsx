import { useApp } from "../../context/AppContext";
import styles from "./IncomingCallNotice.module.css";

export default function IncomingCallNotice() {
  const {
    incomingCall,
    acceptIncomingCall,
    dismissIncomingCall,
    openIncomingCallChat,
  } = useApp();

  if (!incomingCall) return null;

  const callerName =
    incomingCall.from?.name ||
    (incomingCall.from?.role === "doctor" ? "Doctor" : "Patient");
  const roleLabel =
    incomingCall.from?.role === "doctor" ? "Doctor" : "Patient";

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.dialog} role="alertdialog" aria-live="assertive">
        <div className={styles.dialogTop}>
          <div className={styles.callMark}>
            <span className={styles.pulse} />
          </div>
          <div className={styles.content}>
            <strong>Incoming video call</strong>
            <span>
              {callerName} · {roleLabel}
              {incomingCall.reason ? ` · ${incomingCall.reason}` : ""}
            </span>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.secondaryBtn}
            onClick={openIncomingCallChat}
            type="button"
          >
            Open chat
          </button>
          <button
            className={styles.acceptBtn}
            onClick={acceptIncomingCall}
            type="button"
          >
            Join video
          </button>
          <button
            className={styles.dismissBtn}
            onClick={dismissIncomingCall}
            type="button"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
