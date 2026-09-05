type NotificationBadgeChange = (delta: number) => void;

export const notificationBadgeEvents = {
  listeners: new Set<NotificationBadgeChange>(),

  subscribe(listener: NotificationBadgeChange) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },

  emit(delta: number) {
    this.listeners.forEach((listener) => listener(delta));
  },
};
