import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

interface WebSocketContextType {
  ws: WebSocket | null;
  sendMessage: (message: string) => void;
  messages: string[];
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Module-level singleton to prevent duplicate connections (StrictMode issue)
let globalWs: WebSocket | null = null;
let isConnecting = false;
let messageListeners: Array<(msg: string) => void> = [];
let openListeners: Array<() => void> = [];
let closeListeners: Array<() => void> = [];

function getOrCreateWebSocket(): WebSocket {
  if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) {
    console.log('Reusing existing WebSocket connection');
    return globalWs;
  }

  if (isConnecting) {
    console.log('WebSocket already connecting, waiting...');
    return globalWs!;
  }

  isConnecting = true;
  
  const fastApiUrl = import.meta.env.VITE_FASTAPI_URL || "ws://localhost:8000";
  const wsUrl = fastApiUrl.startsWith('ws://') || fastApiUrl.startsWith('wss://') 
    ? `${fastApiUrl}/ws/` 
    : `ws://${fastApiUrl}/ws/`;
  
  console.log('Creating new WebSocket connection at:', wsUrl);
  globalWs = new WebSocket(wsUrl);

  globalWs.onopen = () => {
    console.log('WebSocket connection opened');
    isConnecting = false;
    openListeners.forEach(listener => listener());
  };

  globalWs.onmessage = (event) => {
    console.log('WebSocket message received:', event.data);
    messageListeners.forEach(listener => listener(event.data));
  };

  globalWs.onclose = () => {
    console.log('WebSocket connection closed');
    isConnecting = false;
    closeListeners.forEach(listener => listener());
    globalWs = null;
  };

  globalWs.onerror = (error) => {
    console.error('WebSocket error:', error);
    isConnecting = false;
  };

  return globalWs;
}

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const socket = getOrCreateWebSocket();
    setWs(socket);

    // Add listeners for this component instance
    const onMessage = (msg: string) => setMessages(prev => [...prev, msg]);
    const onOpen = () => setWs(socket);
    const onClose = () => setWs(null);

    messageListeners.push(onMessage);
    openListeners.push(onOpen);
    closeListeners.push(onClose);

    // If already open, trigger the open handler
    if (socket.readyState === WebSocket.OPEN) {
      onOpen();
    }

    return () => {
      // Remove this component's listeners
      messageListeners = messageListeners.filter(l => l !== onMessage);
      openListeners = openListeners.filter(l => l !== onOpen);
      closeListeners = closeListeners.filter(l => l !== onClose);
      
      // Don't close the WebSocket - keep it open for other components/remounts
      console.log('Component unmounting, keeping WebSocket open');
    };
  }, []);

  const sendMessage = useCallback((message: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    } else {
      console.warn('WebSocket is not open. Cannot send message:', message);
    }
  }, [ws]);

  return (
    <WebSocketContext.Provider value={{ ws, sendMessage, messages }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
