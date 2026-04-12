import { Button } from "../../ui/UI";
import styles from "../CSS/Orders.module.css";
import { getInitials } from "./orderUtils";

export default function OrderSummaryCard({
  deliveryMode,
  itemCount,
  latestOrder,
  onPlaceOrder,
  ordered,
  orderedAt,
  placing,
  summary,
  user,
}) {
  return (
    <div className={styles.cartCard}>
      <h2 className={styles.cartTitle}>Order Summary</h2>
      <PatientStrip deliveryMode={deliveryMode} eta={summary.eta} user={user} />

      <div className={styles.cartRows}>
        <SummaryRow
          label={`Medicines (${itemCount} items)`}
          value={`₹${summary.basePrice}`}
        />
        <SummaryRow label="Delivery fee" value={`₹${summary.delivery}`} />
        <SummaryRow label="Care packing" value={`₹${summary.packaging}`} />
        <SummaryRow
          className={styles.savingsRow}
          label="Rx care savings"
          value={`-₹${summary.discount}`}
        />
      </div>

      <div className={styles.cartTotal}>
        <span>Total</span>
        <span>₹{summary.total}</span>
      </div>

      <Button
        variant="primary"
        fullWidth
        onClick={onPlaceOrder}
        disabled={placing || itemCount === 0}
      >
        {placing
          ? "Placing order..."
          : ordered
            ? `Place Another Order · ₹${summary.total}`
            : `Place Order · ₹${summary.total}`}
      </Button>

      {(orderedAt || latestOrder?.createdAt) && (
        <p className={styles.orderTime}>
          Placed at{" "}
          {new Date(orderedAt || latestOrder.createdAt).toLocaleString(
            "en-IN",
            {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            },
          )}
        </p>
      )}
    </div>
  );
}

function PatientStrip({ deliveryMode, eta, user }) {
  return (
    <div className={styles.patientStrip}>
      <div className={styles.patientAvatar}>{getInitials(user?.name)}</div>
      <div>
        <div className={styles.patientName}>{user?.name || "Patient"}</div>
        <div className={styles.patientMeta}>
          {deliveryMode === "delivery" ? "Home delivery" : "Store pickup"} ·{" "}
          {eta}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ className = "", label, value }) {
  return (
    <div className={`${styles.cartRow} ${className}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
