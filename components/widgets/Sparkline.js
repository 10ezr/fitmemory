import { useMemo } from "react";

/**
 * Lightweight sparkline component (no heavy chart libs)
 */
export default function Sparkline({ data = [], color = "#7c3aed", width = 120, height = 36 }) {
  const points = useMemo(() => {
    if (!data.length) return "";
    const w = width, h = height;
    const max = Math.max(1, ...data);
    const step = w / Math.max(1, data.length - 1);
    return data.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(" ");
  }, [data, width, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-90">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}