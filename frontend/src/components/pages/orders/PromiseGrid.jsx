import styles from "../CSS/Orders.module.css";

const PROMISES = [
  { value: "100%", label: "Genuine medicines" },
  { value: "24/7", label: "Pharmacist help" },
  { value: "Secure", label: "Prescription checked" },
];

export default function PromiseGrid() {
  return (
    <div className={styles.promiseGrid}>
      {PROMISES.map((item) => (
        <div key={item.label}>
          <span>{item.value}</span>
          {item.label}
        </div>
      ))}
    </div>
  );
}
