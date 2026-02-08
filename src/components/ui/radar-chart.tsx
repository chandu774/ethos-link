interface RadarChartProps {
  traits: {
    name: string;
    value: number;
  }[];
}

export function RadarChart({ traits }: RadarChartProps) {
  const size = 200;
  const center = size / 2;
  const maxRadius = (size / 2) - 30;
  const levels = 5;

  const angleStep = (2 * Math.PI) / traits.length;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const radius = (value / 100) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const getLevelPoints = (level: number) => {
    const radius = (level / levels) * maxRadius;
    return traits.map((_, i) => {
      const angle = startAngle + i * angleStep;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      };
    });
  };

  const dataPoints = traits.map((trait, i) => getPoint(i, trait.value));
  const pathData = dataPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
    .join(" ") + " Z";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background levels */}
        {Array.from({ length: levels }).map((_, level) => {
          const points = getLevelPoints(level + 1);
          const levelPath = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
            .join(" ") + " Z";
          return (
            <path
              key={level}
              d={levelPath}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}

        {/* Axis lines */}
        {traits.map((_, i) => {
          const endpoint = getPoint(i, 100);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={endpoint.x}
              y2={endpoint.y}
              stroke="hsl(var(--border))"
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}

        {/* Data polygon */}
        <path
          d={pathData}
          fill="hsl(var(--primary) / 0.2)"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />

        {/* Data points */}
        {dataPoints.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={4}
            fill="hsl(var(--primary))"
          />
        ))}

        {/* Labels */}
        {traits.map((trait, i) => {
          const labelPoint = getPoint(i, 120);
          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-xs font-medium"
            >
              {trait.name}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
