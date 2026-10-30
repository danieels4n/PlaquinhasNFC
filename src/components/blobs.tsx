/**
 * Onda azul-clara saindo do canto superior direito (como na referência do cabeçalho).
 * O desenho é um SVG usado como imagem de fundo: renderiza de forma confiável atrás do conteúdo,
 * o que um <svg> solto nessa posição não fazia neste navegador. Só decorativo.
 */
const WAVE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" preserveAspectRatio="none">
<defs>
<linearGradient id="a" x1="1" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#adc2fb"/><stop offset="1" stop-color="#d6e0fd"/>
</linearGradient>
<linearGradient id="b" x1="1" y1="0" x2="0" y2="0.6">
<stop offset="0" stop-color="#cfdbfd"/><stop offset="1" stop-color="#e6ecfe" stop-opacity="0.2"/>
</linearGradient>
</defs>
<path fill="url(#b)" d="M0,0 C40,28 110,46 175,34 C235,23 285,10 330,0 Z"/>
<path fill="url(#a)" d="M120,0 C132,46 176,70 232,72 C292,74 330,98 352,140 C366,166 384,184 400,192 L400,0 Z"/>
</svg>`;

const WAVE_URL = `url("data:image/svg+xml,${encodeURIComponent(WAVE_SVG)}")`;

export function Blobs({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      style={{ backgroundImage: WAVE_URL, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}
    />
  );
}
