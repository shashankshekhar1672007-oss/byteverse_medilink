import { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import styles from "./ChatbotWidget.module.css";

const SUGGESTIONS = [
  "What are common cold symptoms?",
  "How to lower blood pressure?",
  "When should I see a doctor?",
  "What is a normal heart rate?",
];

export default function ChatbotWidget() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    {
      id: 1,
      role: "bot",
      text: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm MediBot. Ask me any health questions.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const RESPONSES = {
    "blood pressure": [
      "Maintain a healthy diet low in sodium.",
      "Exercise regularly, at least 30 min/day.",
      "Avoid stress and get adequate sleep.",
      "Consult your doctor if readings are consistently high.",
    ],
    cold: [
      "Rest and stay hydrated.",
      "Use saline nasal drops for congestion.",
      "Take OTC medications for symptoms.",
      "See a doctor if symptoms persist beyond 10 days.",
    ],
    "heart rate": [
      "A normal resting heart rate is 60-100 bpm.",
      "Athletes may have a lower resting rate (40-60 bpm).",
      "Factors like stress, caffeine, and illness can raise it.",
      "Consult a cardiologist for persistent irregularities.",
    ],
    doctor: [
      "Seek immediate care for chest pain, difficulty breathing, or signs of stroke.",
      "See a doctor for fever above 103°F, persistent symptoms, or worsening conditions.",
      "Schedule a routine check-up at least once a year.",
    ],
    default: [
      "That is a great health question. For accurate medical advice, please consult your doctor through the Consult section.",
      "I can provide general health information, but your doctor knows your specific situation best.",
      "Consider booking a consultation with one of our verified specialists for personalized advice.",
    ],
  };

  const getResponse = (q) => {
    const lower = q.toLowerCase();
    for (const [k, v] of Object.entries(RESPONSES)) {
      if (k !== "default" && lower.includes(k))
        return v[Math.floor(Math.random() * v.length)];
    }
    return RESPONSES.default[
      Math.floor(Math.random() * RESPONSES.default.length)
    ];
  };

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput("");
    setMsgs((prev) => [...prev, { id: Date.now(), role: "user", text: q }]);
    setTyping(true);
    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
    setTyping(false);
    setMsgs((prev) => [
      ...prev,
      { id: Date.now() + 1, role: "bot", text: getResponse(q) },
    ]);
  };

  return (
    <>
      <button
        className={styles.chatToggle}
        onClick={() => setOpen((o) => !o)}
        type="button"
        aria-label={open ? "Close MediBot" : "Open MediBot"}
      >
        {open ? "✕" : "💬"}
      </button>
      {open && (
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <div className={styles.chatTitle}>🤖 MediBot</div>
            <div className={styles.chatSub}>
              Health Assistant · Always available
            </div>
          </div>
          <div className={styles.chatMessages}>
            {msgs.map((m) => (
              <div
                className={`${styles.messageWrap} ${
                  m.role === "user"
                    ? styles.messageWrapUser
                    : styles.messageWrapBot
                }`}
                key={m.id}
              >
                <div
                  className={`${styles.message} ${
                    m.role === "user" ? styles.messageUser : styles.messageBot
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && <div className={styles.typing}>Typing…</div>}
            <div ref={bottomRef} />
          </div>
          <div className={styles.suggestions}>
            {SUGGESTIONS.slice(0, 2).map((s) => (
              <button
                className={styles.suggestionBtn}
                key={s}
                onClick={() => send(s)}
                type="button"
              >
                {s}
              </button>
            ))}
          </div>
          <div className={styles.inputRow}>
            <input
              className={styles.chatInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask a health question…"
            />
            <button
              className={styles.sendBtn}
              onClick={() => send()}
              type="button"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
