import styles from "../CSS/Orders.module.css";

export default function FulfillmentSelector({ deliveryMode, onChange }) {
  return (
    <>
      <div className={styles.sectionTop}>
        <h2 className={`${styles.colTitle} ${styles.fulfilmentTitle}`}>
          Fulfilment Method
        </h2>
        <span className={styles.safeBadge}>Cold-safe packing</span>
      </div>
      <div className={styles.modes}>
        <ModeButton
          active={deliveryMode === "delivery"}
          icon="🚚"
          name="Home Delivery"
          onClick={() => onChange("delivery")}
          subtitle="Delivered in 2-4 hours"
        />
        <ModeButton
          active={deliveryMode === "pickup"}
          icon="🏪"
          name="Store Pickup"
          onClick={() => onChange("pickup")}
          subtitle="Ready in 30 mins · Apollo Pharmacy"
        />
      </div>
    </>
  );
}

function ModeButton({ active, icon, name, onClick, subtitle }) {
  return (
    <button
      className={`${styles.modeBtn} ${active ? styles.modeActive : ""}`}
      onClick={onClick}
      type="button"
    >
      <span className={styles.modeIcon}>{icon}</span>
      <div>
        <div className={styles.modeName}>{name}</div>
        <div className={styles.modeSub}>{subtitle}</div>
      </div>
    </button>
  );
}
