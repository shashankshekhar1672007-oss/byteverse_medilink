import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Badge, Spinner } from "../ui/UI";
import { patients as patientsApi } from "../../services/api";
import styles from "./CSS/Orders.module.css";

const STEPS = [
  "Order Placed",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
];

export default function Orders() {
  const { user } = useApp();
  const [rx, setRx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryMode, setDeliveryMode] = useState("delivery");
  const [ordered, setOrdered] = useState(false);
  const [currentStep] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const r = await patientsApi.getActivePrescriptions();
        if (r.data?.length > 0) setRx(r.data[0]);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const meds = rx?.medicines || [];
  const basePrice = meds.length * 80;
  const delivery = deliveryMode === "delivery" ? 30 : 0;
  const total = basePrice + delivery;

  if (loading)
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Spinner size={36} />
        </div>
      </div>
    );

  return (
    <div className={styles.page}>
      <div className={styles.greeting}>
        <h1>Order Medicines</h1>
        <p>
          {rx
            ? `From prescription ${rx.rxId} · ${rx.createdBy?.userId?.name || "Doctor"}`
            : "No active prescription found"}
        </p>
      </div>
      <div className={styles.layout}>
        <div>
          <h2 className={styles.colTitle}>Prescription Items</h2>
          {meds.length === 0 ? (
            <p className={styles.emptyText}>
              No active prescription medicines found. Consult a doctor first.
            </p>
          ) : (
            <div className={styles.medList}>
              {meds.map((med, i) => (
                <div key={i} className={styles.medRow}>
                  <div className={styles.medIcon}>💊</div>
                  <div className={styles.medInfo}>
                    <div className={styles.medName}>{med.name}</div>
                    <div className={styles.medMeta}>
                      {med.dosage} · {med.frequency} · {med.duration}
                    </div>
                  </div>
                  <Badge type="success">In stock</Badge>
                </div>
              ))}
            </div>
          )}
          <h2 className={`${styles.colTitle} ${styles.fulfilmentTitle}`}>
            Fulfilment Method
          </h2>
          <div className={styles.modes}>
            <button
              className={`${styles.modeBtn} ${deliveryMode === "delivery" ? styles.modeActive : ""}`}
              onClick={() => setDeliveryMode("delivery")}
            >
              <span className={styles.modeIcon}>🚚</span>
              <div>
                <div className={styles.modeName}>Home Delivery</div>
                <div className={styles.modeSub}>Delivered in 2–4 hours</div>
              </div>
            </button>
            <button
              className={`${styles.modeBtn} ${deliveryMode === "pickup" ? styles.modeActive : ""}`}
              onClick={() => setDeliveryMode("pickup")}
            >
              <span className={styles.modeIcon}>🏪</span>
              <div>
                <div className={styles.modeName}>Store Pickup</div>
                <div className={styles.modeSub}>
                  Ready in 30 mins · Apollo Pharmacy
                </div>
              </div>
            </button>
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.cartCard}>
            <h2 className={styles.cartTitle}>Order Summary</h2>
            <div className={styles.cartRows}>
              <div className={styles.cartRow}>
                <span>Medicines ({meds.length} items)</span>
                <span>₹{basePrice}</span>
              </div>
              <div className={styles.cartRow}>
                <span>Delivery fee</span>
                <span>₹{delivery}</span>
              </div>
              <div className={styles.cartRow}>
                <span>Platform fee</span>
                <span>₹0</span>
              </div>
            </div>
            <div className={styles.cartTotal}>
              <span>Total</span>
              <span>₹{total}</span>
            </div>
            <Button
              variant="primary"
              fullWidth
              onClick={() => setOrdered(true)}
              disabled={ordered || meds.length === 0}
            >
              {ordered ? "Order Placed ✓" : `Place Order · ₹${total}`}
            </Button>
          </div>
          <div className={styles.trackerCard}>
            <h2 className={styles.cartTitle}>Order Tracker</h2>
            <div className={styles.tracker}>
              {STEPS.map((s, i) => (
                <div key={s} className={styles.step}>
                  <div className={styles.stepLeft}>
                    <div
                      className={`${styles.stepDot} ${ordered && i === 0 ? styles.current : i < (ordered ? 1 : 0) ? styles.done : styles.pending}`}
                    />
                    {i < STEPS.length - 1 && (
                      <div
                        className={`${styles.stepLine} ${i < (ordered ? 1 : 0) ? styles.doneLine : ""}`}
                      />
                    )}
                  </div>
                  <div
                    className={`${styles.stepLabel} ${ordered && i === 0 ? styles.currentLabel : ""}`}
                  >
                    {s}
                    {ordered && i === 0 && (
                      <span className={styles.stepBadge}>In progress</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
