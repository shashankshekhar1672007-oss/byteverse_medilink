import { useCallback, useEffect, useRef, useState } from "react";
import { PAGES } from "../../../context/AppContext";
import { consultations as consultApi } from "../../../services/api";
import { playIncomingMessageTone } from "../../../services/sounds";
import {
  connectSocket,
  EVENTS,
  getSocket,
  joinConsultation,
  requestVideoCall as requestSocketVideoCall,
  sendSocketMessage,
  sendTyping,
} from "../../../services/socket";
import { isOwnMessage } from "./consultationUtils";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useConsultationSession({
  navigate,
  selectedConsultationId,
  showToast,
  user,
}) {
  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [socketReady, setSocketReady] = useState(false);
  const [peerReady, setPeerReady] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [callStatus, setCallStatus] = useState("idle");
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStream = useRef(null);
  const screenStream = useRef(null);
  const pc = useRef(null);
  const incomingOffer = useRef(null);
  const pendingIceCandidates = useRef([]);
  const ringAudio = useRef(null);
  const popoutWindow = useRef(null);
  const consultIdRef = useRef(selectedConsultationId);
  const pendingVideoStart = useRef(false);
  const lastRemoteCallEndAt = useRef(0);
  const isConsultationActive = consultation?.status === "active";

  useEffect(() => {
    consultIdRef.current = selectedConsultationId;
  }, [selectedConsultationId]);

  useEffect(() => {
    if (callStatus !== "connected") return undefined;

    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  useEffect(() => {
    ringAudio.current = new Audio("/ringtone.mp3");
    ringAudio.current.loop = true;
    return () => {
      ringAudio.current?.pause();
      ringAudio.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectedConsultationId) {
      setLoading(false);
      return;
    }

    let ignore = false;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const [consultationRes, messagesRes] = await Promise.all([
          consultApi.getById(selectedConsultationId),
          consultApi.getMessages(selectedConsultationId),
        ]);

        if (ignore) return;
        setConsultation(consultationRes.data);
        setMessages(messagesRes.data || []);
      } catch (e) {
        if (!ignore) setError(e.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedConsultationId]);

  const addMessage = useCallback((message) => {
    setMessages((prev) => {
      const optimisticIndex = prev.findIndex(
        (item) =>
          item._id?.startsWith("tmp_") &&
          item.text === message.text &&
          item.senderRole === message.senderRole,
      );

      if (optimisticIndex !== -1) {
        const next = [...prev];
        next[optimisticIndex] = message;
        return next;
      }

      if (prev.some((item) => item._id === message._id)) return prev;
      return [...prev, message];
    });
  }, []);

  const emitSignal = useCallback(
    (eventName, payload = {}) => {
      const sock = getSocket();
      if (!sock?.connected) {
        showToast(
          "Video signal is disconnected. Please wait and try again.",
          "error",
        );
        return false;
      }

      sock.emit(eventName, {
        ...payload,
        consultationId: consultIdRef.current,
      });
      return true;
    },
    [showToast],
  );

  const stopIncomingRing = useCallback(() => {
    if (ringAudio.current) {
      ringAudio.current.pause();
      ringAudio.current.currentTime = 0;
    }
  }, []);

  const syncVideoPopup = useCallback(() => {
    const win = popoutWindow.current;
    if (!win || win.closed) return;

    const remoteVideo = win.document.getElementById("remoteVideoPopout");
    const localVideo = win.document.getElementById("localVideoPopout");
    const status = win.document.getElementById("callStatusPopout");

    if (remoteVideo) {
      remoteVideo.srcObject = remoteVideoRef.current?.srcObject || null;
    }
    if (localVideo) {
      localVideo.srcObject = localStream.current || null;
    }
    if (status) {
      status.textContent =
        callStatus === "connected"
          ? "Connected"
          : callStatus === "ringing"
            ? "Incoming call"
            : callStatus === "calling"
              ? "Calling…"
              : "Ready to connect";
    }
  }, [callStatus]);

  const openVideoWindow = useCallback(() => {
    if (!window?.open) {
      showToast("Browser does not support pop-out video", "warning");
      return;
    }

    const win = window.open(
      "",
      "MediLinkCall",
      "width=920,height=620,resizable=yes,scrollbars=no",
    );
    if (!win) {
      showToast(
        "Popup blocked. Allow popups to open the video window.",
        "warning",
      );
      return;
    }

    popoutWindow.current = win;
    const html = `<!doctype html><html><head><title>MediLink Video Call</title><style>
      body{margin:0;background:#0f172a;color:#f8fafc;font-family:system-ui,Segoe UI,Roboto,sans-serif;display:flex;flex-direction:column;min-height:100vh;}
      .header{padding:16px;background:#111827;border-bottom:1px solid rgba(255,255,255,0.08);}
      .header h1{margin:0;font-size:18px;font-weight:700;}
      .header p{margin:4px 0 0;font-size:13px;color:#cbd5e1;}
      .content{flex:1;display:grid;grid-template-columns:1.25fr .75fr;gap:12px;padding:16px;}
      .panel{background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;}
      .panel h2{margin:16px;font-size:14px;color:#f8fafc;}
      video{width:100%;height:100%;object-fit:cover;background:#000;border:none;}
      .status{padding:16px;font-size:13px;color:#cbd5e1;}
      .section{display:flex;flex-direction:column;gap:12px;padding:16px;}
      .label{font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;}
    </style></head><body>
      <div class="header"><h1>MediLink Video Call</h1><p>Use this window during your consultation.</p></div>
      <div class="content">
        <div class="panel">
          <div class="section"><div class="label">Remote video</div></div>
          <video id="remoteVideoPopout" autoplay playsinline></video>
        </div>
        <div class="panel">
          <div class="section"><div class="label">Your camera</div></div>
          <video id="localVideoPopout" autoplay playsinline muted></video>
          <div class="status" id="callStatusPopout">${
            callStatus === "connected"
              ? "Connected"
              : callStatus === "ringing"
                ? "Incoming call"
                : callStatus === "calling"
                  ? "Calling…"
                  : "Ready to connect"
          }</div>
        </div>
      </div>
    </body></html>`;

    win.document.write(html);
    win.document.close();

    win.addEventListener("beforeunload", () => {
      if (popoutWindow.current === win) popoutWindow.current = null;
    });

    syncVideoPopup();
  }, [callStatus, showToast, syncVideoPopup]);

  const flushPendingIceCandidates = useCallback(async () => {
    if (
      !pc.current?.remoteDescription ||
      pendingIceCandidates.current.length === 0
    ) {
      return;
    }

    const candidates = [...pendingIceCandidates.current];
    pendingIceCandidates.current = [];
    await Promise.all(
      candidates.map((candidate) =>
        pc.current.addIceCandidate(new RTCIceCandidate(candidate)),
      ),
    );
  }, []);

  const cleanupCall = useCallback(() => {
    stopIncomingRing();
    localStream.current?.getTracks().forEach((track) => track.stop());
    screenStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    screenStream.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    pc.current?.close();
    pc.current = null;
    incomingOffer.current = null;
    pendingIceCandidates.current = [];

    setHasLocalStream(false);
    setHasRemoteStream(false);
    setCallStatus("idle");
    setElapsed(0);
    setVideoOn(true);
    setAudioOn(true);
    setScreenSharing(false);
  }, []);

  const buildPeerConnection = useCallback(() => {
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }

    const connection = new RTCPeerConnection(ICE_CONFIG);
    pc.current = connection;

    connection.onicecandidate = ({ candidate }) => {
      if (candidate) emitSignal("webrtc:ice-candidate", { candidate });
    };

    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      if (state === "connected") {
        setElapsed(0);
        setCallStatus("connected");
      }
      if (state === "failed" || state === "disconnected") {
        setCallStatus("failed");
        setHasRemoteStream(false);
      }
    };

    connection.ontrack = ({ streams }) => {
      if (streams[0] && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = streams[0];
        setHasRemoteStream(true);
      }
    };

    return connection;
  }, [emitSignal]);

  const getLocalMedia = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Camera and microphone are not supported in this browser",
      );
    }

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
  }, []);

  const addTracksToConnection = (stream, connection) => {
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    if (!selectedConsultationId) {
      showToast("Open a consultation before sending a message", "error");
      return;
    }

    if (!isConsultationActive) {
      showToast(
        user?.role === "doctor"
          ? "Accept this consultation before chatting."
          : "Waiting for the doctor to accept this consultation.",
        "warning",
      );
      return;
    }

    setInput("");
    setSending(true);
    sendTyping(selectedConsultationId, false);

    const sentViaSocket = sendSocketMessage(selectedConsultationId, text);
    if (sentViaSocket) {
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
      setSending(false);
      return;
    }

    try {
      const response = await consultApi.sendMessage(
        selectedConsultationId,
        text,
      );
      addMessage(response.data);
    } catch (e) {
      showToast(e.message, "error");
      setInput(text);
    } finally {
      setSending(false);
    }
  }, [
    addMessage,
    input,
    isConsultationActive,
    selectedConsultationId,
    showToast,
    user,
  ]);

  const handleInputChange = useCallback(
    (event) => {
      setInput(event.target.value);
      if (!isConsultationActive) return;
      sendTyping(selectedConsultationId, true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(
        () => sendTyping(selectedConsultationId, false),
        1500,
      );
    },
    [isConsultationActive, selectedConsultationId],
  );

  const acceptConsultation = useCallback(async () => {
    if (!selectedConsultationId || user?.role !== "doctor") return;

    setAccepting(true);
    try {
      const response = await consultApi.accept(selectedConsultationId);
      setConsultation(response.data);
      showToast("Consultation accepted. You can chat now.");
      joinConsultation(selectedConsultationId);
    } catch (e) {
      showToast(e.message || "Could not accept consultation", "error");
    } finally {
      setAccepting(false);
    }
  }, [selectedConsultationId, showToast, user]);

  const startCall = useCallback(async () => {
    if (!selectedConsultationId) {
      showToast(
        "Open an active consultation before starting a video call",
        "error",
      );
      return;
    }

    if (!isConsultationActive) {
      showToast(
        user?.role === "doctor"
          ? "Accept this consultation before starting a call."
          : "The doctor needs to accept this consultation first.",
        "warning",
      );
      return;
    }

    if (!getSocket()?.connected) {
      showToast("Connecting to video server. Try again in a moment.", "error");
      return;
    }

    if (!peerReady) {
      showToast(
        "Waiting for the other party to join the consultation before starting the call.",
        "warning",
      );
      pendingVideoStart.current = true;
      return;
    }

    setCallStatus("calling");
    try {
      const stream = await getLocalMedia();
      const connection = buildPeerConnection();
      addTracksToConnection(stream, connection);

      const offer = await connection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
      });
      await connection.setLocalDescription(offer);
      emitSignal("webrtc:offer", { offer });
    } catch (e) {
      setCallStatus("failed");
      showToast(`Could not access camera/mic: ${e.message}`, "error");
    }
  }, [
    buildPeerConnection,
    emitSignal,
    getLocalMedia,
    isConsultationActive,
    peerReady,
    selectedConsultationId,
    showToast,
    user,
  ]);

  const requestVideoCall = useCallback(() => {
    if (!selectedConsultationId) {
      showToast("Open a consultation before starting a video call", "error");
      return;
    }

    if (!isConsultationActive) {
      showToast(
        user?.role === "doctor"
          ? "Accept this consultation before starting a call."
          : "The doctor needs to accept this consultation first.",
        "warning",
      );
      return;
    }

    const sent = requestSocketVideoCall(selectedConsultationId);
    pendingVideoStart.current = true;

    if (sent) {
      showToast("Video call request sent.");
    } else {
      showToast("Connecting to video server. Try again in a moment.", "error");
    }

    if (peerReady) startCall();
  }, [
    isConsultationActive,
    peerReady,
    selectedConsultationId,
    showToast,
    startCall,
    user,
  ]);

  useEffect(() => {
    if (!pendingVideoStart.current || !peerReady || callStatus !== "idle") {
      return;
    }

    pendingVideoStart.current = false;
    startCall();
  }, [callStatus, peerReady, startCall]);

  const acceptCall = useCallback(async () => {
    const offer = incomingOffer.current;
    if (!offer) return;

    setCallStatus("calling");
    try {
      const stream = await getLocalMedia();
      const connection = buildPeerConnection();
      addTracksToConnection(stream, connection);

      await connection.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingIceCandidates();
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);

      emitSignal("webrtc:answer", { answer });
      incomingOffer.current = null;
      stopIncomingRing();
    } catch (e) {
      setCallStatus("failed");
      showToast(`Could not start call: ${e.message}`, "error");
    }
  }, [
    buildPeerConnection,
    emitSignal,
    flushPendingIceCandidates,
    getLocalMedia,
    showToast,
  ]);

  const declineCall = useCallback(() => {
    incomingOffer.current = null;
    emitSignal("webrtc:call-ended");
    stopIncomingRing();
    setCallStatus("idle");
  }, [emitSignal, stopIncomingRing]);

  const toggleVideo = useCallback(() => {
    const track = localStream.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setVideoOn((value) => !value);
  }, []);

  const toggleAudio = useCallback(() => {
    const track = localStream.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setAudioOn((value) => !value);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const connection = pc.current;
    if (!connection) {
      showToast("Start a call first", "error");
      return;
    }

    if (screenSharing) {
      screenStream.current?.getTracks().forEach((track) => track.stop());
      screenStream.current = null;
      const cameraTrack = localStream.current?.getVideoTracks()[0];
      if (cameraTrack) {
        const sender = connection
          .getSenders()
          .find((item) => item.track?.kind === "video");
        await sender?.replaceTrack(cameraTrack);
        if (localVideoRef.current)
          localVideoRef.current.srcObject = localStream.current;
      }
      setScreenSharing(false);
      return;
    }

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        showToast("Screen sharing is not supported in this browser", "error");
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStream.current = stream;
      const screenTrack = stream.getVideoTracks()[0];
      const sender = connection
        .getSenders()
        .find((item) => item.track?.kind === "video");

      await sender?.replaceTrack(screenTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      screenTrack.onended = () => {
        screenStream.current = null;
        const cameraTrack = localStream.current?.getVideoTracks()[0];
        if (cameraTrack) {
          const cameraSender = connection
            .getSenders()
            .find((item) => item.track?.kind === "video");
          cameraSender?.replaceTrack(cameraTrack);
          if (localVideoRef.current)
            localVideoRef.current.srcObject = localStream.current;
        }
        setScreenSharing(false);
      };

      setScreenSharing(true);
    } catch (e) {
      if (e.name !== "NotAllowedError") {
        showToast(`Screen share failed: ${e.message}`, "error");
      }
    }
  }, [screenSharing, showToast]);

  const endCall = useCallback(() => {
    if (callStatus !== "idle") emitSignal("webrtc:call-ended");
    cleanupCall();
  }, [callStatus, cleanupCall, emitSignal]);

  const leaveConsultation = useCallback(async () => {
    endCall();
    setPeerReady(false);

    try {
      if (selectedConsultationId) {
        await consultApi.leave(selectedConsultationId).catch(() => {});

        let latestStatus = consultation?.status;
        try {
          const latest = await consultApi.getById(selectedConsultationId);
          setConsultation(latest.data);
          latestStatus = latest.data?.status || latestStatus;
        } catch {}

        if (latestStatus === "pending") {
          await consultApi.cancel(selectedConsultationId);
        } else if (latestStatus === "active") {
          await consultApi.end(selectedConsultationId);
        }
      }
    } catch (e) {
      showToast(e.message || "Could not update consultation status", "warning");
    }

    navigate(
      user?.role === "doctor"
        ? PAGES.DOCTOR_DASHBOARD
        : PAGES.CONSULTATION_LIST,
    );
  }, [
    consultation?.status,
    endCall,
    navigate,
    selectedConsultationId,
    showToast,
    user,
  ]);

  useEffect(() => {
    if (!selectedConsultationId || !user) return;

    const token = localStorage.getItem("ml_token");
    const sock = connectSocket(token);

    const isCurrentConsultation = (consultationId) =>
      !consultationId ||
      !selectedConsultationId ||
      String(consultationId) === String(selectedConsultationId);

    const onConnect = () => {
      setSocketReady(true);
      setPeerReady(false);
      joinConsultation(selectedConsultationId);
    };
    const onDisconnect = () => {
      setSocketReady(false);
      setPeerReady(false);
    };
    const onMessage = (message) => {
      addMessage(message);
      if (!isOwnMessage(message, user)) playIncomingMessageTone();
    };
    const onSocketError = (payload = {}) => {
      const message = payload.message || "Realtime message failed";
      if (/consultation is not active/i.test(message)) {
        setConsultation((current) =>
          current && current.status === "active"
            ? { ...current, status: "pending" }
            : current,
        );
        setMessages((current) =>
          current.filter((item) => !String(item._id || "").startsWith("tmp_")),
        );
      }
      showToast(message, "error");
    };
    const onTyping = () => setPeerTyping(true);
    const onStopTyping = () => setPeerTyping(false);
    const onOffer = ({ offer, consultationId }) => {
      if (!isCurrentConsultation(consultationId)) return;
      incomingOffer.current = offer;
      setCallStatus("ringing");
      try {
        ringAudio.current?.play();
      } catch {}
    };
    const onReadyForCall = ({ consultationId } = {}) => {
      if (!isCurrentConsultation(consultationId)) return;
      setPeerReady(true);
    };
    const onConsultationAccepted = ({ consultationId } = {}) => {
      if (!isCurrentConsultation(consultationId)) return;
      setConsultation((current) =>
        current
          ? {
              ...current,
              status: "active",
              startedAt: current.startedAt || new Date().toISOString(),
            }
          : current,
      );
    };
    const onAnswer = async ({ answer, consultationId }) => {
      try {
        if (!isCurrentConsultation(consultationId)) return;
        if (pc.current && pc.current.signalingState !== "stable") {
          await pc.current.setRemoteDescription(
            new RTCSessionDescription(answer),
          );
          await flushPendingIceCandidates();
        }
      } catch (e) {
        console.warn("setRemoteDescription(answer):", e.message);
      }
    };
    const onIce = async ({ candidate, consultationId }) => {
      try {
        if (!isCurrentConsultation(consultationId) || !candidate) return;
        if (!pc.current?.remoteDescription) {
          pendingIceCandidates.current.push(candidate);
          return;
        }
        await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("addIceCandidate:", e.message);
      }
    };
    const onCallEnded = ({ consultationId } = {}) => {
      if (!isCurrentConsultation(consultationId)) return;
      const now = Date.now();
      if (now - lastRemoteCallEndAt.current < 800) return;
      lastRemoteCallEndAt.current = now;
      stopIncomingRing();
      showToast("The other party ended the call");
      cleanupCall();
    };
    const onPeerLeft = ({ consultationId } = {}) => {
      if (!isCurrentConsultation(consultationId)) return;
      setPeerReady(false);
      if (callStatus !== "idle") {
        showToast("The other party left. The call was closed.", "warning");
        cleanupCall();
      }
    };
    const onVideoCallDeclined = ({ consultationId } = {}) => {
      if (!isCurrentConsultation(consultationId)) return;
      pendingVideoStart.current = false;
    };

    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on(EVENTS.RECEIVE_MESSAGE, onMessage);
    sock.on(EVENTS.ERROR, onSocketError);
    sock.on(EVENTS.TYPING, onTyping);
    sock.on(EVENTS.STOP_TYPING, onStopTyping);
    sock.on("webrtc:offer", onOffer);
    sock.on("webrtc:answer", onAnswer);
    sock.on("webrtc:ice-candidate", onIce);
    sock.on("webrtc:call-ended", onCallEnded);
    sock.on("peerLeft", onPeerLeft);
    sock.on("readyForCall", onReadyForCall);
    sock.on("consultationAccepted", onConsultationAccepted);
    sock.on(EVENTS.VIDEO_CALL_DECLINED, onVideoCallDeclined);

    if (sock.connected) onConnect();

    return () => {
      sock.off("connect", onConnect);
      sock.off("disconnect", onDisconnect);
      sock.off(EVENTS.RECEIVE_MESSAGE, onMessage);
      sock.off(EVENTS.ERROR, onSocketError);
      sock.off(EVENTS.TYPING, onTyping);
      sock.off(EVENTS.STOP_TYPING, onStopTyping);
      sock.off("webrtc:offer", onOffer);
      sock.off("webrtc:answer", onAnswer);
      sock.off("webrtc:ice-candidate", onIce);
      sock.off("webrtc:call-ended", onCallEnded);
      sock.off("peerLeft", onPeerLeft);
      sock.off("readyForCall", onReadyForCall);
      sock.off("consultationAccepted", onConsultationAccepted);
      sock.off(EVENTS.VIDEO_CALL_DECLINED, onVideoCallDeclined);
    };
  }, [
    addMessage,
    cleanupCall,
    flushPendingIceCandidates,
    callStatus,
    selectedConsultationId,
    showToast,
    user,
  ]);

  useEffect(() => {
    syncVideoPopup();
  }, [
    syncVideoPopup,
    hasLocalStream,
    hasRemoteStream,
    callStatus,
    videoOn,
    audioOn,
  ]);

  useEffect(() => {
    return () => {
      const win = popoutWindow.current;
      if (win && !win.closed) win.close();
      popoutWindow.current = null;
    };
  }, []);

  useEffect(() => cleanupCall, [cleanupCall]);

  return {
    audioOn,
    accepting,
    bottomRef,
    callStatus,
    consultation,
    elapsed,
    error,
    hasLocalStream,
    hasRemoteStream,
    input,
    isConsultationActive,
    localVideoRef,
    loading,
    messages,
    openVideoWindow,
    peerReady,
    peerTyping,
    remoteVideoRef,
    screenSharing,
    sending,
    socketReady,
    videoOn,
    acceptCall,
    acceptConsultation,
    declineCall,
    endCall,
    handleInputChange,
    leaveConsultation,
    requestVideoCall,
    sendMessage,
    startCall,
    toggleAudio,
    toggleScreenShare,
    toggleVideo,
  };
}
