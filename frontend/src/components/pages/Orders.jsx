import { useApp } from "../../context/AppContext";
import { ErrorMsg, Spinner } from "../ui/UI";
import styles from "./CSS/Orders.module.css";
import FulfillmentSelector from "./orders/FulfillmentSelector";
import OrderSummaryCard from "./orders/OrderSummaryCard";
import OrdersHero from "./orders/OrdersHero";
import OrderTracker from "./orders/OrderTracker";
import PrescriptionItems from "./orders/PrescriptionItems";
import PromiseGrid from "./orders/PromiseGrid";
import { useMedicineOrder } from "./orders/useMedicineOrder";

export default function Orders() {
  const { profile, showToast, user } = useApp();
  const order = useMedicineOrder({ profile, showToast, user });

  if (order.loading)
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Spinner size={36} />
        </div>
      </div>
    );

  return (
    <div className={styles.page}>
      {order.error && <ErrorMsg message={order.error} onRetry={order.load} />}

      <OrdersHero
        eta={order.summary.eta}
        itemCount={order.medicines.length}
        prescription={order.prescription}
        total={order.summary.total}
      />

      <div className={styles.layout}>
        <div>
          <PrescriptionItems
            medicines={order.medicines}
            prescription={order.prescription}
          />
          <FulfillmentSelector
            deliveryMode={order.deliveryMode}
            onChange={order.setDeliveryMode}
          />
          <PromiseGrid />
        </div>

        <div className={styles.right}>
          <OrderSummaryCard
            deliveryMode={order.deliveryMode}
            itemCount={order.medicines.length}
            latestOrder={order.latestOrder}
            onPlaceOrder={order.placeOrder}
            ordered={order.ordered}
            orderedAt={order.orderedAt}
            placing={order.placing}
            summary={order.summary}
            user={user}
          />
          <OrderTracker
            currentStep={order.currentStep}
            ordered={Boolean(order.latestOrder || order.ordered)}
            status={order.latestOrder?.status}
          />
        </div>
      </div>

      <PreviousOrders orders={order.orderHistory} />
    </div>
  );
}

function PreviousOrders({ orders }) {
  return (
    <section className={styles.historySection}>
      <div className={styles.sectionTop}>
        <div>
          <h2 className={styles.colTitle}>Previous Orders</h2>
          <p className={styles.emptyText}>
            Track medicine orders and fulfilment status.
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>Rx</div>
          <div>
            <div className={styles.medName}>No orders yet</div>
            <div className={styles.medMeta}>
              Placed medicine orders will appear here.
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.historyList}>
          {orders.map((item) => (
            <article className={styles.historyCard} key={item._id || item.id}>
              <div>
                <div className={styles.historyTitle}>
                  {item.orderNumber ||
                    `Order ${String(item._id || item.id || "").slice(-6)}`}
                </div>
                <div className={styles.historyMeta}>
                  {(item.items || []).length} item
                  {(item.items || []).length === 1 ? "" : "s"} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className={styles.historyRight}>
                <span
                  className={`${styles.statusPill} ${styles[`status_${item.status}`] || ""}`}
                >
                  {formatStatus(item.status)}
                </span>
                <span className={styles.historyTotal}>₹{item.total || 0}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatStatus(status = "pending") {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
