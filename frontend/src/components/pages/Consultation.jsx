import { useEffect, useRef } from "react";
import { PAGES, useApp } from "../../context/AppContext";
import { Spinner, ErrorMsg } from "../ui/UI";
import styles from "./CSS/Consultation.module.css";
import ChatPanel from "./consultation/ChatPanel";
import ConsultationHeader from "./consultation/ConsultationHeader";
import CurrentConsultationsList from "./consultation/CurrentConsultationsList";
import IncomingCallBanner from "./consultation/IncomingCallBanner";
import VideoPanel from "./consultation/VideoPanel";
import { getInitials } from "./consultation/consultationUtils";
import { useConsultationSession } from "./consultation/useConsultationSession";

export default function Consultation() {
  const {
    navigate,
    pageParams,
    user,
    selectedConsultationId,
    selectedDoctor,
    showToast,
  } = useApp();

  if (!selectedConsultationId) {
    return <CurrentConsultationsList navigate={navigate} user={user} />;
  }

  return (
    <ConsultationRoom
      navigate={navigate}
      pageParams={pageParams}
      selectedConsultationId={selectedConsultationId}
      selectedDoctor={selectedDoctor}
      showToast={showToast}
      user={user}
    />
  );
}

function ConsultationRoom({
  navigate,
  pageParams,
  selectedConsultationId,
  selectedDoctor,
  showToast,
  user,
}) {
  const autoVideoRequested = useRef(false);
  const autoAnswered = useRef(false);
  const session = useConsultationSession({
    navigate,
    selectedConsultationId,
    showToast,
    user,
  });

  const isDoc = user?.role === "doctor";
  const peer = isDoc
    ? session.consultation?.patient || {}
    : session.consultation?.doctor || selectedDoctor || {};
  const peerName =
    peer?.userId?.name || peer?.name || (isDoc ? "Patient" : "Doctor");
  const specialization = isDoc ? "" : peer?.specialization || "";
  const initials = getInitials(peerName);
  const myInitials = getInitials(user?.name, "ME");
  const roomMode = pageParams?.mode === "call" ? "call" : "chat";
  const isPending = session.consultation?.status === "pending";
  const inactiveReason =
    session.consultation?.status === "pending"
      ? isDoc
        ? "Accept this consultation to start chat."
        : "Waiting for the doctor to accept this consultation."
      : "This consultation is not active.";
  const switchToChat = () => {
    navigate(PAGES.CONSULTATION, {
      consultationId: selectedConsultationId,
      mode: "chat",
    });
  };
  const switchToCall = () => {
    navigate(PAGES.CONSULTATION, {
      consultationId: selectedConsultationId,
      mode: "call",
      startVideo: true,
    });
  };

  useEffect(() => {
    if (
      !pageParams?.startVideo ||
      roomMode !== "call" ||
      session.loading ||
      autoVideoRequested.current
    ) {
      return;
    }
    autoVideoRequested.current = true;
    session.requestVideoCall();
  }, [
    pageParams?.startVideo,
    roomMode,
    session.loading,
    session.requestVideoCall,
  ]);

  useEffect(() => {
    if (roomMode === "chat") {
      autoVideoRequested.current = false;
      autoAnswered.current = false;
    }
  }, [roomMode]);

  useEffect(() => {
    if (
      !pageParams?.autoAcceptCall ||
      roomMode !== "call" ||
      session.callStatus !== "ringing" ||
      autoAnswered.current
    ) {
      return;
    }

    autoAnswered.current = true;
    session.acceptCall();
  }, [
    pageParams?.autoAcceptCall,
    roomMode,
    session.callStatus,
    session.acceptCall,
  ]);

  if (session.loading)
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Spinner size={36} />
        </div>
      </div>
    );
  if (session.error && !session.consultation)
    return (
      <div className={styles.page}>
        <ErrorMsg
          message={session.error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );

  return (
    <div className={styles.page}>
      <ConsultationHeader
        accepting={session.accepting}
        canAccept={isDoc && isPending}
        consultationStatus={session.consultation?.status}
        onAccept={session.acceptConsultation}
        peerName={peerName}
        isActive={session.isConsultationActive}
        socketReady={session.socketReady}
        specialization={specialization}
      />

      <div className={styles.roomModeBar}>
        <button
          className={`${styles.modeSwitchBtn} ${
            roomMode === "chat" ? styles.modeSwitchActive : ""
          }`}
          onClick={switchToChat}
          type="button"
        >
          Chat
        </button>
        <button
          className={`${styles.modeSwitchBtn} ${
            roomMode === "call" ? styles.modeSwitchActive : ""
          }`}
          onClick={switchToCall}
          disabled={!session.isConsultationActive}
          type="button"
        >
          Video Call
        </button>
      </div>

      {roomMode === "call" &&
        !pageParams?.autoAcceptCall &&
        session.callStatus === "ringing" && (
        <IncomingCallBanner
          onAccept={session.acceptCall}
          onDecline={session.declineCall}
          peerName={peerName}
        />
      )}

      <div className={`${styles.layout} ${styles.singlePanelLayout}`}>
        {roomMode === "chat" ? (
          <ChatPanel
            bottomRef={session.bottomRef}
            input={session.input}
            initials={initials}
            messages={session.messages}
            onInputChange={session.handleInputChange}
            onSend={session.sendMessage}
            peerName={peerName}
            peerTyping={session.peerTyping}
            sending={session.sending}
            disabled={!session.isConsultationActive}
            disabledReason={inactiveReason}
            socketReady={session.socketReady}
            user={user}
          />
        ) : (
          <VideoPanel
            audioOn={session.audioOn}
            callStatus={session.callStatus}
            elapsed={session.elapsed}
            hasLocalStream={session.hasLocalStream}
            hasRemoteStream={session.hasRemoteStream}
            initials={initials}
            localVideoRef={session.localVideoRef}
            myInitials={myInitials}
            onEndCall={session.endCall}
            onLeave={session.leaveConsultation}
            onOpenVideoWindow={session.openVideoWindow}
            onStartCall={session.requestVideoCall}
            onToggleAudio={session.toggleAudio}
            onToggleScreenShare={session.toggleScreenShare}
            onToggleVideo={session.toggleVideo}
            peerName={peerName}
            remoteVideoRef={session.remoteVideoRef}
            screenSharing={session.screenSharing}
            specialization={specialization}
            videoOn={session.videoOn}
            peerReady={session.peerReady}
            disabled={!session.isConsultationActive}
          />
        )}
      </div>
    </div>
  );
}
