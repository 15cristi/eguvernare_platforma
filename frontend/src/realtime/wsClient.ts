import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let client: Client | null = null;

// listeners care se cheamă de fiecare dată când STOMP e conectat (inclusiv după reconnect)
const onConnectListeners = new Set<() => void>();

const WS_URL = "http://localhost:8080/ws";

export function connectWs(token: string) {
  if (client?.active) return client;

  client = new Client({
    webSocketFactory: () => new SockJS(WS_URL),
    reconnectDelay: 3000,
    connectHeaders: {
      Authorization: `Bearer ${token}`
    },
    onConnect: () => {
      // cheamă listener-ele (reconnect safe)
      onConnectListeners.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error("onConnect listener failed:", e);
        }
      });
    },
    onStompError: (frame) => {
      console.error("STOMP error:", frame.headers["message"], frame.body);
    },
    onWebSocketError: (evt) => {
      console.error("WebSocket error:", evt);
    },
    onWebSocketClose: (evt) => {
       console.log("WebSocket closed:", evt);
    }
  });


  client.activate();
  return client;
}

export function disconnectWs() {
  if (!client) return;
  onConnectListeners.clear();
  client.deactivate();
  client = null;
}

export function getWsClient() {
  return client;
}

// te abonezi la “connected event”; primești un cleanup
export function onWsConnect(cb: () => void) {
  onConnectListeners.add(cb);
  return () => onConnectListeners.delete(cb);
}


export function safeSubscribe(destination: string, cb: (msg: IMessage) => void): StompSubscription | null {
  if (!client || !client.connected) return null;
  return client.subscribe(destination, cb);
}
