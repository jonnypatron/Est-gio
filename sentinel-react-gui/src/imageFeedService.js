// chamada depois de JSON.parse para garantir que o servidor enviou um header válido antes de tentar aceder aos campos
function isImageFeedHeader(value) { // verifica se o objeto JSON recebido tem a estrutura esperada para o header do feed de imagens
  if (!value || typeof value !== "object") return false; // retorna false se o valor não for um objeto válido
  return (
    typeof value.topic     === "string" && // ex: "/camera/compressed"
    typeof value.format    === "string" && // ex: "jpeg"
    typeof value.timestamp === "number"    // ex: 1234567.89
  );
}
 
function getMimeType(format) { // Converte o campo "format" do ROS para um MIME type que o browser entende.
  const n = format.toLowerCase();

  if (n.includes("png"))                        return "image/png"; // O ROS envia formato como uma string livre, que pode incluir texto extra como "rgb8; jpeg compressed" ou apenas "jpeg", Por isso usa-se includes em vez de comparaçoes diretas
  if (n.includes("webp"))                       return "image/webp";
  if (n.includes("jpeg") || n.includes("jpg")) return "image/jpeg"; // png verificado antes de jpeg porque nao ha ambiguidade
  return "application/octet-stream"; // fallback permite ao browser tentar interpretar o conteúdo mesmo que o formato seja desconhecido
}
 
export class ImageFeedConnectionService {
  constructor(config) {
    // config = { url: "ws://192.168.31.14:9092" }
    this.config           = config;
    this.ws               = null; // instância WebSocket (null quando desligado)
    this.frameCallbacks   = new Set(); // Set de funções registadas para receber frames | Set em vez de array para evitar duplicados e para remoçao 0(1) com offFrame
    this.manualDisconnect = false; // distingue desconexão intencional de falha de rede
 
    // ── Auto-reconexão ────────────────────────────────────────────────────────
    this._reconnectTimer   = null; // guarda a referência do timer para poder ser cancelado caso a ligação seja fechada manualmente
    this._reconnectDelay   = 2000;   // ms da primeira tentativa de reconexão
    this._reconnectAttempt = 0;      // contador de tentativas para aplicar o backoff exponencial no onclose
    this._activeTopic      = null;   // tópico ativo a re-enviar automaticamente após uma reconexão bem-sucedida
 
    // ── TextDecoder reutilizável ──────────────────────────────────────────────
    // Criar uma instância por frame (como fazia a v1) é desnecessário e consome recursos.
    // Uma instância partilhada é stateless para decode() — é seguro reutilizá-la.
    this._decoder = new TextDecoder();
  }
 
  // ── Pub/sub de frames ─────────────────────────────────────────────────────
  // O padrão pub/sub aqui permite que múltiplos componentes React se registem
  // para receber frames do mesmo serviço sem que o serviço precise de saber
  // quantos componentes existem.
  //
  // Uso típico:
  // service.onFrame(handleFrame) // regista
  // service.offFrame(handleFrame) // remove (importante no cleanup do useEffect)
  //
  // ATENÇÃO: a referência da função passada a onFrame deve ser a MESMA passada
  // a offFrame. Por isso no useEffect define-se handleFrame fora e usa-se
  // a mesma referência nos dois sítios.
  onFrame(callback)  { this.frameCallbacks.add(callback); }
  offFrame(callback) { this.frameCallbacks.delete(callback); }
 
  // ── Ligação ───────────────────────────────────────────────────────────────
  connect() {
    // Guarda idempotente: não abre segunda ligação se já está aberta ou a abrir.
    // Importante porque o componente pode chamar connect() múltiplas vezes.
    if (
      this.ws?.readyState === WebSocket.OPEN ||
      this.ws?.readyState === WebSocket.CONNECTING
    ) return;
 
    this.manualDisconnect = false;
    this.ws = new WebSocket(this.config.url);

    // CRÍTICO: sem esta linha, o browser entrega os dados como string (texto).
    // Com "arraybuffer", os dados chegam como ArrayBuffer (bytes puros), que é o que o protocolo binário requer.
    this.ws.binaryType = "arraybuffer";
 
    this.ws.onopen = () => {
      console.log("Video Feed: Connected to", this.config.url); // ligação estabelecida. O VideoStreamDisplay envia o comando "enable" pouco depois daqui
      this._reconnectDelay   = 2000; // repõe o delay inicial após uma ligação com sucesso
      this._reconnectAttempt = 0;    // faz reset ao contador de tentativas
 
      // Retoma automaticamente o tópico anterior (ex: após perda de rede)
      // Garante que o stream de vídeo continua no mesmo tópico sem precisar de intervenção do utilizador
      if (this._activeTopic) {
        this.sendCommand("enable", this._activeTopic);
      }
    };
 
    this.ws.onmessage = (event) => this._handleIncomingMessage(event.data); // cada vez que o servidor envia um frame, este callback é chamado
 
    this.ws.onerror = (err) =>
      console.error("Video Feed: WebSocket error", err); // erros de rede (servidor inacessível, timeout, etc). O onclose é sempre chamado a seguir a um onerror
 
    this.ws.onclose = () => {
      this.ws = null;
      if (!this.manualDisconnect) { // desconexão não intencional - lógica de reconexão automática executada aqui
        this._reconnectAttempt++;
        // Backoff exponencial: 2s → 3s → 4.5s → … → máx 30s
        // Evita sobrecarregar o servidor e a rede com tentativas contínuas e imediatas
        const delay = Math.min(
          this._reconnectDelay * Math.pow(1.5, this._reconnectAttempt - 1),
          30_000
        );
        console.warn(
          `Video Feed: Disconnected. Attempt #${this._reconnectAttempt} in ${Math.round(delay / 1000)}s...`
        );
        this._reconnectTimer = setTimeout(() => {
          if (!this.manualDisconnect) this.connect(); // tenta ligar novamente caso entretanto não tenha havido um disconnect() manual
        }, delay);
      } // se o manualDisconnect for true, foi o disconnect() que fechou - é esperado
    };
  }
 
