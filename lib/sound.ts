import { createAudioPlayer, type AudioPlayer } from "expo-audio";
type SoundName="like"|"message"|"notification"|"post";
const players:Partial<Record<SoundName,AudioPlayer>>={};
const sources:Record<SoundName,number>={like:require("../assets/sounds/like.wav"),message:require("../assets/sounds/message-sent.wav"),notification:require("../assets/sounds/notification.wav"),post:require("../assets/sounds/post-success.wav")};
async function play(name:SoundName){try{const player=players[name]??createAudioPlayer(sources[name]);players[name]=player;await player.seekTo(0);player.play();}catch(error){console.warn(`Failed to play ${name} sound:`,error);}}
export const playLikeSound=()=>play("like"); export const playMessageSentSound=()=>play("message"); export const playNotificationSound=()=>play("notification"); export const playPostSuccessSound=()=>play("post");
