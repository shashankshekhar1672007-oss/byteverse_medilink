import { useApp } from "../../context/AppContext";
import { Spinner, ErrorMsg } from "../ui/UI";
import styles from "./CSS/Consultation.module.css";
import ChatPanel from "./consultation/ChatPanel";
import ConsultationHeader from "./consultation/ConsultationHeader";
import IncomingCallBanner from "./consultation/IncomingCallBanner";
import VideoPanel from "./consultation/VideoPanel";
import { getInitials } from "./consultation/consultationUtils";
import { useConsultationSession } from "./consultation/useConsultationSession";

export default function Consultation() {
  const { navigate, user, selectedConsultationId, selectedDoctor, showToast } =
    useApp();
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
  const isPending = session.consultation?.status === "pending";
  const inactiveReason =
    session.consultation?.status === "pending"
      ? isDoc
        ? "Accept this consultation to start chat."
        : "Waiting for the doctor to accept this consultation."
      : "This consultation is not active.";

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

      {session.callStatus === "ringing" && (
        <IncomingCallBanner
          onAccept={session.acceptCall}
          onDecline={session.declineCall}
          peerName={peerName}
        />
      )}

      <div className={styles.layout}>
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
          onStartCall={session.startCall}
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
      </div>
    </div>
  );
}
