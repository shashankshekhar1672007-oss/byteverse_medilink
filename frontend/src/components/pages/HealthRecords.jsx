import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Spinner } from "../ui/UI";
import { patients as patientsApi } from "../../services/api";
import styles from "./CSS/HealthRecords.module.css";

const TABS = ["Reports", "Vitals", "Prescriptions"];
const BP = [
  { month: "Oct", value: 54, heightClass: styles.barH54 },
  { month: "Nov", value: 62, heightClass: styles.barH62 },
  { month: "Dec", value: 70, heightClass: styles.barH70 },
  { month: "Jan", value: 58, heightClass: styles.barH58 },
  { month: "Feb", value: 50, heightClass: styles.barH50 },
  { month: "Mar", value: 46, heightClass: styles.barH46 },
];
const CV = [
  { month: "Oct", value: 20, heightClass: styles.barH20 },
  { month: "Nov", value: 40, heightClass: styles.barH40 },
  { month: "Dec", value: 20, heightClass: styles.barH20 },
  { month: "Jan", value: 60, heightClass: styles.barH60 },
  { month: "Feb", value: 40, heightClass: styles.barH40 },
  { month: "Mar", value: 65, heightClass: styles.barH65 },
];
const LAB = [
  {
    id: 1,
    date: "2 Feb 2026",
    test: "Complete Blood Count (CBC)",
    results: [
      {
        parameter: "Hemoglobin",
        value: "13.5 g/dL",
        range: "13.5-17.5",
        status: "low",
      },
      {
        parameter: "WBC Count",
        value: "7.2 K/μL",
        range: "4.0-11.0",
        status: "normal",
      },
      {
        parameter: "Platelets",
        value: "2.5 L/μL",
        range: "1.5-4.5",
        status: "normal",
      },
    ],
  },
  {
    id: 2,
    date: "15 Jan 2026",
    test: "Lipid Profile",
    results: [
      {
        parameter: "Total Cholesterol",
        value: "180 mg/dL",
        range: "<200",
        status: "normal",
      },
      { parameter: "HDL", value: "45 mg/dL", range: ">40", status: "normal" },
      { parameter: "LDL", value: "110 mg/dL", range: "<100", status: "high" },
    ],
  },
];

const getStatusClassName = (status) =>
  ({
    active: styles.badgeActive,
    expired: styles.badgeExpired,
    revoked: styles.badgeCancelled,
    cancelled: styles.badgeCancelled,
    normal: styles.badgeNormal,
    low: styles.badgeLow,
    high: styles.badgeHigh,
  })[status] || styles.badgeDefault;

