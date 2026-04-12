import styles from "../CSS/Orders.module.css";

export default function OrdersHero({ eta, itemCount, prescription, total }) {
  return (
    <div className={styles.hero}>
      <div className={styles.greeting}>
        <span className={styles.eyebrow}>MediLink Pharmacy</span>
        <h1>Order Medicines</h1>
        <p>
          {prescription
            ? `Prescription ${prescription.rxId} from ${
                prescription.createdBy?.userId?.name || "Doctor"
              }`
            : "No active prescription found"}
        </p>
      </div>
      <div className={styles.heroStats}>
        <div>
          <span>{itemCount}</span>
          Items
        </div>
        <div>
          <span>{eta}</span>
          Estimated time
        </div>
        <div>
          <span>₹{total}</span>
          Payable
        </div>
      </div>
    </div>
  );
}
