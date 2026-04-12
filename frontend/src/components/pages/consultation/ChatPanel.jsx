import styles from "../CSS/Consultation.module.css";
import { formatMessageTime, isOwnMessage } from "./consultationUtils";
import { useState } from "react";

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
  const [reactingTo, setReactingTo] = useState(null);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !disabled) onSend();
  };

  const handleReaction = (messageId, emoji) => {
    // In a real app, this would send the reaction to the server
    console.log(`Reacting to message ${messageId} with ${emoji}`);
    setReactingTo(null);
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
            onReaction={handleReaction}
            reactingTo={reactingTo}
            setReactingTo={setReactingTo}
          />
        ))}

        {peerTyping && (
          <div className={`${styles.msg} ${styles.doctor}`}>
            <div className={styles.bubble}>
              <TypingIndicator />
            </div>
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
          {sending ? "..." : "Send"}
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

function TypingIndicator() {
  return (
    <div className={styles.typingIndicator}>
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className={styles.emptyChat}>
      <div className={styles.emptyChatIcon}>💬</div>
      <div className={styles.emptyChatTitle}>No messages yet</div>
      <div className={styles.emptyChatMeta}>
        Start the conversation when the consultation is active.
      </div>
    </div>
  );
}

function MessageBubble({ message, user, onReaction, reactingTo, setReactingTo }) {
  const isMe = isOwnMessage(message, user);
  const isPending = message._id?.startsWith("tmp_");

  const handleReactionClick = (emoji) => {
    onReaction(message._id, emoji);
  };

  return (
    <div className={`${styles.msg} ${isMe ? styles.patient : styles.doctor}`}>
      <div className={styles.bubbleContainer}>
        <div className={styles.bubble}>
          {message.text}
          {message.reactions && message.reactions.length > 0 && (
            <div className={styles.reactions}>
              {message.reactions.map((reaction, idx) => (
                <span key={idx} className={styles.reaction}>
                  {reaction.emoji} {reaction.count}
                </span>
              ))}
            </div>
          )}
        </div>
        {!isMe && (
          <button
            className={styles.reactionBtn}
            onClick={() => setReactingTo(reactingTo === message._id ? null : message._id)}
            title="React"
          >
            😊
          </button>
        )}
      </div>
      {reactingTo === message._id && (
        <div className={styles.reactionPicker}>
          {["👍", "❤️", "😂", "😮", "😢", "😡"].map((emoji) => (
            <button
              key={emoji}
              className={styles.emojiBtn}
              onClick={() => handleReactionClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <div className={styles.msgTime}>
        {formatMessageTime(message.createdAt)}
        {isMe && (
          <span className={styles.messageAck}>
            {isPending ? "○" : "✓"}
          </span>
        )}
      </div>
    </div>
  );
}
