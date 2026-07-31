"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface AgentEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  run_id: string;
}

export function useWebSocket(url: string) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as AgentEvent;
        if (data.type === "ping") return;
        setEvents((prev) => {
          const next = [data, ...prev];
          return next.slice(0, 300); // keep last 300 events
        });
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { events, connected };
}
