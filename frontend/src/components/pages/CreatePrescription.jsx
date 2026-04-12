import { Fragment, useState, useEffect } from "react";
import { useApp, PAGES } from "../../context/AppContext";
import { Button, Spinner } from "../ui/UI";
import {
  prescriptions as rxApi,
  doctors as doctorsApi,
} from "../../services/api";
import styles from "./CSS/CreatePrescription.module.css";

const DOSAGES = [
  "1 tablet",
  "2 tablets",
  "1 capsule",
  "2 capsules",
  "5ml",
  "10ml",
  "As directed",
];
const FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Thrice daily",
  "Four times daily",
  "At night",
  "Morning & night",
  "As needed",
];

export default function CreatePrescription() {
  const { navigate, showToast } = useApp();
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [search, setSearch] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState([
    { name: "", dosage: "", frequency: "", duration: "" },
  ]);
  const [instructions, setInstructions] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await doctorsApi.getConsultations({
          status: "completed",
          limit: 50,
        });
        const seen = new Set();
        const pts = [];
        (r.data || []).forEach((c) => {
          const p = c.patient;
          if (p && !seen.has(p._id)) {
            seen.add(p._id);
            pts.push(p);
          }
        });
        setPatients(pts);
      } catch {
      } finally {
        setLoadingPatients(false);
      }
    })();
  }, []);

  const filtered = patients.filter(
    (p) =>
      (p.userId?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p._id || "").toLowerCase().includes(search.toLowerCase()),
  );

  const addMed = () =>
    setMedicines((m) => [
      ...m,
      { name: "", dosage: "", frequency: "", duration: "" },
    ]);
  const removeMed = (i) => setMedicines((m) => m.filter((_, j) => j !== i));
  const updateMed = (i, k, v) =>
    setMedicines((m) => m.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const validStep1 = !!selectedPatient;
  const validStep2 =
    diagnosis.trim() &&
    medicines.some((m) => m.name && m.dosage && m.frequency && m.duration);

  const submit = async () => {
    if (!validStep2 || !selectedPatient) return;
    setSubmitting(true);
    try {
      const payload = {
        patientId: selectedPatient._id,
        diagnosis: diagnosis.trim(),
        medicines: medicines.filter((m) => m.name),
        advice: instructions || undefined,
        followUpDate: followUp && followUpDate ? followUpDate : undefined,
      };
      await rxApi.create(payload);
      showToast("Prescription issued successfully!");
      navigate(PAGES.DOCTOR_PRESCRIPTIONS);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Create Prescription</h1>
          <p className={styles.headerSubtitle}>
            Select a patient, add clinical details, and review before issuing.
          </p>
        </div>
        <div className={styles.steps}>
          {["Patient", "Details", "Review"].map((label, i) => (
            <Fragment key={label}>
              <div
                className={`${styles.step} ${step === i + 1 ? styles.active : ""} ${step > i + 1 ? styles.completed : ""}`}
              >
                <span>{i + 1}</span>
                <label>{label}</label>
              </div>
              {i < 2 && <div className={styles.connector} />}
            </Fragment>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className={styles.card}>
          <div className={styles.stepContent}>
            <h2>Select Patient</h2>
            <p>Choose the patient for this prescription</p>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {loadingPatients ? (
              <Spinner />
            ) : (
              <div className={styles.patientList}>
                {filtered.length === 0 ? (
                  <div className={styles.noResults}>
                    {patients.length === 0
                      ? "No patients from completed consultations found."
                      : "No patients match your search."}
                  </div>
                ) : (
                  filtered.map((p) => (
                    <button
                      key={p._id}
                      className={`${styles.patientCard} ${selectedPatient?._id === p._id ? styles.selected : ""}`}
                      onClick={() => setSelectedPatient(p)}
                    >
                      <div className={styles.patientInfo}>
                        <div className={styles.patientName}>
                          {p.userId?.name || "Patient"}
                        </div>
                        <div className={styles.patientDetail}>
                          ID: {p._id?.slice(-6)} · Age: {p.age || "—"}
                        </div>
                      </div>
                      <div className={styles.checkmark}>✓</div>
                    </button>
                  ))
                )}
              </div>
            )}
            <div className={styles.actions}>
              <Button variant="outline" disabled>
                Back
              </Button>
              <Button
                variant="primary"
                disabled={!validStep1}
                onClick={() => setStep(2)}
              >
                Next: Add Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.card}>
          <div className={styles.stepContent}>
            <h2>Prescription Details</h2>
            <p>Patient: {selectedPatient?.userId?.name}</p>
            <div className={styles.formGroup}>
              <label>Diagnosis</label>
              <textarea
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Enter diagnosis…"
                rows="3"
              />
            </div>
            <div className={styles.medicinesSection}>
              <div className={styles.sectionHeader}>
                <h3>Medicines</h3>
                <button className={styles.addBtn} onClick={addMed}>
                  Add Medicine
                </button>
              </div>
              {medicines.map((med, i) => (
                <div key={i} className={styles.medicineRow}>
                  <input
                    className={styles.inputFull}
                    type="text"
                    placeholder="Medicine name"
                    value={med.name}
                    onChange={(e) => updateMed(i, "name", e.target.value)}
                  />
                  <select
                    className={styles.inputSelect}
                    value={med.dosage}
                    onChange={(e) => updateMed(i, "dosage", e.target.value)}
                  >
                    <option value="">Dosage</option>
                    {DOSAGES.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    className={styles.inputSelect}
                    value={med.frequency}
                    onChange={(e) => updateMed(i, "frequency", e.target.value)}
                  >
                    <option value="">Frequency</option>
                    {FREQUENCIES.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                  <input
                    className={styles.inputSmall}
                    type="text"
                    placeholder="Duration"
                    value={med.duration}
                    onChange={(e) => updateMed(i, "duration", e.target.value)}
                  />
                  {medicines.length > 1 && (
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeMed(i)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.formGroup}>
              <label>Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Special instructions…"
                rows="2"
              />
            </div>
            <div className={styles.followUpBox}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={followUp}
                  onChange={(e) => setFollowUp(e.target.checked)}
                />
                <span>Requires follow-up</span>
              </label>
              {followUp && (
                <input
                  type="date"
                  className={styles.followUpInput}
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              )}
            </div>
            <div className={styles.actions}>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="primary"
                disabled={!validStep2}
                onClick={() => setStep(3)}
              >
                Review Prescription
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={styles.card}>
          <div className={styles.stepContent}>
            <h2>Review Prescription</h2>
            <div className={styles.reviewBox}>
              <div className={styles.reviewSection}>
                <h3>Patient</h3>
                <p>
                  <strong>{selectedPatient?.userId?.name}</strong>
                </p>
              </div>
              <div className={styles.reviewSection}>
                <h3>Diagnosis</h3>
                <p>{diagnosis}</p>
              </div>
              <div className={styles.reviewSection}>
                <h3>Medicines</h3>
                {medicines
                  .filter((m) => m.name)
                  .map((m, i) => (
                    <div key={i} className={styles.reviewMedicine}>
                      <strong>{m.name}</strong>
                      <div className={styles.muted}>
                        {m.dosage} · {m.frequency} · {m.duration}
                      </div>
                    </div>
                  ))}
              </div>
              {instructions && (
                <div className={styles.reviewSection}>
                  <h3>Instructions</h3>
                  <p>{instructions}</p>
                </div>
              )}
              {followUp && followUpDate && (
                <div className={styles.reviewSection}>
                  <h3>Follow-up</h3>
                  <p>
                    {new Date(followUpDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
            <div className={styles.actions}>
              <Button variant="outline" onClick={() => setStep(2)}>
                Edit
              </Button>
              <Button variant="primary" onClick={submit} disabled={submitting}>
                {submitting ? "Issuing…" : "Issue Prescription"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
