import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { auth as authApi, clearTokens } from "../services/api";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  EVENTS,
  declineVideoCall,
} from "../services/socket";
import {
  playIncomingMessageTone,
  playNotificationSound,
} from "../services/sounds";

export const PAGES = {
  DASHBOARD: "dashboard",
  DOCTORS: "doctors",
  CONSULTATION: "consultation",
  PRESCRIPTION: "prescription",
  PRESCRIPTION_LIST: "prescription_list",
  CONSULTATION_LIST: "consultation_list",
  RECORDS: "records",
  ORDERS: "orders",
  SOS: "sos",
  PROFILE: "profile",
  DOCTOR_DASHBOARD: "doctor_dashboard",
  CREATE_PRESCRIPTION: "create_prescription",
  DOCTOR_PRESCRIPTIONS: "doctor_prescriptions",
  ADMIN_DASHBOARD: "admin_dashboard",
};

const getHomePage = (role) => {
  if (role === "admin") return PAGES.ADMIN_DASHBOARD;
  if (role === "doctor") return PAGES.DOCTOR_DASHBOARD;
  return PAGES.DASHBOARD;
};

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(null);
  const [pageParams, setPageParams] = useState({});
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);
  const [selectedConsultationId, setSelectedConsultationId] = useState(null);
  const [notifications, setNotifications] = useState(0);
  const [notificationItems, setNotificationItems] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification === "undefined"
      ? "unsupported"
      : Notification.permission,
  );
  const [toast, setToast] = useState(null);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      const token = localStorage.getItem("ml_token");
      if (!token) {
        setLoading(false);
        return;
      }

      const saved = authApi.getSavedUser();
      if (saved) {
        setUser(saved);
        setIsAuthenticated(true);
        setActivePage(getHomePage(saved.role));
        setLoading(false);
        connectSocket(token);
      }

      try {
        const res = await authApi.getMe();
        setUser(res.data.user);
        setProfile(res.data.profile);
        localStorage.setItem("ml_user", JSON.stringify(res.data.user));
        setIsAuthenticated(true);
        setActivePage(getHomePage(res.data.user.role));
        connectSocket(token);
      } catch {
        setIsAuthenticated(false);
        setUser(null);
        clearTokens();
      } finally {
        if (!saved) setLoading(false);
      }
    })();
    return () => disconnectSocket();
  }, []);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      showToast("Browser notifications are not supported here", "warning");
      return "unsupported";
    }
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      showToast(
        permission === "granted"
          ? "Notifications enabled"
          : "Notifications will stay inside the app",
        permission === "granted" ? "success" : "warning",
      );
      return permission;
    }
    setNotificationPermission(Notification.permission);
    showToast(
      Notification.permission === "granted"
        ? "Notifications are already enabled"
        : "Notifications are blocked in browser settings",
      Notification.permission === "granted" ? "success" : "warning",
    );
    return Notification.permission;
  }, [showToast]);

  const clearNotifications = useCallback(() => {
    setNotifications(0);
    setNotificationItems([]);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotificationItems((items) => items.filter((item) => item.id !== id));
    setNotifications((count) => Math.max(0, count - 1));
  }, []);

  const onSocketConnectError = useCallback(
    (error) => {
      if (!error) return;
      const message = String(error.message || error);
      if (message.toLowerCase().includes("unauthorized")) {
        showToast("Session expired. Please log in again.", "error");
        clearTokens();
        setIsAuthenticated(false);
        setUser(null);
        disconnectSocket();
      }
    },
    [showToast],
  );

  const syncSession = useCallback((nextUser, nextProfile) => {
    if (nextUser) {
      setUser(nextUser);
      localStorage.setItem("ml_user", JSON.stringify(nextUser));
    }
    if (nextProfile !== undefined) {
      setProfile(nextProfile);
    }
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login(email, password);
      // Connect socket right after login
      const token = localStorage.getItem("ml_token");
      connectSocket(token);
      setUser(data.user);
      setIsAuthenticated(true);
      setActivePage(getHomePage(data.user.role));
      showToast(`Welcome back, ${data.user.name.split(" ")[0]}!`);
      return data;
    },
    [showToast],
  );

  const logout = useCallback(async () => {
    disconnectSocket();
    await authApi.logout();
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
    setActivePage(null);
    setSelectedDoctor(null);
    showToast("Logged out successfully");
  }, [showToast]);

  const navigate = useCallback((page, params = {}) => {
    setActivePage(page);
    setPageParams(params);
    if (params.doctor !== undefined) setSelectedDoctor(params.doctor);
    if (params.prescriptionId !== undefined)
      setSelectedPrescriptionId(params.prescriptionId);
    if (page === PAGES.CONSULTATION && params.consultationId === undefined) {
      setSelectedConsultationId(null);
    } else if (params.consultationId !== undefined) {
      setSelectedConsultationId(params.consultationId);
    }
  }, []);

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall?.consultationId) return;
    const consultationId = incomingCall.consultationId;
    setIncomingCall(null);
    navigate(PAGES.CONSULTATION, {
      consultationId,
      mode: "call",
      autoAcceptCall: true,
    });
  }, [incomingCall, navigate]);

  const openIncomingCallChat = useCallback(() => {
    if (!incomingCall?.consultationId) return;
    const consultationId = incomingCall.consultationId;
    declineVideoCall(consultationId);
    setIncomingCall(null);
    navigate(PAGES.CONSULTATION, {
      consultationId,
      mode: "chat",
    });
  }, [incomingCall, navigate]);

  const dismissIncomingCall = useCallback(() => {
    if (incomingCall?.consultationId) {
      declineVideoCall(incomingCall.consultationId);
    }
    setIncomingCall(null);
  }, [incomingCall]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const token = localStorage.getItem("ml_token");
    const sock = getSocket() || (token ? connectSocket(token) : null);
    if (!sock) return;

    const showBrowserNotification = (title, body) => {
      if (
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      )
        return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      )
        return;
      try {
        new Notification(title, {
          body,
          icon: "/vite.svg",
          tag: "medilink-notification",
        });
      } catch {}
    };

    const pushNotification = ({
      title,
      body,
      type = "general",
      page,
      params,
    }) => {
      const item = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        body,
        type,
        page,
        params,
        createdAt: new Date().toISOString(),
      };
      setNotifications((n) => n + 1);
      setNotificationItems((items) => [item, ...items].slice(0, 20));
      showToast(title, "success");
      if (type === "message") {
        playIncomingMessageTone();
      } else {
        playNotificationSound();
      }
      showBrowserNotification(title, body);
      return item;
    };

    const onMessage = (msg = {}) => {
      const senderId = msg.sender?._id || msg.sender;
      const fromMe = senderId
        ? String(senderId) === String(user?._id)
        : msg.senderRole === user?.role;
      const consultationId =
        msg.consultationId?._id || msg.consultationId || msg.consultation?._id;
      const viewingSameConsultation =
        activePage === PAGES.CONSULTATION &&
        (!consultationId ||
          (selectedConsultationId &&
            String(consultationId) === String(selectedConsultationId)));

      if (fromMe || viewingSameConsultation) return;

      const senderName =
        msg.sender?.name ||
        (msg.senderRole === "doctor" ? "Doctor" : "Patient");
      pushNotification({
        title: `New message from ${senderName}`,
        body: msg.text || "Open MediLink to view the update.",
        type: "message",
        page: PAGES.CONSULTATION,
        params: consultationId ? { consultationId } : undefined,
      });
    };

    const onGenericNotification = (payload = {}) => {
      const consultationId =
        payload.consultationId || payload.consultation?._id;
      pushNotification({
        title: payload.title || payload.message || "New MediLink notification",
        body: payload.body || payload.message || "Open MediLink for details.",
        type: payload.type || "general",
        page: payload.page || (consultationId ? PAGES.CONSULTATION : undefined),
        params:
          payload.params || (consultationId ? { consultationId } : undefined),
      });
    };

    const onConsultationRequest = (payload = {}) => {
      const message = payload.reason
        ? `${payload.patient?.name || "A patient"} requested a consultation: ${payload.reason}`
        : `${payload.patient?.name || "A patient"} requested a consultation.`;

      pushNotification({
        title: "New consultation request",
        body: message,
        type: "consultation_request",
        page: PAGES.CONSULTATION,
        params: payload.consultationId
          ? { consultationId: payload.consultationId }
          : undefined,
      });

      if (user?.role === "doctor" && payload.consultationId) {
        if (activePage !== PAGES.DOCTOR_DASHBOARD) {
          navigate(PAGES.CONSULTATION, {
            consultationId: payload.consultationId,
          });
        }
      }
    };

    const onConsultationAccepted = (payload = {}) => {
      pushNotification({
        title: "Consultation accepted",
        body: payload.doctorName
          ? `${payload.doctorName} accepted your consultation request.`
          : "Your consultation request has been accepted.",
        type: "consultation_accepted",
        page: PAGES.CONSULTATION,
        params: payload.consultationId
          ? { consultationId: payload.consultationId }
          : undefined,
      });
    };

    const onConsultationEnded = (payload = {}) => {
      pushNotification({
        title: "Consultation ended",
        body: "Your live consultation has been closed.",
        type: "consultation_ended",
        page: PAGES.CONSULTATION_LIST,
        params: payload.consultationId
          ? { consultationId: payload.consultationId }
          : undefined,
      });
    };

    const onIncomingVideoCall = (payload = {}) => {
      const callerName =
        payload.from?.name ||
        (payload.from?.role === "doctor" ? "Doctor" : "Patient");
      setIncomingCall(payload);
      pushNotification({
        title: "Incoming video call",
        body: `${callerName} is calling you now.`,
        type: "video_call",
        page: PAGES.CONSULTATION,
        params: payload.consultationId
          ? {
              consultationId: payload.consultationId,
              mode: "call",
              autoAcceptCall: true,
            }
          : undefined,
      });
    };

    const onVideoCallDeclined = (payload = {}) => {
      setIncomingCall((current) =>
        current?.consultationId &&
        String(current.consultationId) === String(payload.consultationId)
          ? null
          : current,
      );
      showToast(
        payload.from?.name
          ? `${payload.from.name} declined the video call.`
          : "The video call was declined.",
        "warning",
      );
    };

    sock.on(EVENTS.RECEIVE_MESSAGE, onMessage);
    sock.on("connect_error", onSocketConnectError);
    sock.on("consultationRequest", onConsultationRequest);
    sock.on("consultationAccepted", onConsultationAccepted);
    sock.on("notification", onGenericNotification);
    sock.on("newNotification", onGenericNotification);
    sock.on("consultationUpdated", onGenericNotification);
    sock.on(EVENTS.CONSULTATION_ENDED, onConsultationEnded);
    sock.on(EVENTS.VIDEO_CALL_INCOMING, onIncomingVideoCall);
    sock.on(EVENTS.VIDEO_CALL_DECLINED, onVideoCallDeclined);

    return () => {
      sock.off(EVENTS.RECEIVE_MESSAGE, onMessage);
      sock.off("consultationRequest", onConsultationRequest);
      sock.off("consultationAccepted", onConsultationAccepted);
      sock.off("notification", onGenericNotification);
      sock.off("newNotification", onGenericNotification);
      sock.off("consultationUpdated", onGenericNotification);
      sock.off(EVENTS.CONSULTATION_ENDED, onConsultationEnded);
      sock.off(EVENTS.VIDEO_CALL_INCOMING, onIncomingVideoCall);
      sock.off(EVENTS.VIDEO_CALL_DECLINED, onVideoCallDeclined);
      sock.off("connect_error", onSocketConnectError);
    };
  }, [activePage, isAuthenticated, selectedConsultationId, showToast, user]);

  return (
    <Ctx.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        loading,
        activePage,
        pageParams,
        selectedDoctor,
        selectedPrescriptionId,
        selectedConsultationId,
        notifications,
        notificationItems,
        notificationPermission,
        incomingCall,
        toast,
        login,
        logout,
        navigate,
        showToast,
        syncSession,
        setNotifications,
        requestNotificationPermission,
        acceptIncomingCall,
        openIncomingCallChat,
        dismissIncomingCall,
        clearNotifications,
        dismissNotification,
        setSelectedDoctor,
        setSelectedPrescriptionId,
        setSelectedConsultationId,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
};
