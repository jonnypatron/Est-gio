import React, { useEffect, useRef, useState } from "react";
import { ImageFeedConnectionService } from "./imageFeedService";

export default function VideoStreamDisplay({ videoWsUrl, topic, cameraLabel }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [fps, setFps] = useState(0);
  
  const serviceRef = useRef(null);
  const currentUrlRef = useRef(null);
  const pendingUrlRef = useRef(null);
  const isAwaitingImageLoadRef = useRef(false);
  const lastFrameArrivalRef = useRef(null);

  useEffect(() => {
    if (!videoWsUrl) return;

    const service = new ImageFeedConnectionService({ url: videoWsUrl });
    serviceRef.current = service;
    service.connect();

    const connectTimer = setTimeout(() => {
      service.enableStream(topic);
    }, 1000);

    const handleFrame = (frame) => {
      if (topic && frame.topic !== topic) return;

      const nextUrl = URL.createObjectURL(frame.blob);
      const now = performance.now();

      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
      pendingUrlRef.current = nextUrl;

      if (lastFrameArrivalRef.current !== null) {
        const interval = now - lastFrameArrivalRef.current;
        if (interval > 0) setFps(Math.round(1000 / interval));
      }
      lastFrameArrivalRef.current = now;

      if (!isAwaitingImageLoadRef.current) {
        isAwaitingImageLoadRef.current = true;
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = pendingUrlRef.current;
        setImageUrl(pendingUrlRef.current);
        pendingUrlRef.current = null;
      }
    };

    service.onFrame(handleFrame);

    return () => {
      clearTimeout(connectTimer);
      service.offFrame(handleFrame);
      service.disconnect();
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
    };
  }, [videoWsUrl, topic]);

  const handleImageLoad = () => {
    isAwaitingImageLoadRef.current = false;
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
      
      {!imageUrl ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#888' }}>
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

      {fps > 0 && (
        <div style={{
          position: "absolute", bottom: "10px", right: "10px",
          fontSize: "12px", color: "#fff", background: "rgba(0, 0, 0, 0.6)",
          padding: "4px 8px", borderRadius: "4px", border: "1px solid #333"
        }}>
          {fps} FPS
        </div>
      )}
      
    </div>
  );
}