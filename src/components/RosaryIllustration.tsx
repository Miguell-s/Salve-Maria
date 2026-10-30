// Ilustração original (SVG) de um terço, usada como imagem padrão quando um produto
// ainda não tem fotografia e no banner até o dono enviar a foto real (Admin > Configurações).
// Não é uma fotografia: serve apenas de espaço reservado.
const COLORS = ["rgb(var(--accent-purple))", "rgb(var(--brand-primary))", "rgb(var(--accent-pink))"];

export function RosaryIllustration({ className, hue = 0 }: { className?: string; hue?: number }) {
  const beads = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2 + Math.PI / 2;
    // Arredonda para 2 casas decimais para evitar hydration mismatch por precisão flutuante
    return { 
      x: Number((100 + Math.cos(a) * 62).toFixed(2)), 
      y: Number((86 + Math.sin(a) * 62).toFixed(2)), 
      big: i % 10 === 0 
    };
  });
  const tail = [0, 1, 2, 3].map((i) => ({ x: 100, y: 156 + i * 11 }));
  return (
    <svg viewBox="0 0 200 250" className={className} role="img" aria-label="Ilustração de um terço">
      <defs>
        <radialGradient id={`g${hue}`} cx="35%" cy="30%">
          <stop offset="0" stopColor="#fff" stopOpacity=".85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="86" r="62" fill="none" stroke="rgb(var(--border-default))" strokeWidth="1.5" />
      {beads.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r={b.big ? 7.5 : 5} fill={b.big ? "rgb(var(--accent-yellow))" : COLORS[(i + hue) % 3]} />
          <circle cx={b.x} cy={b.y} r={b.big ? 7.5 : 5} fill={`url(#g${hue})`} />
        </g>
      ))}
      {tail.map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r="4.5" fill={COLORS[(i + hue + 1) % 3]} />
          <circle cx={b.x} cy={b.y} r="4.5" fill={`url(#g${hue})`} />
        </g>
      ))}
      <rect x="95" y="200" width="10" height="42" rx="4" fill="rgb(var(--accent-yellow))" />
      <rect x="84" y="211" width="32" height="10" rx="4" fill="rgb(var(--accent-yellow))" />
    </svg>
  );
}
