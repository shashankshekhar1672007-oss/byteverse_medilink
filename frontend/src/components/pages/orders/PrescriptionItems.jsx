import { Badge } from "../../ui/UI";
import styles from "../CSS/Orders.module.css";

export default function PrescriptionItems({ medicines, prescription }) {
  return (
    <>
      <div className={styles.sectionTop}>
        <h2 className={styles.colTitle}>Prescription Items</h2>
        {prescription && <span className={styles.rxBadge}>Verified Rx</span>}
      </div>

      {medicines.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>Rx</div>
          <p className={styles.emptyText}>
            No active prescription medicines found. Consult a doctor first.
          </p>
        </div>
      ) : (
        <div className={styles.medList}>
          {medicines.map((medicine, index) => (
            <MedicineRow
              key={`${medicine.name}-${index}`}
              medicine={medicine}
            />
          ))}
        </div>
      )}
    </>
  );
}

function MedicineRow({ medicine }) {
  return (
    <div className={styles.medRow}>
      <div className={styles.medIcon}>💊</div>
      <div className={styles.medInfo}>
        <div className={styles.medName}>{medicine.name}</div>
        <div className={styles.medMeta}>
          {medicine.dosage} · {medicine.frequency} · {medicine.duration}
        </div>
      </div>
      <div className={styles.medRight}>
        <Badge type="success">In stock</Badge>
        <span className={styles.medPrice}>₹80</span>
      </div>
    </div>
  );
}
