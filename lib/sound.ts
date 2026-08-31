// lib/sound.ts
//
// A short, synthesized two-note chime (see assets/sounds/post-success.wav)
// played whenever the user successfully posts a perception or a comment —
// distinct from a generic system notification sound, and deliberately
// respects the device's silent/mute switch (this is UI feedback, not an
// alert, so it shouldn't override it).
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

let postSuccessPlayer: AudioPlayer | null = null;

function getPostSuccessPlayer(): AudioPlayer {
  if (!postSuccessPlayer) {
    postSuccessPlayer = createAudioPlayer(require("../assets/sounds/post-success.wav"));
  }
  return postSuccessPlayer;
}

export async function playPostSuccessSound(): Promise<void> {
  try {
    const player = getPostSuccessPlayer();
    await player.seekTo(0);
    player.play();
  } catch (err) {
    // Never let a sound glitch block the actual action it's celebrating.
    console.warn("Failed to play post-success sound:", err);
  }
}
