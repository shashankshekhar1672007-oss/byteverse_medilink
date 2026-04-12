const playSound = (src, volume = 0.35) => {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch {}
};

export const playIncomingMessageTone = () => {
  playSound("/tone.mp3", 0.35);
};

export const playNotificationSound = () => {
  playSound("/notification.wav", 0.35);
};
