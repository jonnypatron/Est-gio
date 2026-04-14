function isImageFeedHeader(value) {
  if (!value || typeof value !== "object") return false;
  return (
    typeof value.topic === "string" &&
    typeof value.format === "string" &&
    typeof value.timestamp === "number"
  );
}

function getMimeType(format) {
  const normalized = format.toLowerCase();
  if (normalized.includes("png")) return "image/png";
  if (normalized.includes("webp")) return "image/webp";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "image/jpeg";
  return "application/octet-stream";
}

export class ImageFeedConnectionService {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.frameCallbacks = new Set();
    this.manualDisconnect = false;
  }

  onFrame(callback) {
    this.frameCallbacks.add(callback);
  }

  offFrame(callback) {
    this.frameCallbacks.delete(callback);
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    
    this.manualDisconnect = false;
    this.ws = new WebSocket(this.config.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => console.log("Video Feed: Ligado!");
    this.ws.onmessage = (event) => this.handleIncomingMessage(event.data);
    this.ws.onerror = (error) => console.error("Video Feed: Erro no WebSocket", error);
    this.ws.onclose = () => {
      this.ws = null;
      if (!this.manualDisconnect) console.warn("Video Feed: Desligado. A tentar reconectar...");
    };
  }

  disconnect() {
    this.manualDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  enableStream(topic) {
    return this.sendCommand("enable", topic);
  }

  sendCommand(cmd, topic) {
    if (!this.isConnected() || !this.ws) return false;
    try {
      this.ws.send(JSON.stringify({ cmd, topic }));
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  handleIncomingMessage(data) {
    if (data instanceof ArrayBuffer) {
      this.processFrameBuffer(data);
    } else if (data instanceof Blob) {
      data.arrayBuffer().then((buffer) => this.processFrameBuffer(buffer));
    }
  }

  processFrameBuffer(buffer) {
    try {
      if (buffer.byteLength < 4) return;
      
      const view = new DataView(buffer);
      const headerSize = view.getUint32(0, true);
      
      if (headerSize === 0 || headerSize > buffer.byteLength - 4) return;

      const headerBytes = new Uint8Array(buffer, 4, headerSize);
      const headerString = new TextDecoder().decode(headerBytes);
      const parsedHeader = JSON.parse(headerString);

      if (!isImageFeedHeader(parsedHeader)) return;

      const payload = buffer.slice(4 + headerSize);
      const mimeType = getMimeType(parsedHeader.format);
      
      const frame = {
        ...parsedHeader,
        blob: new Blob([payload], { type: mimeType }),
        mimeType,
      };

      for (const callback of this.frameCallbacks) {
        callback(frame);
      }
    } catch (error) {
    }
  }
}