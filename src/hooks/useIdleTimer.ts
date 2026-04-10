import { useState, useEffect, useRef } from 'react';

export function useIdleTimer() {
  const [idleSeconds, setIdleSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const resetIdle = () => setIdleSeconds(0);

    // 监听全局交互事件
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);

    // 每秒累加
    timerRef.current = setInterval(() => {
      setIdleSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      clearInterval(timerRef.current);
    };
  }, []);

  return { idleSeconds };
}