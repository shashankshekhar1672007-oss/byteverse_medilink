import styles from "../CSS/Consultation.module.css";
import { formatMessageTime, isOwnMessage } from "./consultationUtils";

export default function ChatPanel({
  bottomRef,
  disabled,
  disabledReason,
  input,
  initials,
  messages,
  onInputChange,
  onSend,
  peerName,
  peerTyping,
  sending,
  socketReady,
  user,
}) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !disabled) onSend();
  };

  return (
    <div className={styles.chatPanel}>
      <ChatHeader
        initials={initials}
        disabled={disabled}
        peerName={peerName}
        peerTyping={peerTyping}
        socketReady={socketReady}
      />

      <div className={styles.messages}>
        {messages.length === 0 && <EmptyChat />}

        {messages.map((message, index) => (
          <MessageBubble
            key={message._id || `${message.createdAt}-${index}`}
            message={message}
            user={user}
          />
        ))}

        {peerTyping && (
          <div className={`${styles.msg} ${styles.doctor}`}>
            <div className={styles.bubble}>typing...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className={styles.chatInput}>
        <input
          placeholder={
            disabled
              ? disabledReason
              : socketReady
                ? "Type a message..."
                : "Connecting..."
          }
          value={input}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          disabled={sending || disabled}
          autoComplete="off"
        />
        <button
          className={styles.sendBtn}
          onClick={onSend}
          disabled={sending || disabled || !input.trim()}
          title="Send"
          type="button"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function ChatHeader({ disabled, initials, peerName, peerTyping, socketReady }) {
  return (
    <div className={styles.chatHeader}>
      <div className={styles.docAvatar}>{initials}</div>
      <div className={styles.chatHeaderMain}>
        <div className={styles.chatDocName}>{peerName}</div>
        <div className={styles.chatStatus}>
          <span className={styles.onlineDot} />
          {peerTyping ? "typing..." : "Online"}
        </div>
      </div>
      <span className={socketReady ? styles.liveBadge : styles.connectingBadge}>
        {socketReady && !disabled
          ? "LIVE"
          : socketReady
            ? "PENDING"
            : "connecting..."}
      </span>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className={styles.emptyChat}>
      <div className={styles.emptyChatIcon}>💬</div>
      <div className={styles.emptyChatTitle}>Start the conversation</div>
      <div className={styles.emptyChatMeta}>Messages are private</div>
    </div>
  );
}

function MessageBubble({ message, user }) {
  const isMe = isOwnMessage(message, user);
  const isPending = message._id?.startsWith("tmp_");

  return (
    <div className={`${styles.msg} ${isMe ? styles.patient : styles.doctor}`}>
      <div className={styles.bubble}>{message.text}</div>
      <div className={styles.msgTime}>
        {formatMessageTime(message.createdAt)}
        {isMe && (
          <span className={styles.messageAck}>{isPending ? "○" : "✓"}</span>
        )}
      </div>
    </div>
  );
}
