import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/** Colores leídos de los tokens (ver styles/tokens.css). */
export const CHART = {
  s1: 'var(--color-chart-1)',
  s2: 'var(--color-chart-2)',
  grid: 'var(--color-chart-grid)',
  axis: '#6b7280',
  success: 'var(--color-success)',
  warning: '#d97706',
  danger: 'var(--color-danger)',
  info: 'var(--color-petrol)',
};

const axisProps = { tick: { fill: CHART.axis, fontSize: 12 }, tickLine: false, axisLine: false } as const;

function TooltipBox({ active, payload, label, suffix = '' }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string; suffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-pop)]">
      {label && <p className="mb-1 font-semibold first-letter:uppercase text-ink">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-graphite">
          <span className="size-2.5 rounded-sm" style={{ background: p.color }} aria-hidden />
          {p.name}: <span className="font-semibold tabular-nums text-ink">{p.value ?? '—'}{p.value != null ? suffix : ''}</span>
        </p>
      ))}
    </div>
  );
}

function LegendText(value: string) {
  return <span className="text-xs font-medium text-graphite">{value}</span>;
}

/** Barras agrupadas: dos series con el mismo eje (conteos). */
export function GroupedBars({
  data,
  xKey,
  series,
  height = 260,
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Array<{ key: string; name: string; color: string }>;
  height?: number;
}) {
  return (
    <div style={{ height }} role="img" aria-label={`Gráfico de barras: ${series.map((s) => s.name).join(' y ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey={xKey} {...axisProps} tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgb(17 17 17 / 0.04)' }} />
          <Legend iconType="circle" iconSize={8} formatter={LegendText} wrapperStyle={{ paddingTop: 8 }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={22} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Línea de una sola serie (p. ej. % de cumplimiento). */
export function TrendLine({
  data,
  xKey,
  yKey,
  name,
  height = 220,
  suffix = '%',
  domain = [0, 100],
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  name: string;
  height?: number;
  suffix?: string;
  domain?: [number, number];
}) {
  return (
    <div style={{ height }} role="img" aria-label={`Gráfico de línea: ${name}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey={xKey} {...axisProps} tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)} />
          <YAxis domain={domain} {...axisProps} tickFormatter={(v: number) => `${v}${suffix}`} />
          <Tooltip content={<TooltipBox suffix={suffix} />} cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }} />
          <Line
            type="monotone"
            dataKey={yKey}
            name={name}
            stroke={CHART.s1}
            strokeWidth={2}
            dot={{ r: 4, fill: CHART.s1, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras horizontales con etiqueta y color por categoría (estados o ranking). */
export function HorizontalBars({
  data,
  height,
  color = CHART.s1,
  colors,
}: {
  data: Array<{ name: string; value: number; full?: string }>;
  height?: number;
  color?: string;
  colors?: string[];
}) {
  const h = height ?? Math.max(120, data.length * 40);
  return (
    <div style={{ height: h }} role="img" aria-label={`Gráfico de barras horizontales: ${data.map((d) => `${d.name} ${d.value}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }} barCategoryGap="24%">
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={92} {...axisProps} />
          <Tooltip
            cursor={{ fill: 'rgb(17 17 17 / 0.04)' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="max-w-60 rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-pop)]">
                  <p className="font-semibold text-ink">{(payload[0].payload as { full?: string; name: string }).full || (payload[0].payload as { name: string }).name}</p>
                  <p className="text-graphite">
                    Total: <span className="font-semibold text-ink">{payload[0].value as number}</span>
                  </p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} label={{ position: 'right', fill: '#374151', fontSize: 12, fontWeight: 600 }}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={colors?.[i] ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
