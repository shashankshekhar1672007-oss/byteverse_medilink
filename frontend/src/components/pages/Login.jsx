import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button } from "../ui/UI";
import styles from "./CSS/Login.module.css";
import logo from "../../assets/logo.png";

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
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [notice, setNotice] = useState("");
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
      if (
        err.code === "EMAIL_NOT_VERIFIED" ||
        /verify/i.test(err.message || "")
      ) {
        const nextEmail = email.trim().toLowerCase();
        setVerificationEmail(nextEmail);
        setTab("verify");
        setNotice(
          "Verify your email before logging in. Enter the code sent to your inbox.",
        );
        try {
          const { auth } = await import("../../services/api");
          await auth.requestVerification(nextEmail);
        } catch {}
      }
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
      const registered = await auth.register(payload);
      const needsVerification =
        registered?.user?.isVerified === false ||
        registered?.user?.emailVerified === false ||
        registered?.requiresVerification !== false;
      if (needsVerification) {
        setVerificationEmail(payload.email);
        setTab("verify");
        setNotice("Account created. Please verify your email before login.");
        try {
          await auth.requestVerification(payload.email);
        } catch {}
      } else {
        await login(email.trim().toLowerCase(), password);
      }
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e && e.preventDefault();
    setError("");
    setNotice("");
    if (!verificationEmail || !verificationCode) {
      setError("Enter email and verification code");
      return;
    }
    setLoading(true);
    try {
      const { auth } = await import("../../services/api");
      await auth.verifyEmail(
        verificationEmail.trim().toLowerCase(),
        verificationCode.trim(),
      );
      setNotice("Email verified. You can now login.");
      setTab("login");
      setEmail(verificationEmail.trim().toLowerCase());
      setVerificationCode("");
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setError("");
    if (!verificationEmail && !email) {
      setError("Enter your email first");
      return;
    }
    setLoading(true);
    try {
      const targetEmail = (verificationEmail || email).trim().toLowerCase();
      const { auth } = await import("../../services/api");
      await auth.requestVerification(targetEmail);
      setVerificationEmail(targetEmail);
      setNotice("Verification code sent.");
    } catch (err) {
      setError(err.message || "Could not send verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={`${styles.card} ${styles.scrollCard}`}>
        <div className={styles.header}>
          <img src={logo} alt="MediLink logo" className={styles.logoImage} />
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
          <button
            className={`${styles.tabBtn} ${tab === "verify" ? styles.tabActive : ""}`}
            onClick={() => {
              setTab("verify");
              setError("");
              setNotice("");
              if (!verificationEmail && email)
                setVerificationEmail(email.trim().toLowerCase());
            }}
          >
            Verify
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

        {notice && <div className={styles.notice}>{notice}</div>}

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
        ) : tab === "register" ? (
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
        ) : (
          <form onSubmit={handleVerifyEmail} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Email</label>
              <input
                type="email"
                value={verificationEmail}
                onChange={(e) => setVerificationEmail(e.target.value)}
                placeholder="Email to verify"
                disabled={loading}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Verification Code</label>
              <input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter code"
                disabled={loading}
                inputMode="numeric"
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <Button
              variant="primary"
              className={styles.loginBtn}
              disabled={loading}
              type="submit"
            >
              {loading ? "Verifying..." : "Verify Email"}
            </Button>
            <button
              className={styles.linkBtn}
              disabled={loading}
              onClick={resendVerification}
              type="button"
            >
              Resend verification code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
