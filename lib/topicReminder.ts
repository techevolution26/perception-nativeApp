import * as SecureStore from "expo-secure-store";

const KEY = "perception_topic_follow_reminder";

export async function setTopicReminderPending(pending: boolean): Promise<void> {
  if (pending) await SecureStore.setItemAsync(KEY, "1");
  else await SecureStore.deleteItemAsync(KEY);
}

export async function isTopicReminderPending(): Promise<boolean> {
  try { return (await SecureStore.getItemAsync(KEY)) === "1"; } catch { return false; }
}
