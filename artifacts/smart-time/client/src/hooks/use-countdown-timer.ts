import { useState, useEffect, useRef } from "react";

export function useCountdownTimer(
  minutes: number,
  onExpire: () => void,
  active: boolean,
  initialSeconds?: number
) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    initialSeconds !== undefined ? Math.max(0, initialSeconds) : minutes * 60
  );
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (initialSeconds === undefined) {
      setSecondsLeft(minutes * 60);
    }
  }, [minutes]);

  useEffect(() => {
    if (!active || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpireRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, secondsLeft === 0]);

  const isWarning = secondsLeft < 120 && secondsLeft > 0;
  const isCritical = secondsLeft < 60 && secondsLeft > 0;
  const isExpired = secondsLeft <= 0;

  return {
    secondsLeft,
    isWarning,
    isCritical,
    isExpired,
    formattedTime: `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`,
  };
}
