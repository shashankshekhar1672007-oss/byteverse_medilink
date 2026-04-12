export default function Toast({ message, type = "success" }) {
  return (
    <div className="toast-wrap">
      <div
        className={`toast ${type === "error" ? "error" : type === "warning" ? "warning" : ""}`}
      >
        {type === "success" ? "✓" : type === "error" ? "✕" : "⚠"} {message}
      </div>
    </div>
  );
}
