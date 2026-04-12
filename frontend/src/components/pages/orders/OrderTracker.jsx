import styles from "../CSS/Orders.module.css";
import { formatOrderStatus, ORDER_STEPS } from "./orderUtils";

export default function OrderTracker({ currentStep, ordered, status }) {
  return (
    <div className={styles.trackerCard}>
      <div className={styles.trackerHead}>
        <h2 className={styles.cartTitle}>Order Tracker</h2>
        {status && (
          <span className={styles.trackerStatus}>
            {formatOrderStatus(status)}
          </span>
        )}
      </div>
      <div className={styles.tracker}>
        {ORDER_STEPS.map((step, index) => (
          <TrackerStep
            currentStep={currentStep}
            index={index}
            key={step}
            ordered={ordered}
            step={step}
          />
        ))}
      </div>
    </div>
  );
}

function TrackerStep({ currentStep, index, ordered, step }) {
  const isDone = ordered && index < currentStep;
  const isCurrent = ordered && index === currentStep;
  const isActive = ordered && index <= currentStep;

  return (
    <div className={styles.step}>
      <div className={styles.stepLeft}>
        <div
          className={`${styles.stepDot} ${
            isDone ? styles.done : isCurrent ? styles.current : styles.pending
          }`}
        />
        {index < ORDER_STEPS.length - 1 && (
          <div
            className={`${styles.stepLine} ${isDone ? styles.doneLine : ""}`}
          />
        )}
      </div>
      <div
        className={`${styles.stepLabel} ${isActive ? styles.currentLabel : ""}`}
      >
        {step}
        {isCurrent && (
          <span className={styles.stepBadge}>
            {index === ORDER_STEPS.length - 1 ? "Done" : "In progress"}
          </span>
        )}
      </div>
    </div>
  );
}
