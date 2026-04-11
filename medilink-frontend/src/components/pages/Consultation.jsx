import { useState, useRef, useEffect, useCallback } from "react";
import { useApp, PAGES } from "../../context/AppContext";
import { Spinner, ErrorMsg } from "../ui/UI";
import { consultations as consultApi } from "../../services/api";
import {
  connectSocket,
  joinConsultation,
  sendSocketMessage,
  sendTyping,
  getSocket,
  EVENTS,
} from "../../services/socket";
import styles from "./CSS/Consultation.module.css";

const ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export default function Consultation() {
  const { navigate, user, selectedConsultationId, selectedDoctor, showToast } =
    useApp();

  // ── Data state ────────────────────────────────────────────
  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // ── Connection state ──────────────────────────────────────
  const [socketReady, setSocketReady] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // ── Video state (kept in state so React re-renders on change) ─
  const [callStatus, setCallStatus] = useState("idle"); // idle|ringing|calling|connected|failed
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [hasLocalStream, setHasLocalStream] = useState(false); // drives PiP visibility
  const [hasRemoteStream, setHasRemoteStream] = useState(false); // drives remote video visibility

  // ── Refs ──────────────────────────────────────────────────
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStream = useRef(null);
  const screenStream = useRef(null);
  const pc = useRef(null); // RTCPeerConnection
  const incomingOffer = useRef(null); // stored offer before user accepts
  const consultIdRef = useRef(selectedConsultationId);

  useEffect(() => {
    consultIdRef.current = selectedConsultationId;
  }, [selectedConsultationId]);

  // ── Timer ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  // ── Load consultation + message history ───────────────────
  useEffect(() => {
    if (!selectedConsultationId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [cRes, mRes] = await Promise.all([
          consultApi.getById(selectedConsultationId),
          consultApi.getMessages(selectedConsultationId),
        ]);
        setConsultation(cRes.data);
        setMessages(mRes.data || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedConsultationId]);

  // ── Deduplicated message adder ────────────────────────────
  const addMessage = useCallback((msg) => {
    setMessages((prev) => {
      // Replace optimistic tmp message if real one matches sender+text
      const tmpIdx = prev.findIndex(
        (m) =>
          m._id?.startsWith("tmp_") &&
          m.text === msg.text &&
          m.senderRole === msg.senderRole,
      );
      if (tmpIdx !== -1) {
        const next = [...prev];
        next[tmpIdx] = msg;
        return next;
      }
      // Skip true duplicates
      if (prev.some((m) => m._id === msg._id)) return prev;
      return [...prev, msg];
    });
  }, []);

  // ── Socket.io + WebRTC signalling ─────────────────────────
  useEffect(() => {
    if (!selectedConsultationId || !user) return;

    const token = localStorage.getItem("ml_token");
    const sock = connectSocket(token);

    const onConnect = () => {
      setSocketReady(true);
      joinConsultation(selectedConsultationId);
    };
    const onDisconnect = () => setSocketReady(false);
    const onMsg = (msg) => addMessage(msg);
    const onTyping = () => {
      setPeerTyping(true);
    };
    const onStopTyping = () => setPeerTyping(false);

    // ── Incoming call offer ───────────────────────────────
    const onOffer = ({ offer }) => {
      incomingOffer.current = offer;
      setCallStatus("ringing"); // show "Accept" button
    };

    // ── Caller receives answer ────────────────────────────
    const onAnswer = async ({ answer }) => {
      try {
        if (pc.current && pc.current.signalingState !== "stable") {
          await pc.current.setRemoteDescription(
            new RTCSessionDescription(answer),
          );
        }
      } catch (e) {
        console.warn("setRemoteDescription(answer):", e.message);
      }
    };

    // ── ICE candidates ────────────────────────────────────
    const onIce = async ({ candidate }) => {
      try {
        if (pc.current && candidate) {
          await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.warn("addIceCandidate:", e.message);
      }
    };

    // ── Remote ended call ────────────────────────────────
    const onCallEnded = () => {
      showToast("The other party ended the call");
      cleanupCall();
    };

    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on(EVENTS.RECEIVE_MESSAGE, onMsg);
    sock.on(EVENTS.TYPING, onTyping);
    sock.on(EVENTS.STOP_TYPING, onStopTyping);
    sock.on("webrtc:offer", onOffer);
    sock.on("webrtc:answer", onAnswer);
    sock.on("webrtc:ice", onIce);
    sock.on("webrtc:ended", onCallEnded);

    if (sock.connected) onConnect();

    return () => {
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.off(EVENTS.RECEIVE_MESSAGE, onMsg);
      sock.off(EVENTS.TYPING, onTyping);
      sock.off(EVENTS.STOP_TYPING, onStopTyping);
      sock.off("webrtc:offer", onOffer);
      sock.off("webrtc:answer", onAnswer);
      sock.off("webrtc:ice", onIce);
      sock.off("webrtc:ended", onCallEnded);
    };
  }, [selectedConsultationId, user, addMessage, showToast]);

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, []);

  // ══════════════════════════════════════════════════════════
  //  CHAT
  // ══════════════════════════════════════════════════════════

  const sendMsg = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setSending(true);
    sendTyping(selectedConsultationId, false);

    const viaSocket = sendSocketMessage(selectedConsultationId, text);

    if (viaSocket) {
      // Optimistic message — will be replaced when server echoes back
      setMessages((prev) => [
        ...prev,
        {
          _id: `tmp_${Date.now()}`,
          sender: { _id: user._id },
          senderRole: user.role,
          text,
          createdAt: new Date().toISOString(),
        },
      ]);
    } else {
      // REST fallback when socket is disconnected
      try {
        const r = await consultApi.sendMessage(selectedConsultationId, text);
        addMessage(r.data);
      } catch (e) {
        showToast(e.message, "error");
        setInput(text);
      }
    }
    setSending(false);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    sendTyping(selectedConsultationId, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => sendTyping(selectedConsultationId, false),
      1500,
    );
  };

  // ══════════════════════════════════════════════════════════
  //  WebRTC HELPERS
  // ══════════════════════════════════════════════════════════

  const buildPeerConnection = () => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }

    const conn = new RTCPeerConnection(ICE);
    pc.current = conn;

    // Send ICE candidates
    conn.onicecandidate = ({ candidate }) => {
      if (candidate) {
        getSocket()?.emit("webrtc:ice", {
          candidate,
          consultationId: consultIdRef.current,
        });
      }
    };

    // Connection state
    conn.onconnectionstatechange = () => {
      const s = conn.connectionState;
      if (s === "connected") setCallStatus("connected");
      if (s === "failed" || s === "disconnected") {
        setCallStatus("failed");
        setHasRemoteStream(false);
      }
    };

    // Remote track arrives → show remote video
    conn.ontrack = ({ streams }) => {
      if (streams[0] && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = streams[0];
        setHasRemoteStream(true);
      }
    };

    return conn;
  };

  const getLocalMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    localStream.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    setHasLocalStream(true);
    return stream;
  };

  const addTracksToConn = (stream, conn) => {
    stream.getTracks().forEach((track) => conn.addTrack(track, stream));
  };

  const cleanupCall = () => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    screenStream.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pc.current?.close();
    pc.current = null;
    incomingOffer.current = null;
    setHasLocalStream(false);
    setHasRemoteStream(false);
    setCallStatus("idle");
    setVideoOn(true);
    setAudioOn(true);
    setScreenSharing(false);
  };

  // ══════════════════════════════════════════════════════════
  //  VIDEO CALL ACTIONS
  // ══════════════════════════════════════════════════════════

  // Caller: start outgoing call
  const startCall = async () => {
    setCallStatus("calling");
    try {
      const stream = await getLocalMedia();
      const conn = buildPeerConnection();
      addTracksToConn(stream, conn);

      const offer = await conn.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      });
      await conn.setLocalDescription(offer);

      getSocket()?.emit("webrtc:offer", {
        offer,
        consultationId: selectedConsultationId,
      });
    } catch (e) {
      setCallStatus("failed");
      showToast("Could not access camera/mic: " + e.message, "error");
    }
  };

  // Callee: accept incoming call (called when user clicks Accept)
  const acceptCall = async () => {
    const offer = incomingOffer.current;
    if (!offer) return;
    setCallStatus("calling");
    try {
      const stream = await getLocalMedia();
      const conn = buildPeerConnection();
      addTracksToConn(stream, conn); // ← add local tracks BEFORE setRemoteDescription

      await conn.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await conn.createAnswer();
      await conn.setLocalDescription(answer);

      getSocket()?.emit("webrtc:answer", {
        answer,
        consultationId: selectedConsultationId,
      });
      incomingOffer.current = null;
    } catch (e) {
      setCallStatus("failed");
      showToast("Could not start call: " + e.message, "error");
    }
  };

  // Decline incoming call
  const declineCall = () => {
    incomingOffer.current = null;
    getSocket()?.emit("webrtc:ended", {
      consultationId: selectedConsultationId,
    });
    setCallStatus("idle");
  };

  // Toggle camera
  const toggleVideo = () => {
    const track = localStream.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoOn((v) => !v);
  };

  // Toggle mic
  const toggleAudio = () => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setAudioOn((v) => !v);
  };

  // Screen share
  const toggleScreenShare = async () => {
    const conn = pc.current;
    if (!conn) {
      showToast("Start a call first", "error");
      return;
    }

    if (screenSharing) {
      screenStream.current?.getTracks().forEach((t) => t.stop());
      screenStream.current = null;
      const camTrack = localStream.current?.getVideoTracks()[0];
      if (camTrack) {
        const sender = conn.getSenders().find((s) => s.track?.kind === "video");
        await sender?.replaceTrack(camTrack);
        if (localVideoRef.current)
          localVideoRef.current.srcObject = localStream.current;
      }
      setScreenSharing(false);
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        screenStream.current = ss;
        const screenTrack = ss.getVideoTracks()[0];
        const sender = conn.getSenders().find((s) => s.track?.kind === "video");
        await sender?.replaceTrack(screenTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = ss;
        screenTrack.onended = () => {
          // User clicked browser's "Stop sharing" button
          screenStream.current = null;
          const camTrack = localStream.current?.getVideoTracks()[0];
          if (camTrack) {
            const s2 = conn.getSenders().find((s) => s.track?.kind === "video");
            s2?.replaceTrack(camTrack);
            if (localVideoRef.current)
              localVideoRef.current.srcObject = localStream.current;
          }
          setScreenSharing(false);
        };
        setScreenSharing(true);
      } catch (e) {
        if (e.name !== "NotAllowedError")
          showToast("Screen share failed: " + e.message, "error");
      }
    }
  };

  // End video call (keep consultation open)
  const endCall = () => {
    getSocket()?.emit("webrtc:ended", {
      consultationId: selectedConsultationId,
    });
    cleanupCall();
  };

  // Leave consultation entirely
  const handleLeave = async () => {
    endCall();
    try {
      if (selectedConsultationId) await consultApi.end(selectedConsultationId);
    } catch (_) {}
    navigate(
      user?.role === "doctor"
        ? PAGES.DOCTOR_DASHBOARD
        : PAGES.CONSULTATION_LIST,
    );
  };

  // ══════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════

  const isDoc = user?.role === "doctor";
  const peer = isDoc
    ? consultation?.patient || {}
    : consultation?.doctor || selectedDoctor || {};
  const peerName =
    peer?.userId?.name || peer?.name || (isDoc ? "Patient" : "Doctor");
  const initials =
    peerName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  const spec = isDoc ? "" : peer?.specialization || "";
  const myInitials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "ME";
  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (loading)
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Spinner size={36} />
        </div>
      </div>
    );
  if (error && !consultation)
    return (
      <div className={styles.page}>
        <ErrorMsg message={error} onRetry={() => window.location.reload()} />
      </div>
    );

  return (
    <div className={styles.page}>
      {/* ── Header ────────────────────────────────────────── */}
      <div className={styles.greeting}>
        <h1>Live Consultation</h1>
        <p className={styles.greetingSub}>
          {socketReady ? (
            <>
              <span className={styles.liveIndicator}>●</span> Connected with{" "}
              {peerName}
              {spec ? ` · ${spec}` : ""}
            </>
          ) : (
            `Connecting to ${peerName}…`
          )}
        </p>
      </div>

      {/* ── Incoming call banner ───────────────────────────── */}
      {callStatus === "ringing" && (
        <div className={styles.incomingBanner}>
          <div className={styles.incomingInfo}>
            <div className={styles.ringPulse} />
            <div>
              <div className={styles.incomingTitle}>📹 Incoming video call</div>
              <div className={styles.incomingFrom}>{peerName}</div>
            </div>
          </div>
          <div className={styles.incomingActions}>
            <button className={styles.declineBtn} onClick={declineCall}>
              ✕ Decline
            </button>
            <button className={styles.acceptBtn} onClick={acceptCall}>
              📞 Accept
            </button>
          </div>
        </div>
      )}

      <div className={styles.layout}>
        {/* ══════════════════════════════════════════════════
            CHAT PANEL
        ════════════════════════════════════════════════════ */}
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <div className={styles.docAvatar}>{initials}</div>
            <div className={styles.chatHeaderMain}>
              <div className={styles.chatDocName}>{peerName}</div>
              <div className={styles.chatStatus}>
                <span className={styles.onlineDot} />
                {peerTyping ? "typing…" : "Online"}
              </div>
            </div>
            <span
              className={
                socketReady ? styles.liveBadge : styles.connectingBadge
              }
            >
              {socketReady ? "● LIVE" : "connecting…"}
            </span>
          </div>

          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.emptyChat}>
                <div className={styles.emptyChatIcon}>💬</div>
                <div className={styles.emptyChatTitle}>Start the conversation</div>
                <div className={styles.emptyChatMeta}>
                  🔒 Messages are private
                </div>
              </div>
            )}

            {messages.map((msg) => {
              // Fix: use _id comparison only, fall back to senderRole when sender isn't populated
              const senderId = msg.sender?._id || msg.sender;
              const isMe = senderId
                ? String(senderId) === String(user?._id)
                : msg.senderRole === user?.role;

              const time = msg.createdAt
                ? new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              const isPending = msg._id?.startsWith("tmp_");

              return (
                <div
                  key={msg._id}
                  className={`${styles.msg} ${isMe ? styles.patient : styles.doctor}`}
                >
                  <div className={styles.bubble}>{msg.text}</div>
                  <div className={styles.msgTime}>
                    {time}
                    {isMe && (
                      <span className={styles.messageAck}>
                        {isPending ? "○" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {peerTyping && (
              <div className={`${styles.msg} ${styles.doctor}`}>
                <div className={styles.bubble}>typing...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className={styles.chatInput}>
            <input
              placeholder={socketReady ? "Type a message…" : "Connecting…"}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMsg()}
              disabled={sending}
              autoComplete="off"
            />
            <button
              className={styles.sendBtn}
              onClick={sendMsg}
              disabled={sending || !input.trim()}
              title="Send"
            >
              ➤
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            VIDEO PANEL
        ════════════════════════════════════════════════════ */}
        <div className={styles.videoPanel}>
          <div className={styles.videoHeader}>
            <div className={`${styles.docAvatar} ${styles.videoHeaderAvatar}`}>
              {initials}
            </div>
            <div>
              <div className={styles.chatDocName}>{peerName}</div>
              <div className={styles.videoSpec}>{spec}</div>
            </div>
            <div className={styles.timer}>● {fmt(elapsed)}</div>
          </div>

          {/* Remote + local video area */}
          <div className={styles.videoMain}>
            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`${styles.remoteVideo} ${hasRemoteStream ? styles.videoVisible : styles.videoHidden}`}
            />

            {/* Placeholder */}
            {!hasRemoteStream && (
              <div className={styles.videoPlaceholder}>
                <div className={styles.videoAvatar}>{initials}</div>
                {callStatus === "idle" && (
                  <p className={styles.callHint}>
                    Click <strong>📹 Call</strong> to start video
                  </p>
                )}
                {callStatus === "ringing" && (
                  <p className={styles.callHint}>
                    📞 Incoming call — tap Accept above
                  </p>
                )}
                {callStatus === "calling" && (
                  <p className={styles.callHint}>⏳ Calling {peerName}…</p>
                )}
                {callStatus === "connected" && (
                  <p className={styles.callHint}>
                    Connected — waiting for video…
                  </p>
                )}
                {callStatus === "failed" && (
                  <p className={`${styles.callHint} ${styles.callHintError}`}>
                    Call failed. Try again.
                  </p>
                )}
              </div>
            )}

            {/* Local PiP — always show when camera is active */}
            <div
              className={`${styles.pip} ${hasLocalStream ? styles.videoVisible : styles.videoHidden}`}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={styles.localVideo}
              />
            </div>

            {/* PiP placeholder when no camera */}
            {!hasLocalStream && (
              <div className={styles.pipPlaceholder}>
                <span className={styles.pipPlaceholderText}>{myInitials}</span>
              </div>
            )}

            {callStatus === "connected" && (
              <div className={styles.videoLabel}>
                {screenSharing ? "🖥 Sharing screen" : "HD · Encrypted"}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className={styles.videoControls}>
            {/* Camera */}
            <button
              className={`${styles.vcBtn} ${!videoOn ? styles.vcOff : ""}`}
              onClick={toggleVideo}
              disabled={!hasLocalStream}
              title={videoOn ? "Turn off camera" : "Turn on camera"}
            >
              {videoOn ? "📷" : "🚫"}
            </button>

            {/* Mic */}
            <button
              className={`${styles.vcBtn} ${!audioOn ? styles.vcOff : ""}`}
              onClick={toggleAudio}
              disabled={!hasLocalStream}
              title={audioOn ? "Mute" : "Unmute"}
            >
              {audioOn ? "🎙️" : "🔇"}
            </button>

            {/* Screen share */}
            <button
              className={`${styles.vcBtn} ${screenSharing ? styles.vcActive : ""}`}
              onClick={toggleScreenShare}
              disabled={callStatus !== "connected"}
              title="Share screen"
            >
              🖥️
            </button>

            {/* Call control */}
            {(callStatus === "idle" || callStatus === "failed") && (
              <button
                className={`${styles.vcBtn} ${styles.callBtn}`}
                onClick={startCall}
              >
                📹 Call
              </button>
            )}
            {callStatus === "calling" && (
              <button
                className={`${styles.vcBtn} ${styles.hangBtn}`}
                onClick={endCall}
              >
                ✕ Cancel
              </button>
            )}
            {callStatus === "connected" && (
              <button
                className={`${styles.vcBtn} ${styles.hangBtn}`}
                onClick={endCall}
              >
                📵 End
              </button>
            )}

            {/* Leave consultation */}
            <button
              className={`${styles.vcBtn} ${styles.leaveBtn}`}
              onClick={handleLeave}
            >
              ✕ Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
