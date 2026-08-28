"use client";

import { useEffect, useRef } from "react";

const ADMIN_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const ADMIN_SESSION_CHANNEL = "montro-admin-session";
const MAX_ACTIVITY_CLOCK_SKEW_MS = 5000;

type AdminActivityMessage = {
  type: "activity";
  at: number;
};

type UseAdminInactivityTimeoutOptions = {
  enabled: boolean;
  pathname: string;
  onExpire: () => void | Promise<void>;
};

export function useAdminInactivityTimeout({
  enabled,
  pathname,
  onExpire,
}: UseAdminInactivityTimeoutOptions) {
  const onExpireRef = useRef(onExpire);
  const recordActivityRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!enabled) {
      recordActivityRef.current = null;
      return;
    }

    let lastActivityAt = Date.now();
    let timeoutId: number | undefined;
    let expiring = false;
    let channel: BroadcastChannel | null = null;

    const clearTimer = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const checkDeadline = () => {
      clearTimer();

      const remaining =
        ADMIN_INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivityAt);

      if (remaining <= 0) {
        if (!expiring) {
          expiring = true;
          void onExpireRef.current();
        }
        return;
      }

      timeoutId = window.setTimeout(checkDeadline, remaining);
    };

    const updateActivity = (activityAt: number) => {
      if (expiring || activityAt <= lastActivityAt) {
        return;
      }

      lastActivityAt = activityAt;
      checkDeadline();
    };

    const recordActivity = () => {
      if (expiring || document.visibilityState !== "visible") {
        return;
      }

      const activityAt = Date.now();
      updateActivity(activityAt);

      try {
        channel?.postMessage({
          type: "activity",
          at: activityAt,
        } satisfies AdminActivityMessage);
      } catch {
        // Fall back to the local timer if cross-tab messaging becomes unavailable.
      }
    };

    const handleChannelMessage = (event: MessageEvent<unknown>) => {
      const message = event.data;

      if (
        !message ||
        typeof message !== "object" ||
        !("type" in message) ||
        !("at" in message) ||
        message.type !== "activity" ||
        typeof message.at !== "number" ||
        !Number.isFinite(message.at)
      ) {
        return;
      }

      const now = Date.now();
      if (
        message.at < now - ADMIN_INACTIVITY_TIMEOUT_MS ||
        message.at > now + MAX_ACTIVITY_CLOCK_SKEW_MS
      ) {
        return;
      }

      updateActivity(Math.min(message.at, now));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkDeadline();
      }
    };

    if ("BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(ADMIN_SESSION_CHANNEL);
        channel.addEventListener("message", handleChannelMessage);
      } catch {
        channel = null;
      }
    }

    recordActivityRef.current = recordActivity;
    window.addEventListener("pointerdown", recordActivity, { passive: true });
    window.addEventListener("keydown", recordActivity);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    checkDeadline();

    return () => {
      clearTimer();
      recordActivityRef.current = null;
      window.removeEventListener("pointerdown", recordActivity);
      window.removeEventListener("keydown", recordActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channel?.removeEventListener("message", handleChannelMessage);
      channel?.close();
    };
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      recordActivityRef.current?.();
    }
  }, [enabled, pathname]);
}