  disconnect() {
    this.manualDisconnect = true; // sinaliza que o fecho é intencional
    this._activeTopic     = null; // limpa o tópico ativo para não o reativar inadvertidamente numa futura ligação
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer); // cancela qualquer tentativa de reconexão que tenha ficado pendente
      this._reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
 
  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
 
  // ── Comandos para o servidor PY ──────────────────────────────────────────
  //
  // O servidor PY implementa um sistema de subscrição por tópico.
  // Um cliente pode pedir para receber frames de um tópico específico.
  // Isto permite, por exemplo, ter múltiplas câmaras na Sentinel mas só
  // transferir via rede as que estão visíveis na interface.
  //
  // Protocolo: o cliente envia JSON de texto (não binário):
  //   { "cmd": "enable",  "topic": "/camera/compressed" }  → começa a receber
  //   { "cmd": "disable", "topic": "/camera/compressed" }  → para de receber
  //   { "cmd": "switch",  "topic": "/camera2/compressed" } → muda câmara atomicamente
 
  enableStream(topic) {
    this._activeTopic = topic; // guarda o tópico atual para a funcionalidade de auto-reconexão
    return this.sendCommand("enable", topic);
  }
 
  disableStream(topic) {
    this._activeTopic = null; // limpa o estado do tópico ativo ao desativar o stream explicitamente
    return this.sendCommand("disable", topic);
  }
 
  switchStream(newTopic) {
    this._activeTopic = newTopic; // atualiza a referência do tópico ativo para a nova câmara
    return this.sendCommand("switch", newTopic);
  }
 
  sendCommand(cmd, topic) {
    if (!this.isConnected()) return false;
    try {
      this.ws.send(JSON.stringify({ cmd, topic }));
      return true;
    } catch (err) {
      console.error("Video Feed: Error sending command", err);
      return false;
    }
  }
 
  // ── Receção e descodificação ──────────────────────────────────────────────
 
  _handleIncomingMessage(data) {
    if (data instanceof ArrayBuffer) { // Caso normal: browser com binaryType="arraybuffer"
      this._processFrameBuffer(data);
    } else if (data instanceof Blob) {
      // Caso fallback: alguns browsers antigos ignoram binaryType
      // Converte Blob para ArrayBuffer e processa
      data.arrayBuffer().then((buf) => this._processFrameBuffer(buf));
    }
    // Mensagens de texto (string) são ignoradas — o servidor não envia texto
  }
 
  // DESCODIFICAÇÃO DO PROTOCOLO BINÁRIO
  //
  // Implementa a leitura do protocolo descrito na secção 2.
  // Todos os erros são capturados silenciosamente — um frame corrompido
  // é simplesmente descartado sem terminar a ligação nem mostrar erros
  // ao utilizador. Isto é intencional: perdas ocasionais de frames são
  // aceitáveis num stream de vídeo em tempo real.
  _processFrameBuffer(buffer) {
    try {
      // Validação mínima: pelo menos 4 bytes para o headerSize
      if (buffer.byteLength < 4) return; // Lê 4 bytes → headerSize
 
      const view       = new DataView(buffer);
      // Lê os primeiros 4 bytes como uint32 little-endian
      // (true = little-endian, que é o padrão no PY com memcpy em x86/ARM)
      const headerSize = view.getUint32(0, true);
 
      // Validação: headerSize não pode ser 0 nem exceder o buffer restante
      if (headerSize === 0 || headerSize > buffer.byteLength - 4) return;
 
      // Extrai os bytes do JSON (offset 4, tamanho headerSize)
      // Reutiliza o decoder — evita new TextDecoder() por frame
      const headerBytes  = new Uint8Array(buffer, 4, headerSize);
      const parsedHeader = JSON.parse(this._decoder.decode(headerBytes)); // bytes → string UTF-8 e JSON.parse() → { topic, format, timestamp }
      // parsedHeader = { topic: "/camera/compressed", format: "jpeg", timestamp: 1234567.89 }
 
      if (!isImageFeedHeader(parsedHeader)) return; // Valida campos obrigatórios (isImageFeedHeader) | estrutura do header
 
      // Tudo o que está depois do header são os bytes da imagem
      const payload  = buffer.slice(4 + headerSize); // buffer.slice() cria uma CÓPIA do sub-buffer (necessário para o Blob)
      const mimeType = getMimeType(parsedHeader.format); // Restante buffer → Blob com MIME type correto (ex. "image/jpeg")
 
      // Cria um Blob: objeto imutável que representa dados binários no browser.
      // O MIME type diz ao browser como interpretar os bytes (como imagem JPEG, etc.)
      const frame = {
        ...parsedHeader,
        blob: new Blob([payload], { type: mimeType }),
        mimeType,
      };
 
      // Distribui o frame a todos os componentes registados 
      for (const cb of this.frameCallbacks) cb(frame); // Chama todos os frameCallbacks registados
 
    } catch (_) {
      // Frame com JSON inválido ou buffer corrompido — descarta silenciosamente
    }
  }
}