export default function HealthRecords() {
  const { user } = useApp();
  const [tab, setTab] = useState("Reports");
  const [rxList, setRxList] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rxRes, profRes] = await Promise.all([
          patientsApi.getPrescriptions(),
          patientsApi.getProfile(),
        ]);
        setRxList(rxRes.data || []);
        setProfile(profRes.data);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.greeting}>
        <h1>Health Records</h1>
        <p>Your complete medical history in one place</p>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.activeTab : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>
          <Spinner size={32} />
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.mainContent}>
            {tab === "Reports" && <ReportsTab />}
            {tab === "Vitals" && <VitalsTab profile={profile} />}
            {tab === "Prescriptions" && <PrescriptionsTab rxList={rxList} />}
          </div>

          <div className={styles.healthSidebar}>
            <div className={styles.sidebarHeader}>
              <h3>Health Trends</h3>
            </div>

            <div className={styles.sidebarSection}>
              <div className={styles.sectionTitle}>
                <div className={styles.sectionIcon}>❤️</div>
                <span>Vital Signs</span>
              </div>
              <div className={styles.sectionContent}>
                <BarChart
                  title="Blood Pressure"
                  data={BP}
                  colorClass={styles.barPrimary}
                  sub="Avg: 118 mmHg"
                />
              </div>
            </div>

            <div className={styles.sidebarSection}>
              <div className={styles.sectionTitle}>
                <div className={styles.sectionIcon}>📅</div>
                <span>Consultations</span>
              </div>
              <div className={styles.sectionContent}>
                <BarChart
                  title="Monthly Visits"
                  data={CV}
                  colorClass={styles.barBlue}
                  sub="Last 6 months"
                />
              </div>
            </div>

            <div className={styles.sidebarSection}>
              <div className={styles.sectionTitle}>
                <div className={styles.sectionIcon}>📊</div>
                <span>Current Status</span>
              </div>
              <div className={styles.sectionContent}>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryTitle}>Health Summary</div>
                  {[
                    ["Blood Group", profile?.bloodGroup || "—", "normal"],
                    [
                      "Weight",
                      profile?.weight
                        ? `${Math.round(profile.weight)} kg`
                        : "—",
                      "normal",
                    ],
                    ["BMI", profile?.bmi || "—", "normal"],
                    [
                      "Allergies",
                      profile?.allergies?.length > 0
                        ? profile.allergies.join(", ")
                        : "None",
                      profile?.allergies?.length > 0 ? "warn" : "normal",
                    ],
                  ].map(([k, v, c]) => (
                    <div key={k} className={styles.summaryRow}>
                      <span>{k}</span>
                      <span
                        className={c === "warn" ? styles.warn : styles.normal}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrescriptionsTab({ rxList }) {
  return (
    <div>
      <h2 className={styles.colTitle}>My Prescriptions</h2>
      <div className={styles.recordsList}>
        {rxList.length === 0 && (
          <p className={styles.emptyText}>No prescriptions found.</p>
        )}

        {rxList.map((rx) => (
          <div key={rx._id} className={styles.recordCard}>
            <div className={styles.recordHeader}>
              <div>
                <div className={styles.recordTitle}>{rx.diagnosis}</div>
                <div className={styles.recordMeta}>
                  {new Date(rx.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  • Prescribed by Dr.{" "}
                  {rx.createdBy?.userId?.name?.replace("Dr. ", "") || "Doctor"}
                </div>
              </div>
              <div
                className={`${styles.badge} ${getStatusClassName(rx.status)}`}
              >
                {rx.status}
              </div>
            </div>

            <div className={styles.cardSection}>
              <div className={styles.sectionLabel}>Medicines</div>
              <div className={styles.stackList}>
                {(rx.medicines || []).map((m, i) => (
                  <div key={i} className={styles.itemRow}>
                    <div className={styles.itemPrimary}>💊 {m.name}</div>
                    <div className={styles.itemSecondary}>
                      {m.dosage} • {m.frequency} • {m.duration}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.inlineMetaRow}>
                <span className={styles.inlineMetaLabel}>Expires:</span>
                <span>
                  {rx.expiresAt
                    ? new Date(rx.expiresAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
            </div>

            {rx.advice && (
              <div className={styles.instructionsBox}>
                <strong>Instructions:</strong> {rx.advice}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTab() {
  return (
    <div>
      <h2 className={styles.colTitle}>Lab Reports & Test Results</h2>
      <div className={styles.recordsList}>
        {LAB.map((report) => (
          <div key={report.id} className={styles.recordCard}>
            <div className={styles.recordHeader}>
              <div className={styles.recordTitle}>{report.test}</div>
              <div className={styles.recordMeta}>{report.date}</div>
            </div>

            <div className={styles.resultList}>
              {report.results.map((r, i) => (
                <div key={i} className={styles.resultRow}>
                  <span className={styles.parameter}>{r.parameter}</span>
                  <span className={styles.resultValue}>{r.value}</span>
                  <span className={styles.range}>{r.range}</span>
                  <span
                    className={`${styles.badge} ${getStatusClassName(r.status)}`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VitalsTab({ profile }) {
  return (
    <div>
      <h2 className={styles.colTitle}>Vital Signs History</h2>
      <div className={styles.timeline}>
        {profile && (
          <div className={styles.timelineItem}>
            <div className={styles.tlLine}>
              <div className={styles.tlDot} />
              <div className={styles.tlStem} />
            </div>
            <div className={styles.tlContent}>
              <div className={styles.tlDate}>Current</div>
              <div className={styles.tlTitle}>Health Profile</div>
              <div className={styles.tlDetail}>
                {profile.weight && <div>• Weight: {profile.weight} kg</div>}
                {profile.height && <div>• Height: {profile.height} cm</div>}
                {profile.bmi && <div>• BMI: {profile.bmi}</div>}
                {profile.bloodGroup && (
                  <div>• Blood Group: {profile.bloodGroup}</div>
                )}
              </div>
            </div>
          </div>
        )}

        <p
          className={`${styles.timelineNote} ${profile ? styles.timelineNoteIndented : ""}`}
        >
          Detailed vitals history will appear here as you log health data.
        </p>
      </div>
    </div>
  );
}

function BarChart({ title, data, colorClass, sub }) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartTitle}>{title}</div>
      <div className={styles.bars}>
        {data.map((d) => (
          <div key={d.month} className={styles.barGroup}>
            <div className={`${styles.bar} ${colorClass} ${d.heightClass}`} />
            <span className={styles.barLabel}>{d.month}</span>
          </div>
        ))}
      </div>
      {sub && <div className={styles.chartSub}>{sub}</div>}
    </div>
  );
}
