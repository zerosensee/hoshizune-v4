'use client';

import { useEffect, useRef } from 'react';
import { HEARTBEAT_INTERVAL_MS } from '@/lib/constants';

/**
 * Хук heartbeat — отправляет POST /api/heartbeat
 * каждые 30 секунд для поддержания онлайн-статуса.
 */
export function useHeartbeat() {
  const intervalRef = useRef(null);

  useEffect(() => {
    function sendHeartbeat() {
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }).catch(() => {
        /* Тихо игнорируем ошибки heartbeat */
      });
    }

    /* Первый heartbeat сразу */
    sendHeartbeat();

    intervalRef.current = setInterval(
      sendHeartbeat,
      HEARTBEAT_INTERVAL_MS
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}
