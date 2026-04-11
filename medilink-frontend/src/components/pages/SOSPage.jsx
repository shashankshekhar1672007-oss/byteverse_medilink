import { useState, useEffect } from "react";
import { useApp, PAGES } from "../../context/AppContext";
import styles from "./CSS/SOSPage.module.css";

export default function SOSPage() {
  const { navigate } = useApp();
  const [phase, setPhase] = useState("idle"); // idle | connecting | connected
  const [dots, setDots] = useState("");

  // Animate dots while connecting
  useEffect(() => {
    if (phase !== "connecting") return;
    const t = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(t);
  }, [phase]);

  const handleConnect = () => {
    if (phase === "idle") {
      setPhase("connecting");
      setTimeout(() => setPhase("connected"), 3000);
    } else if (phase === "connected") {
      navigate(PAGES.CONSULTATION);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.alert}>● Emergency Mode Active</div>

      {/* Pulsing SOS button */}
      <button
        className={`${styles.ring} ${phase === "connecting" ? styles.ringing : ""}`}
        onClick={handleConnect}
      >
        <div className={styles.inner}>
          {phase === "idle" && "SOS"}
          {phase === "connecting" && "..."}
          {phase === "connected" && "GO"}
        </div>
      </button>

      <h1 className={styles.title}>Emergency Assistance</h1>
      <p className={styles.subtitle}>
        Press the button to instantly connect with an on-call emergency doctor.
        Your location will be shared automatically.
      </p>

      {phase === "idle" && (
        <p className={styles.hint}>Tap the button above to activate</p>
      )}
      {phase === "connecting" && (
        <p className={styles.connecting}>
          Connecting to nearest available doctor{dots}
        </p>
      )}
      {phase === "connected" && (
        <p className={styles.connected}>
          ✓ Doctor found — Dr. Riya Sharma is ready
        </p>
      )}

      {/* Action chips */}
      <div className={styles.actions}>
        <button className={styles.actionChip}>
          <span>📍</span> Share Location
        </button>
        <button className={styles.actionChip}>
          <span>📞</span> Alert Contacts
        </button>
        <button
          className={styles.actionChip}
          onClick={() => navigate(PAGES.CONSULTATION)}
        >
          <span>👨‍⚕️</span> Connect Doctor
        </button>
      </div>

      {/* Helpline */}
      <div className={styles.helpline}>
        <div className={styles.helplineLabel}>National Emergency Helpline</div>
        <div className={styles.helplineNumber}>108</div>
      </div>

      {/* Cancel */}
      <button
        className={styles.cancel}
        onClick={() => navigate(PAGES.DASHBOARD)}
      >
        Cancel · Return to Dashboard
      </button>
    </div>
  );
}
