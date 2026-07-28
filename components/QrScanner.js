import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function QrScanner({ onResult, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        tick();
      } catch (err) {
        setError("Couldn't access the camera. Check your browser's camera permission.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result?.data) {
        onResult(result.data);
        return; // stop scanning once found
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 16, padding: 24,
      }}
    >
      {error ? (
        <div style={{ color: "var(--danger)", fontSize: 14, textAlign: "center", maxWidth: 280 }}>{error}</div>
      ) : (
        <div style={{ position: "relative", width: 280, height: 280, borderRadius: 16, overflow: "hidden" }}>
          <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{
            position: "absolute", inset: 12, border: "2px solid var(--accent)", borderRadius: 12,
            pointerEvents: "none",
          }} />
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <button className="btn btn-secondary" style={{ maxWidth: 200 }} onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
