import styles from "../CSS/Consultation.module.css";
import { formatDuration } from "./consultationUtils";

export default function VideoPanel({
  audioOn,
  callStatus,
  elapsed,
  hasLocalStream,
  hasRemoteStream,
  initials,
  localVideoRef,
  myInitials,
  onEndCall,
  onLeave,
  onOpenVideoWindow,
  onStartCall,
  onToggleAudio,
  onToggleScreenShare,
  onToggleVideo,
  peerName,
  remoteVideoRef,
  screenSharing,
  specialization,
  videoOn,
  peerReady,
  disabled,
}) {
  return (
    <div className={styles.videoPanel}>
      <div className={styles.videoHeader}>
        <div className={`${styles.docAvatar} ${styles.videoHeaderAvatar}`}>
          {initials}
        </div>
        <div>
          <div className={styles.chatDocName}>{peerName}</div>
          <div className={styles.videoSpec}>{specialization}</div>
        </div>
        <div className={styles.timer}>● {formatDuration(elapsed)}</div>
      </div>

      <div className={styles.videoMain}>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`${styles.remoteVideo} ${
            hasRemoteStream ? styles.videoVisible : styles.videoHidden
          }`}
        />

        {!hasRemoteStream && (
          <VideoPlaceholder
            callStatus={callStatus}
            disabled={disabled}
            initials={initials}
            peerName={peerName}
          />
        )}

        <div
          className={`${styles.pip} ${
            hasLocalStream ? styles.videoVisible : styles.videoHidden
          }`}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={styles.localVideo}
          />
        </div>

        {!hasLocalStream && (
          <div className={styles.pipPlaceholder}>
            <span className={styles.pipPlaceholderText}>{myInitials}</span>
          </div>
        )}

        {callStatus === "connected" && (
          <div className={styles.videoLabel}>
            {screenSharing ? "Sharing screen" : "HD · Encrypted"}
          </div>
        )}
      </div>

      <VideoControls
        audioOn={audioOn}
        callStatus={callStatus}
        hasLocalStream={hasLocalStream}
        hasRemoteStream={hasRemoteStream}
        onEndCall={onEndCall}
        onLeave={onLeave}
        onOpenVideoWindow={onOpenVideoWindow}
        onStartCall={onStartCall}
        onToggleAudio={onToggleAudio}
        onToggleScreenShare={onToggleScreenShare}
        onToggleVideo={onToggleVideo}
        screenSharing={screenSharing}
        videoOn={videoOn}
        peerReady={peerReady}
        disabled={disabled}
      />
    </div>
  );
}

function VideoPlaceholder({ callStatus, disabled, initials, peerName }) {
  const hint = {
    idle: disabled
      ? "Video starts after the consultation is active"
      : "Click Call to start video",
    ringing: "Connecting incoming call...",
    calling: `Calling ${peerName}...`,
    connected: "Connected. Waiting for video...",
    failed: "Call failed. Try again.",
  }[callStatus];

  return (
    <div className={styles.videoPlaceholder}>
      <div className={styles.videoAvatar}>{initials}</div>
      <p
        className={`${styles.callHint} ${
          callStatus === "failed" ? styles.callHintError : ""
        }`}
      >
        {hint}
      </p>
    </div>
  );
}

function VideoControls({
  audioOn,
  callStatus,
  hasLocalStream,
  hasRemoteStream,
  onEndCall,
  onLeave,
  onOpenVideoWindow,
  onStartCall,
  onToggleAudio,
  onToggleScreenShare,
  onToggleVideo,
  screenSharing,
  videoOn,
  peerReady,
  disabled,
}) {
  const callLabel =
    disabled ? "Pending" : peerReady ? "Start call" : "Request call";

  return (
    <div className={styles.videoControls}>
      <div className={styles.videoControlGroup}>
        <button
          className={`${styles.vcBtn} ${!videoOn ? styles.vcOff : ""}`}
          onClick={onToggleVideo}
          disabled={!hasLocalStream}
          title={videoOn ? "Turn off camera" : "Turn on camera"}
          type="button"
        >
          {videoOn ? "Camera" : "Camera off"}
        </button>

        <button
          className={`${styles.vcBtn} ${!audioOn ? styles.vcOff : ""}`}
          onClick={onToggleAudio}
          disabled={!hasLocalStream}
          title={audioOn ? "Mute" : "Unmute"}
          type="button"
        >
          {audioOn ? "Microphone" : "Muted"}
        </button>

        <button
          className={`${styles.vcBtn} ${screenSharing ? styles.vcActive : ""}`}
          onClick={onToggleScreenShare}
          disabled={callStatus !== "connected"}
          title="Share screen"
          type="button"
        >
          Share
        </button>
      </div>

      <div className={styles.videoControlGroup}>
        {(callStatus === "idle" || callStatus === "failed") && (
          <button
            className={`${styles.vcBtn} ${styles.callBtn}`}
            onClick={onStartCall}
            disabled={disabled}
            type="button"
          >
            {callLabel}
          </button>
        )}
        {callStatus === "calling" && (
          <button
            className={`${styles.vcBtn} ${styles.hangBtn}`}
            onClick={onEndCall}
            type="button"
          >
            Cancel
          </button>
        )}
        {callStatus === "connected" && (
          <button
            className={`${styles.vcBtn} ${styles.vcActionBtn}`}
            onClick={onOpenVideoWindow}
            disabled={!hasLocalStream && !hasRemoteStream}
            type="button"
          >
            Pop-out
          </button>
        )}
        {callStatus === "connected" && (
          <button
            className={`${styles.vcBtn} ${styles.hangBtn}`}
            onClick={onEndCall}
            type="button"
          >
            End call
          </button>
        )}

        <button
          className={`${styles.vcBtn} ${styles.leaveBtn}`}
          onClick={onLeave}
          type="button"
        >
          Leave
        </button>
      </div>
    </div>
  );
}
