function mediaSession(): MediaSession | null {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return null;
  }
  return navigator.mediaSession;
}

/** Browser dapat menyediakan Media Session secara parsial; semua operasi no-op aman. */
export function setMediaSessionAction(
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
): void {
  const session = mediaSession();
  if (!session || typeof session.setActionHandler !== "function") return;
  try {
    session.setActionHandler(action, handler);
  } catch {
    // Action belum didukung browser ini.
  }
}

export function setMediaSessionMetadata(metadata: MediaMetadataInit): void {
  const session = mediaSession();
  if (!session || typeof MediaMetadata === "undefined") return;
  try {
    session.metadata = new MediaMetadata(metadata);
  } catch {
    // Metadata bersifat enhancement dan tidak boleh memutus audio.
  }
}

export function setMediaSessionPlaybackState(
  state: MediaSessionPlaybackState,
): void {
  const session = mediaSession();
  if (!session) return;
  try {
    session.playbackState = state;
  } catch {
    // Implementasi parsial dapat menolak assignment.
  }
}

export function setMediaSessionPosition(
  state: MediaPositionState,
): void {
  const session = mediaSession();
  if (!session || typeof session.setPositionState !== "function") return;
  try {
    session.setPositionState(state);
  } catch {
    // Safari/Firefox lama dapat menolak state walau API tersedia.
  }
}
