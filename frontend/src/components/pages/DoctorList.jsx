import { useState, useEffect } from "react";
import { useApp, PAGES } from "../../context/AppContext";
import { StatusBadge, Button, Spinner, ErrorMsg } from "../ui/UI";
import { doctors as doctorsApi } from "../../services/api";
import styles from "./CSS/DoctorList.module.css";

const SPECS = [
  "All Specializations",
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Neurologist",
  "Orthopedic",
  "Pediatrician",
  "Psychiatrist",
  "Gynecologist",
  "Urologist",
  "ENT Specialist",
];

export default function DoctorList() {
  const { navigate, pageParams, showToast } = useApp();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [spec, setSpec] = useState("All Specializations");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(2000);
  const [starting, setStarting] = useState(null);
  const searchTerm = (pageParams.search || "").trim().toLowerCase();
  const visibleDoctors = doctors.filter((doc) => {
    if (!searchTerm) return true;
    return [doc.userId?.name, doc.specialization, doc.qualification, doc.bio]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchTerm);
  });

  useEffect(() => {
    if (pageParams.specialty && SPECS.includes(pageParams.specialty)) {
      setSpec(pageParams.specialty);
    }
  }, [pageParams.specialty]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { limit: 50 };
      if (spec !== "All Specializations") params.specialty = spec;
      if (onlineOnly) params.online = "true";
      if (maxPrice < 2000) params.maxPrice = maxPrice;
      const r = await doctorsApi.getAll(params);
      setDoctors(r.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [spec, onlineOnly, maxPrice]);

  const handleConsult = async (doc) => {
    setStarting(doc._id);
    try {
      const { consultations } = await import("../../services/api");
      const r = await consultations.start(
        doc._id,
        `Consultation with ${doc.userId?.name || "Doctor"}`,
      );
      showToast(
        "Consultation request sent. The doctor has been notified and will connect when ready.",
      );
      navigate(PAGES.CONSULTATION, {
        consultationId: r.data._id,
        mode: "chat",
        doctor: {
          ...doc,
          name: doc.userId?.name,
          initials: (doc.userId?.name || "DR")
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2),
          color: "#3ECF8E",
        },
      });
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.greeting}>
        <h1>Find a Doctor</h1>
        <p>Connect with verified specialists instantly</p>
      </div>
      <div className={styles.filtersBar}>
        <select
          className={styles.select}
          value={spec}
          onChange={(e) => setSpec(e.target.value)}
        >
          {SPECS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <label className={styles.toggle}>
          <span
            className={`${styles.toggleTrack} ${onlineOnly ? styles.on : styles.off}`}
            onClick={() => setOnlineOnly((v) => !v)}
          >
            <span className={styles.toggleThumb} />
          </span>
          Available now
        </label>
        <div className={styles.priceRange}>
          <span>Price:</span>
          <input
            type="range"
            min={100}
            max={2000}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            step={50}
          />
          <span>₹{maxPrice}</span>
        </div>
        <span className={styles.resultCount}>
          {visibleDoctors.length} doctors found
          {searchTerm ? ` for "${pageParams.search}"` : ""}
        </span>
      </div>
      {loading ? (
        <div className={styles.loadingWrap}>
          <Spinner size={36} />
        </div>
      ) : error ? (
        <ErrorMsg message={error} onRetry={load} />
      ) : (
        <div className={styles.grid}>
          {visibleDoctors.map((doc) => (
            <div key={doc._id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.photo}>
                  {(doc.userId?.name || "DR")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <div className={styles.name}>{doc.userId?.name}</div>
                  <div className={styles.spec}>{doc.specialization}</div>
                </div>
              </div>
              <div className={styles.rating}>
                ★ {doc.rating || 0}
                <span>{doc.ratingCount || 0} reviews</span>
              </div>
              <StatusBadge online={doc.online} />
              <div className={styles.price}>₹{doc.price} / consultation</div>
              <Button
                variant={doc.online ? "ghost" : "outline"}
                disabled={!doc.online || starting === doc._id}
                fullWidth
                onClick={doc.online ? () => handleConsult(doc) : undefined}
              >
                {starting === doc._id
                  ? "Starting…"
                  : doc.online
                    ? "Consult Now"
                    : "Unavailable"}
              </Button>
            </div>
          ))}
          {visibleDoctors.length === 0 && (
            <div className={styles.empty}>No doctors match your filters.</div>
          )}
        </div>
      )}
    </div>
  );
}
