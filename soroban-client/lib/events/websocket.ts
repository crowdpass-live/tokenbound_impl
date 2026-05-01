export interface EventListenerOptions {
  eventContractId: string;
  startCursor?: string;
  onEvent: (event: ContractEvent) => void;
  onError?: (error: Error) => void;
}

export interface ContractEvent {
  id: string;
  contractId: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  cursor: string;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnecting" | "disconnected" | "error";

export class EventMonitor {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private options: EventListenerOptions | null = null;

  async connect(options: EventListenerOptions): Promise<void> {
    this.options = options;
    this.status = "connecting";

    const wsUrl = this.buildWsUrl(options.eventContractId, options.startCursor);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.status = "connected";
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const contractEvent: ContractEvent = {
            id: data.id,
            contractId: data.contractId || options.eventContractId,
            type: data.type || data.topic || "unknown",
            data: data.data || {},
            timestamp: data.timestamp || Date.now(),
            cursor: data.cursor || "",
          };
          options.onEvent(contractEvent);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      this.ws.onerror = () => {
        this.status = "error";
        options.onError?.(new Error("WebSocket connection error"));
      };

      this.ws.onclose = () => {
        this.status = "disconnected";
        this.attemptReconnect();
      };
    } catch (e) {
      this.status = "error";
      throw e;
    }
  }

  private buildWsUrl(contractId: string, cursor?: string): string {
    const horizonUrl = process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
    const protocol = horizonUrl.includes("testnet") ? "wss" : "wss";
    return `${protocol}${
      horizonUrl.replace("https://", "").replace("http://", "")
    }/events?contractId=${contractId}${cursor ? `&cursor=${cursor}` : ""}`;
  }

  private attemptReconnect(): void {
    if (this.options && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.options && this.connect(this.options);
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.status = "disconnecting";
      this.ws.close();
      this.ws = null;
    }
    this.status = "disconnected";
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }
}

export function createEventMonitor(): EventMonitor {
  return new EventMonitor();
}