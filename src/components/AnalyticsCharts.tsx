import {
  ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, BarChart as ReBarChart,
} from 'recharts';
import { formatINR } from '@/lib/currency';

export interface RevenuePoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface UserPoint {
  label: string;
  users: number;
}

const AXIS_TICK = { fontSize: 11, fill: '#94a3b8' };
const AXIS_LINE = { stroke: '#e2e8f0' };
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
};

// Compact ₹ axis ticks (₹1.2k / ₹3.4L) so the Y axis stays readable.
function compactINR(v: number): string {
  if (v >= 100000) return `\u20B9${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `\u20B9${(v / 1000).toFixed(1)}k`;
  return `\u20B9${v}`;
}

// Combined realised revenue (gradient area, \u20B9 axis) and order count (bars,
// right axis) with a shared hover tooltip. Responsive to its container.
export function RevenueOrdersChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} interval="preserveStartEnd" minTickGap={16} />
        <YAxis yAxisId="rev" tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={compactINR} />
        <YAxis yAxisId="ord" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: '#f0fdfa' }}
          formatter={(value, name) =>
            [name === 'Revenue' ? formatINR(Number(value)) : String(value ?? 0), name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="ord" dataKey="orders" name="Orders" fill="#c7d2fe" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="#0d9488" strokeWidth={2} fill="url(#revFill)" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// New-customer registrations per period.
export function NewCustomersChart({ data }: { data: UserPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ReBarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={AXIS_LINE} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#f5f3ff' }} />
        <Bar dataKey="users" name="New customers" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}
