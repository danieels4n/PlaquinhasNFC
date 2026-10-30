"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

function tokenFrom(text: string) {
  const m = text.match(/\/q\/([A-Za-z0-9]{8})(?:[/?#]|$)/) ?? text.match(/^([A-Za-z0-9]{8})$/);
  return m ? m[1].toUpperCase() : null;
}

/** Lê o QR da plaquinha pela câmera (navegadores com BarcodeDetector, como Chrome no Android). */
export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    (async () => {
      const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
      if (!Ctor) {
        setError("Este navegador não lê QR pelo app. Use a câmera do celular: aponte para o QR e toque no link.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        setError("Não foi possível abrir a câmera. Verifique a permissão.");
        return;
      }
      const video = videoRef.current;
      if (!video || stopped) return;
      video.srcObject = stream;
      await video.play().catch(() => {});
      const detector = new Ctor({ formats: ["qr_code"] });

      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(video);
          const token = codes.map((c) => tokenFrom(c.rawValue)).find(Boolean);
          if (token) {
            stopped = true;
            router.push(`/ativar?token=${token}`);
            return;
          }
          if (codes.length) setError("Este QR não é de uma plaquinha.");
        } catch {
          // quadro ainda não pronto
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, router]);

  if (!open) {
    return (
      <button type="button" className="btn-ghost w-full" onClick={() => { setError(""); setOpen(true); }}>
        Escanear QR com a câmera
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn">{error}</p>
      ) : (
        <video ref={videoRef} playsInline muted className="aspect-square w-full rounded-lg bg-black object-cover" />
      )}
      <button type="button" className="btn-ghost w-full" onClick={() => setOpen(false)}>Fechar câmera</button>
    </div>
  );
}
