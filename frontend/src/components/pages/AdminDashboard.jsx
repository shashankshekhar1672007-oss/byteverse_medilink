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
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
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

  const verifyDoctor = async (userId, verified) => {
    setSavingId(userId);
    try {
      await adminApi.verifyDoctor(userId, verified);
      await load();
      if (selectedUser?.user?._id === userId || selectedUser?._id === userId) {
        await viewUser(userId);
      }
    } catch (e) {
      setError(e.message || "Could not update doctor verification");
    } finally {
      setSavingId("");
    }
  };

  const viewUser = async (userId) => {
    setDetailsLoading(true);
    setError("");
    try {
      const response = await adminApi.getUserById(userId);
      setSelectedUser(response.data);
    } catch (e) {
      setError(e.message || "Could not load user details");
    } finally {
      setDetailsLoading(false);
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
                    onView={viewUser}
                    onVerifyDoctor={verifyDoctor}
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

      {(selectedUser || detailsLoading) && (
        <UserDetailsPanel
          data={selectedUser}
          loading={detailsLoading}
          onClose={() => setSelectedUser(null)}
          onVerifyDoctor={verifyDoctor}
          savingId={savingId}
        />
      )}
    </div>
  );
}

function UserRow({
  item,
  onStatus,
  onVerify,
  onVerifyDoctor,
  onView,
  saving,
}) {
  const id = item._id || item.id;
  const emailVerified =
    item.isEmailVerified ??
    item.isVerified ??
    item.emailVerified ??
    item.verified;
  const doctorVerified = item.profile?.isVerified;
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
          className={`${styles.statusPill} ${emailVerified ? styles.good : styles.warn}`}
        >
          {emailVerified ? "Email verified" : "Email pending"}
        </span>
        {item.role === "doctor" && (
          <span
            className={`${styles.statusPill} ${doctorVerified ? styles.good : styles.warn} ${styles.inlinePill}`}
          >
            {doctorVerified ? "Doctor verified" : "Doctor pending"}
          </span>
        )}
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
          <button disabled={saving} onClick={() => onView(id)} type="button">
            Details
          </button>
          {!emailVerified && (
            <button
              disabled={saving}
              onClick={() => onVerify(id)}
              type="button"
            >
              Verify
            </button>
          )}
          {item.role === "doctor" && (
            <button
              disabled={saving}
              onClick={() => onVerifyDoctor(id, !doctorVerified)}
              type="button"
            >
              {doctorVerified ? "Unverify Doctor" : "Verify Doctor"}
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

function UserDetailsPanel({
  data,
  loading,
  onClose,
  onVerifyDoctor,
  savingId,
}) {
  const user = data?.user || data;
  const profile = data?.profile || null;
  const userId = user?._id || user?.id;
  const isDoctor = user?.role === "doctor";
  const doctorVerified = Boolean(profile?.isVerified);

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <aside className={styles.detailsPanel} role="dialog" aria-modal="true">
        <div className={styles.detailsHeader}>
          <div>
            <h2>User Details</h2>
            <p>Complete account and profile information.</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            Close
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingWrap}>
            <Spinner size={28} />
          </div>
        ) : (
          <>
            <div className={styles.detailsHero}>
              <div className={styles.avatar}>{getInitials(user?.name)}</div>
              <div>
                <h3>{user?.name || "Unnamed user"}</h3>
                <p>{user?.email || "No email"}</p>
              </div>
            </div>

            <DetailGrid
              title="Account"
              items={[
                ["Role", user?.role],
                ["Phone", user?.phone],
                ["Email verified", yesNo(user?.isEmailVerified)],
                ["Status", user?.isActive === false ? "Blocked" : "Active"],
                ["Joined", formatDateTime(user?.createdAt)],
                ["Last seen", formatDateTime(user?.lastSeen)],
              ]}
            />

            {profile && (
              <DetailGrid
                title={isDoctor ? "Doctor Profile" : "Patient Profile"}
                items={profileDetailItems(profile, isDoctor)}
              />
            )}

            {isDoctor && (
              <div className={styles.verifyBox}>
                <div>
                  <strong>Doctor verification</strong>
                  <span>
                    {doctorVerified
                      ? "This doctor is approved to appear as verified."
                      : "Review registration details before approving."}
                  </span>
                </div>
                <Button
                  variant={doctorVerified ? "outline" : "primary"}
                  disabled={savingId === userId}
                  onClick={() => onVerifyDoctor(userId, !doctorVerified)}
                >
                  {doctorVerified ? "Unverify Doctor" : "Verify Doctor"}
                </Button>
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function DetailGrid({ title, items }) {
  return (
    <section className={styles.detailSection}>
      <h3>{title}</h3>
      <div className={styles.detailGrid}>
        {items.map(([label, value]) => (
          <div className={styles.detailItem} key={label}>
            <span>{label}</span>
            <strong>{formatValue(value)}</strong>
          </div>
        ))}
      </div>
    </section>
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

function profileDetailItems(profile, isDoctor) {
  if (isDoctor) {
    return [
      ["Specialization", profile.specialization],
      ["Qualification", profile.qualification],
      ["Registration No.", profile.regNo],
      ["Experience", profile.experience ? `${profile.experience} years` : "0 years"],
      ["Consultation fee", profile.price ? `₹${profile.price}` : "₹0"],
      ["Doctor verified", yesNo(profile.isVerified)],
      ["Online", yesNo(profile.online)],
      ["Rating", profile.rating ? `${profile.rating} (${profile.ratingCount || 0} reviews)` : "No ratings"],
      ["Consultations", profile.consultationCount],
      ["Hospital", formatHospital(profile.hospital)],
      ["Languages", profile.languages?.join(", ")],
      ["Bio", profile.bio],
    ];
  }

  return [
    ["Age", profile.age],
    ["Gender", profile.gender],
    ["Blood group", profile.bloodGroup],
    ["Weight", profile.weight ? `${profile.weight} kg` : ""],
    ["Height", profile.height ? `${profile.height} cm` : ""],
    ["Allergies", arrayOrText(profile.allergies)],
    ["Chronic conditions", arrayOrText(profile.chronicConditions)],
    ["Emergency contact", profile.emergencyContact?.phone || profile.emergencyContact],
    ["Address", formatAddress(profile.address)],
  ];
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "Not provided";
  if (typeof value === "boolean") return yesNo(value);
  return String(value);
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function arrayOrText(value) {
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

function formatHospital(hospital) {
  if (!hospital) return "";
  return [hospital.name, hospital.city, hospital.state].filter(Boolean).join(", ");
}

function formatAddress(address) {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [address.line1, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
