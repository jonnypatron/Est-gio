import React, { useEffect, useRef, useState } from "react";
import { ImageFeedConnectionService } from "./imageFeedService";

// ── Constante: janela do rolling-average de FPS ───────────────────────────────
// 15 timestamps → intervalo médio sobre ~0.8 s a 18 FPS.
// Suficiente para absorver jitter de rede sem tornar o valor lento a reagir
// a mudanças reais de framerate.
const FPS_WINDOW = 15;

// Quanto tempo sem frames (ms) antes de mostrar o aviso de stream parado.
// 3 s é suficiente para ignorar pausas normais de rede sem alarmar o operador.
const STALE_THRESHOLD_MS = 3000;

// Props:
//   videoWsUrl  — URL do servidor C++, ex: "ws://192.168.31.14:9092", tipo = string, obrigatório
//   topic       — tópico ROS2 a subscrever, ex: "/hires_small_color/compressed", tipo = string, obrigatório
//   cameraLabel — texto exibido no placeholder e no atributo alt da imagem, tipo = string, opcional
export default function VideoStreamDisplay({ videoWsUrl, topic, cameraLabel }) {

  // ── Estado React (causa re-render quando atualizado) ─────────────────────────
  const [imageUrl,  setImageUrl]  = useState(null);
    // A URL blob atual exibida no <img>.
    // null = ainda não chegou nenhum frame (mostra placeholder "Waiting for video signal...").
    // "blob:http://..." = URL temporária que aponta para os bytes JPEG em memória.

  const [fps,       setFps]       = useState(0);
    // FPS calculado por rolling average — apenas para diagnóstico visual.
    // Não afeta o funcionamento do stream.

  const [staleSecs, setStaleSecs] = useState(0);
    // Segundos desde o último frame recebido.
    // 0 = stream ativo (ou ainda sem frames).
    // >= STALE_THRESHOLD_MS/1000 → mostra aviso de stream parado por cima da última frame congelada.

  // ── Refs (não causam re-render, persistem entre renders) ─────────────────────
  const serviceRef        = useRef(null);
    // Instância do ImageFeedConnectionService.
    // Guardada em Ref em vez de estado porque trocar de serviço não deve causar re-render.

  const currentUrlRef     = useRef(null);
    // URL blob que está atualmente definida no <img src>.
    // Necessária para revogar a memória quando o próximo frame chegar — sem isto
    // os bytes JPEG acumulam-se em memória até o browser decidir fazer GC.

  const pendingUrlRef     = useRef(null);
    // URL blob do frame mais recente que chegou mas ainda não foi exibido.
    // Acontece quando o browser ainda está a decodificar o frame anterior (isAwaitingLoadRef=true).
    // Se chegarem mais frames entretanto, este valor é substituído — só interessa o mais recente.
    // O frame intermédio descartado tem a sua URL revogada para não vazar memória.

  const isAwaitingLoadRef = useRef(false);
    // Backpressure flag:
    //   true  → o browser está a decodificar/renderizar — não enviar outro frame ainda.
    //   false → o browser está livre para receber o próximo frame.
    // Garante que o componente nunca acumula mais de 1 frame pendente para o browser.
    // Sem isto, enviar frames mais rápido do que o browser consegue decodificar
    // causaria stuttering e ocupação crescente de memória.

  const topicRef          = useRef(topic);
    // Tópico atual guardado numa Ref para leitura síncrona dentro do callback handleFrame.
    // Permite filtrar frames de tópicos antigos instantaneamente, sem recriar a ligação WebSocket.
    // Atualizado pelo Effect 2 sempre que a prop topic muda.

  const fpsTimestampsRef  = useRef([]);
    // Rolling buffer de timestamps (performance.now()) das últimas FPS_WINDOW chegadas de frames.
    // O FPS é calculado como: (t_último - t_primeiro) / (n - 1) intervalos.
    // Usar uma janela deslizante em vez do intervalo instantâneo elimina o jitter
    // causado por variações normais de rede (ex: 7→200→40 FPS torna-se ~18 FPS estável).

  const lastFrameTimeRef  = useRef(null);
    // Timestamp (Date.now()) da última chegada de frame.
    // Usado pelo intervalo de staleness para calcular há quantos segundos o stream parou.
    // É Date.now() (e não performance.now()) porque o setInterval também usa Date.now().

  // ── Effect 1: Ligação WebSocket e receção de frames ───────────────────────────
  // Cria a ligação apenas quando videoWsUrl muda.
  // Ao trocar de tópico de câmara, este effect NÃO é recriado — só o Effect 2 corre.
  // Isto evita o overhead de desligar/reconectar o WebSocket a cada troca de câmara.
  useEffect(() => {
    if (!videoWsUrl) return;

    const service = new ImageFeedConnectionService({ url: videoWsUrl });
    serviceRef.current = service;
    service.connect();

    // Aguarda 1 s antes de enviar "enable" para garantir que o WebSocket está aberto.
    // O Effect 2 atualiza topicRef.current quando o topic muda, por isso este
    // connectTimer usa sempre o tópico mais recente mesmo que tenha mudado entretanto.
    const connectTimer = setTimeout(() => {
      service.enableStream(topicRef.current);
    }, 1000);

    // ── Callback chamado a cada frame recebido ──────────────────────────────────
    const handleFrame = (frame) => {

      // Filtra frames de tópicos antigos que ainda estejam em trânsito durante uma troca de câmara.
      if (topicRef.current && frame.topic !== topicRef.current) return;

      // Cria uma blob URL para os bytes da imagem JPEG.
      // É um URL temporário local (ex: "blob:http://localhost:5173/abc123") que o <img> pode usar.
      const nextUrl = URL.createObjectURL(frame.blob);
      const now     = performance.now();

      // Regista o tempo do frame para o indicador de stream parado.
      lastFrameTimeRef.current = Date.now();
      setStaleSecs(0); // Reset imediato assim que chega um novo frame

      // Se havia um frame pendente que nunca chegou a ser exibido, revoga a sua URL
      // para libertar a memória — esse frame é descartado, só o mais recente conta.
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
      pendingUrlRef.current = nextUrl;

      // ── Rolling-average FPS ─────────────────────────────────────────────────
      const buf = fpsTimestampsRef.current;
      buf.push(now);
      if (buf.length > FPS_WINDOW) buf.shift();   // janela deslizante de FPS_WINDOW elementos
      if (buf.length >= 2) {
        const span        = buf[buf.length - 1] - buf[0];
        const avgInterval = span / (buf.length - 1);
        setFps(Math.round(1000 / avgInterval));
      }

      // ── Backpressure ────────────────────────────────────────────────────────
      // Só promove o frame a exibir se o browser terminou de decodificar o anterior.
      // Se estiver ocupado (isAwaitingLoadRef=true), o frame fica em pendingUrlRef
      // e será exibido quando handleImageLoad disparar.
      if (!isAwaitingLoadRef.current) {
        isAwaitingLoadRef.current = true;
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = pendingUrlRef.current;
        setImageUrl(pendingUrlRef.current);
        pendingUrlRef.current = null;
      }
    };

    service.onFrame(handleFrame);

    // ── Verificador de stream parado (corre a cada segundo) ─────────────────────
    // Se passarem STALE_THRESHOLD_MS sem frames e a ligação ainda estiver ativa,
    // atualiza staleSecs para mostrar o aviso de stream parado ao operador.
    // Ajuda a distinguir: "o tópico não existe" vs. "problema de rede transitório".
    const stalenessTimer = setInterval(() => {
      if (lastFrameTimeRef.current === null) return; // ainda não chegou nenhum frame
      const elapsed = Date.now() - lastFrameTimeRef.current;
      if (elapsed >= STALE_THRESHOLD_MS) {
        setStaleSecs(Math.floor(elapsed / 1000));
      }
    }, 1000);

    // ── Cleanup ao desmontar ou ao mudar videoWsUrl ─────────────────────────────
    return () => {
      clearTimeout(connectTimer);
      clearInterval(stalenessTimer);
      service.offFrame(handleFrame);
      service.disconnect();
      // Revoga todas as blob URLs ainda em voo para não vazar memória
      if (currentUrlRef.current) { URL.revokeObjectURL(currentUrlRef.current); currentUrlRef.current = null; }
      if (pendingUrlRef.current)  { URL.revokeObjectURL(pendingUrlRef.current);  pendingUrlRef.current  = null; }
      fpsTimestampsRef.current  = [];
      lastFrameTimeRef.current  = null;
      setImageUrl(null);
      setFps(0);
      setStaleSecs(0);
    };
  }, [videoWsUrl]);

  // ── Effect 2: Troca de tópico de câmara (não recria a ligação WebSocket) ──────
  // Quando o operador carrega num botão de câmara diferente, este effect:
  //   1. Atualiza topicRef.current imediatamente — os frames do tópico antigo são
  //      filtrados em handleFrame a partir deste momento.
  //   2. Envia { cmd: "switch", topic: "..." } ao servidor C++ se a ligação estiver aberta.
  //      O servidor para de enviar o tópico antigo e começa o novo atomicamente.
  //   3. Se a ligação ainda não estiver aberta (ex: reconexão em curso), o enableStream
  //      no connectTimer do Effect 1 usará topicRef.current já atualizado.
  //   4. Limpa o buffer de FPS para não poluir a média com o silêncio entre câmaras.
  useEffect(() => {
    topicRef.current = topic;
    const service = serviceRef.current;
    if (service?.isConnected()) {
      service.switchStream(topic);
    }
    fpsTimestampsRef.current = [];
    lastFrameTimeRef.current = null;
    setStaleSecs(0);
  }, [topic]);

  // ── Callback do <img> onLoad ──────────────────────────────────────────────────
  // Chamado pelo browser quando termina de decodificar e renderizar um frame.
  // Liberta a flag de backpressure e, se há um frame pendente, exibe-o imediatamente.
  const handleImageLoad = () => {
    isAwaitingLoadRef.current = false;

    if (pendingUrlRef.current) {
      isAwaitingLoadRef.current = true;
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = pendingUrlRef.current;
      setImageUrl(pendingUrlRef.current);
      pendingUrlRef.current = null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const isStale = staleSecs >= (STALE_THRESHOLD_MS / 1000);

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden'
    }}>

      {/* Placeholder inicial: nunca recebeu nenhum frame */}
      {!imageUrl ? (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: '100%', color: '#888', fontSize: '13px', letterSpacing: '1px'
        }}>
          Waiting for video signal...
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={cameraLabel || "Video feed"}
          onLoad={handleImageLoad}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {/* Aviso de stream parado: aparece por cima do último frame congelado.
          Só é visível quando já houve frames (imageUrl !== null) mas o stream parou.
          Ajuda o operador a distinguir entre "câmara sem sinal" e "ligação perdida". */}
      {imageUrl && isStale && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          gap: '6px',
          zIndex: 5,
        }}>
          <span style={{
            fontSize: '11px', fontWeight: '800', letterSpacing: '2px',
            color: '#ffd84a', fontFamily: 'monospace',
          }}>
            ⚠ STREAM INACTIVE
          </span>
          <span style={{
            fontSize: '10px', color: '#aaa', fontFamily: 'monospace', letterSpacing: '1px',
          }}>
            Last frame: {staleSecs}s ago
          </span>
        </div>
      )}

      {/* Contador de FPS — canto superior direito, acima dos botões de câmara */}
      {fps > 0 && !isStale && (
        <div style={{
          position: 'absolute', top: '10px', right: '10px',
          fontSize: '12px', color: '#fff',
          background: 'rgba(0,0,0,0.6)',
          padding: '4px 8px', borderRadius: '4px',
          border: '1px solid #333',
          fontFamily: 'monospace',
          zIndex: 10,
        }}>
          {fps} FPS
        </div>
      )}

    </div>
  );
}