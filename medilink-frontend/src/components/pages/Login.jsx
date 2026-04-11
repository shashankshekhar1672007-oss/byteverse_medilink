import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button } from "../ui/UI";
import styles from "./CSS/Login.module.css";

const SPECIALIZATIONS = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Neurologist",
  "Orthopedic",
  "Pediatrician",
  "Psychiatrist",
  "Gynecologist",
  "Urologist",
  "Oncologist",
  "ENT Specialist",
];

export default function Login() {
  const { login } = useApp();
  const [tab, setTab] = useState("login");
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualification, setQualification] = useState("");
  const [regNo, setRegNo] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e && e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err.message || "Invalid credentials");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e && e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (
      role === "doctor" &&
      (!specialization || !qualification || !regNo || !price)
    ) {
      setError("All doctor fields are required");
      return;
    }
    setLoading(true);
    try {
      const { auth } = await import("../../services/api");
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      };
      if (role === "doctor")
        Object.assign(payload, {
          specialization,
          qualification,
          regNo,
          price: parseFloat(price),
        });
      await auth.register(payload);
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={`${styles.card} ${styles.scrollCard}`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            Medi<span>Link</span>
          </div>
          <h1>Welcome to MediLink</h1>
          <p>Healthcare made simple and accessible</p>
        </div>

        <div className={styles.tabRow}>
          <button
            className={`${styles.tabBtn} ${tab === "login" ? styles.tabActive : ""}`}
            onClick={() => {
              setTab("login");
              setError("");
            }}
          >
            Login
          </button>
          <button
            className={`${styles.tabBtn} ${tab === "register" ? styles.tabActive : ""}`}
            onClick={() => {
              setTab("register");
              setError("");
            }}
          >
            Register
          </button>
        </div>

        {tab === "register" && (
          <div className={styles.roleSelector}>
            <label
              className={`${styles.roleOption} ${role === "patient" ? styles.active : ""}`}
            >
              <input
                type="radio"
                value="patient"
                checked={role === "patient"}
                onChange={(e) => setRole(e.target.value)}
              />
              <span>Patient</span>
            </label>
            <label
              className={`${styles.roleOption} ${role === "doctor" ? styles.active : ""}`}
            >
              <input
                type="radio"
                value="doctor"
                checked={role === "doctor"}
                onChange={(e) => setRole(e.target.value)}
              />
              <span>Doctor</span>
            </label>
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <Button
              variant="primary"
              className={styles.loginBtn}
              disabled={loading}
              type="submit"
            >
              {loading ? "Logging in…" : "Login"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                disabled={loading}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                disabled={loading}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                disabled={loading}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                disabled={loading}
              />
            </div>
            {role === "doctor" && (
              <>
                <div className={styles.inputGroup}>
                  <label>Specialization</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Select specialization</option>
                    {SPECIALIZATIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.inputGroup}>
                  <label>Qualification</label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. MBBS, MD"
                    disabled={loading}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Registration No.</label>
                  <input
                    type="text"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="Medical council reg. no."
                    disabled={loading}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Consultation Price (₹)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 500"
                    min="0"
                    disabled={loading}
                  />
                </div>
              </>
            )}
            {error && <div className={styles.error}>{error}</div>}
            <Button
              variant="primary"
              className={styles.loginBtn}
              disabled={loading}
              type="submit"
            >
              {loading ? "Creating account…" : "Create Account"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
