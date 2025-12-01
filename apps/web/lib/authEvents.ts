export const AUTH_CHANGE_EVENT = "autoship-auth-change" as const;

export const notifyAuthChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};
