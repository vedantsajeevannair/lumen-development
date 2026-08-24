import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";

const GRID = "#eef1f6";
const AXIS = { fontSize: 11, fill: "#94a3b8", fontWeight: 500 };
const BRAND = "#3f4ce7";

/* One tooltip treatment for every chart — soft card, no harsh border. */
const TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #e8ecf3",
    boxShadow: "0 14px 36px -10px rgb(15 23 42 / 0.18)",
    fontSize: 12,
    padding: "8px 12px",
  },
  labelStyle: { fontWeight: 600, color: "#0f172a", marginBottom: 2 },
  cursor: { fill: "rgb(63 76 231 / 0.05)" },
} as const;

const LEGEND = {
  iconType: "circle" as const,
  iconSize: 8,
  wrapperStyle: { fontSize: 12, color: "#64748b", paddingTop: 8 },
};

export function TrendAreaChart({ data, color = BRAND, name = "Complaints" }: {
  data: { label: string; value: number }[];
  color?: string;
  name?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} dy={4} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...TOOLTIP} />
        <Area
          type="monotone" dataKey="value" name={name}
          stroke={color} strokeWidth={2.5} fill="url(#trendFill)"
          activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({ data, color = BRAND, name = "Count", horizontal = false }: {
  data: { label: string; value: number }[];
  color?: string;
  name?: string;
  horizontal?: boolean;
}) {
  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 46)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 32, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={GRID} horizontal={false} />
          <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={112} />
          <Tooltip {...TOOLTIP} />
          <Bar dataKey="value" name={name} fill={color} radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} dy={4} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...TOOLTIP} />
        <Bar dataKey="value" name={name} fill={color} radius={[6, 6, 0, 0]} barSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data} dataKey="value" nameKey="name"
            innerRadius={64} outerRadius={94} paddingAngle={3} stroke="#fff" strokeWidth={2}
          >
            {data.map((d) => <Cell key={d.name} fill={d.color} />)}
          </Pie>
          <Tooltip {...TOOLTIP} />
          <Legend {...LEGEND} />
        </PieChart>
      </ResponsiveContainer>
      {/* Total sits in the hole of the donut rather than in a separate label */}
      <div className="pointer-events-none absolute inset-x-0 top-[104px] text-center">
        <div className="tnum text-2xl font-bold leading-none text-slate-900">{total}</div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Total</div>
      </div>
    </div>
  );
}

export function MultiLineChart({ data, series }: {
  data: Record<string, string | number>[];
  series: { key: string; color: string; name: string; dashed?: boolean }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} dy={4} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...TOOLTIP} />
        <Legend {...LEGEND} />
        {series.map((s) => (
          <Line
            key={s.key} type="monotone" dataKey={s.key} name={s.name}
            stroke={s.color} strokeWidth={2.5}
            strokeDasharray={s.dashed ? "6 4" : undefined}
            dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
