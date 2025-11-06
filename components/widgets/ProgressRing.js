/**
 * Tiny progress ring component (SVG only)
 */
export default function ProgressRing({ 
  progress = 0, 
  size = 92, 
  strokeWidth = 8, 
  color = "#7c3aed",
  className = ""
}) {
  const r = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * r;
  const offset = C - (progress / 100) * C;
  
  return (
    <div className={`relative ${className}`}>
      <svg 
        width={size} 
        height={size} 
        className="-rotate-90 drop-shadow-[0_0_8px_rgba(124,58,237,.2)]"
      >
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={r} 
          stroke="currentColor" 
          strokeWidth={strokeWidth} 
          fill="none" 
          className="text-muted opacity-25" 
        />
        <circle 
          cx={size/2} 
          cy={size/2} 
          r={r} 
          stroke={color} 
          strokeWidth={strokeWidth} 
          fill="none" 
          strokeDasharray={C} 
          strokeDashoffset={offset} 
          strokeLinecap="round" 
          className="transition-all duration-1000" 
        />
      </svg>
    </div>
  );
}