import "server-only";
import QRCode from "qrcode";

export function qrDataUrl(text: string, width = 512) {
  return QRCode.toDataURL(text, { width, margin: 2, errorCorrectionLevel: "M" });
}

export function qrSvg(text: string) {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}
