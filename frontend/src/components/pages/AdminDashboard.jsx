import { useEffect, useState } from "react";
import { admin as adminApi } from "../../services/api";
import { Button, ErrorMsg, Spinner, StatCard } from "../ui/UI";
import styles from "./CSS/AdminDashboard.module.css";

const USER_FILTERS = ["all", "patient", "doctor", "admin"];
const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
const ORDER_STATUS_ALIASES = {
  placed: "pending",
  packed: "processing",
  out_for_delivery: "shipped",
};

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = roleFilter === "all" ? {} : { role: roleFilter };
      const [dashboardRes, usersRes, ordersRes] = await Promise.all([
        adminApi.getDashboard().catch(() => ({ data: null })),
        adminApi.getUsers(params),
        adminApi.getOrders({ limit: 20 }),
      ]);
      setDashboard(dashboardRes.data);
      setUsers(usersRes.data?.users || usersRes.data || []);
      setOrders(ordersRes.data?.orders || ordersRes.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [roleFilter]);

  const verifyUser = async (userId) => {
    setSavingId(userId);
    try {
      await adminApi.verifyUser(userId, true);
      await load();
    } catch (e) {
      setError(e.message || "Could not verify user");
    } finally {
      setSavingId("");
    }
  };

  const updateUserStatus = async (userId, status) => {
    setSavingId(userId);
    try {
      await adminApi.updateUserStatus(userId, status);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId("");
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    setSavingId(orderId);
    try {
      await adminApi.updateOrderStatus(orderId, status);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingId("");
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Spinner size={36} />
        </div>
      </div>
    );
  }

  const stats = buildStats(dashboard, users, orders);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Admin Control Center</span>
          <h1>Platform Management</h1>
          <p>Verify users, manage accounts, and monitor medicine orders.</p>
        </div>
        <Button variant="outline" onClick={load}>
          Refresh
        </Button>
      </div>

      {error && <ErrorMsg message={error} onRetry={load} />}

      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Users</h2>
            <p>Approve verified accounts and control active access.</p>
          </div>
          <div className={styles.filters}>
            {USER_FILTERS.map((filter) => (
              <button
                className={`${styles.filterBtn} ${roleFilter === filter ? styles.filterActive : ""}`}
                key={filter}
                onClick={() => setRoleFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Verification</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className={styles.empty}>
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((item) => (
                  <UserRow
                    item={item}
                    key={item._id || item.id || item.email}
                    onStatus={updateUserStatus}
                    onVerify={verifyUser}
                    saving={savingId === (item._id || item.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Orders</h2>
            <p>Track pharmacy fulfilment and update delivery workflow.</p>
          </div>
        </div>

        <div className={styles.orderGrid}>
          {orders.length === 0 ? (
            <div className={styles.empty}>No orders found</div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order._id || order.id}
                order={order}
                onStatus={updateOrderStatus}
                saving={savingId === (order._id || order.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function UserRow({ item, onStatus, onVerify, saving }) {
  const id = item._id || item.id;
  const verified =
    item.isEmailVerified ??
    item.isVerified ??
    item.emailVerified ??
    item.verified;
  const status =
    item.status || (item.isActive === false ? "blocked" : "active");

  return (
    <tr>
      <td>
        <div className={styles.userCell}>
          <div className={styles.avatar}>{getInitials(item.name)}</div>
          <div>
            <div className={styles.name}>{item.name || "Unnamed user"}</div>
            <div className={styles.meta}>{item.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span className={styles.rolePill}>{item.role || "patient"}</span>
      </td>
      <td>
        <span
          className={`${styles.statusPill} ${verified ? styles.good : styles.warn}`}
        >
          {verified ? "Verified" : "Pending"}
        </span>
      </td>
      <td>
        <span
          className={`${styles.statusPill} ${status === "active" ? styles.good : styles.danger}`}
        >
          {status}
        </span>
      </td>
      <td>
        <div className={styles.rowActions}>
          {!verified && (
            <button
              disabled={saving}
              onClick={() => onVerify(id)}
              type="button"
            >
              Verify
            </button>
          )}
          <button
            disabled={saving}
            onClick={() =>
              onStatus(id, status === "active" ? "blocked" : "active")
            }
            type="button"
          >
            {status === "active" ? "Block" : "Activate"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function OrderCard({ order, onStatus, saving }) {
  const id = order._id || order.id;
  const status = normalizeOrderStatus(order.status);
  const patientName =
    order.patient?.userId?.name ||
    order.patient?.name ||
    order.user?.name ||
    "Patient";
  const total = order.total || order.totalAmount || order.amount || 0;

  return (
    <article className={styles.orderCard}>
      <div className={styles.orderTop}>
        <div>
          <h3>
            {order.orderNumber ||
              order.orderId ||
              order.rxId ||
              `Order ${String(id || "").slice(-6)}`}
          </h3>
          <p>
            {patientName} ·{" "}
            {order.items?.length || order.medicines?.length || 0} items
          </p>
        </div>
        <span className={styles.price}>₹{total}</span>
      </div>
      <div className={styles.orderMeta}>
        <span>Status</span>
        <select
          value={status}
          onChange={(event) => onStatus(id, event.target.value)}
          disabled={saving}
        >
          {ORDER_STATUSES.map((option) => (
            <option key={option} value={option}>
              {formatStatus(option)}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

function buildStats(dashboard, users, orders) {
  const totalUsers =
    dashboard?.stats?.users ??
    dashboard?.totalUsers ??
    dashboard?.users ??
    users.length;
  const pendingUsers =
    dashboard?.stats?.pendingUsers ??
    users.filter(
      (user) =>
        !(
          user.isEmailVerified ??
          user.isVerified ??
          user.emailVerified ??
          user.verified
        ),
    ).length;
  const totalOrders =
    dashboard?.stats?.orders ??
    dashboard?.totalOrders ??
    dashboard?.orders ??
    orders.length;
  const activeOrders =
    dashboard?.stats?.activeOrders ??
    dashboard?.pendingOrders ??
    orders.filter(
      (order) =>
        !["delivered", "cancelled"].includes(
          normalizeOrderStatus(order.status),
        ),
    ).length;

  return [
    {
      label: "Total Users",
      value: String(totalUsers),
      sub: "Registered accounts",
      color: "#007BFF",
      positive: null,
    },
    {
      label: "Pending Verification",
      value: String(pendingUsers),
      sub: "Need admin/email approval",
      color: "#F59E0B",
      positive: pendingUsers === 0,
    },
    {
      label: "Total Orders",
      value: String(totalOrders),
      sub: "Pharmacy records",
      color: "#10B981",
      positive: null,
    },
    {
      label: "Active Orders",
      value: String(activeOrders),
      sub: "In fulfilment",
      color: "#8B5CF6",
      positive: null,
    },
  ];
}

function normalizeOrderStatus(status) {
  return ORDER_STATUS_ALIASES[status] || status || "pending";
}

function formatStatus(status) {
  return status.replaceAll("_", " ");
}

function getInitials(name = "U") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}
