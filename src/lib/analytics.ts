import type { Order, Profile } from '@/types';

export type Granularity = 'day' | 'week' | 'month' | 'year';

export interface SeriesPoint {
  key: string;
  label: string;
  users: number;
  orders: number;
  revenue: number;
}

export interface ComparisonMetric {
  granularity: Granularity;
  label: string;
  currentLabel: string;
  previousLabel: string;
  currentRevenue: number;
  previousRevenue: number;
  currentOrders: number;
  previousOrders: number;
  currentUsers: number;
  previousUsers: number;
  revenueChangePercent: number | null;
  ordersChangePercent: number | null;
  usersChangePercent: number | null;
}

// Cancelled orders are excluded from revenue/sales analytics since they are
// not realised sales.
const isSale = (o: Order) => o.status !== 'cancelled';

function startOf(date: Date, g: Granularity): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (g === 'week') {
    const dow = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - dow);
  } else if (g === 'month') {
    d.setDate(1);
  } else if (g === 'year') {
    d.setMonth(0, 1);
  }
  return d;
}

function addPeriods(date: Date, g: Granularity, n: number): Date {
  const d = new Date(date);
  if (g === 'day') d.setDate(d.getDate() + n);
  else if (g === 'week') d.setDate(d.getDate() + n * 7);
  else if (g === 'month') d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  return d;
}

function keyOf(date: Date, g: Granularity): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  if (g === 'year') return `${y}`;
  if (g === 'month') return `${y}-${m}`;
  return `${y}-${m}-${day}`; // day and week keyed by bucket start date
}

function labelOf(date: Date, g: Granularity): string {
  if (g === 'year') return String(date.getFullYear());
  if (g === 'month') return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  if (g === 'week') return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Parse a created_at value that may be an ISO string (written by the app), a
// Firestore Timestamp (common when a profile/order is added in the console), a
// JS Date, or an epoch number. Returns null when it can't be understood.
function parse(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  // Firestore Timestamp: has a toDate() method, or a {seconds} field.
  if (typeof value === 'object') {
    const ts = value as { toDate?: () => Date; seconds?: number };
    if (typeof ts.toDate === 'function') {
      const d = ts.toDate();
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
    return null;
  }
  if (typeof value === 'number') return new Date(value < 1e12 ? value * 1000 : value);
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Builds a contiguous time series of the last `periods` buckets ending with the
// current bucket, aggregating new users, order count, and realised revenue.
export function buildSeries(
  orders: Order[],
  users: Profile[],
  g: Granularity,
  periods: number,
  now: Date = new Date(),
): SeriesPoint[] {
  const current = startOf(now, g);
  const points: SeriesPoint[] = [];
  const index = new Map<string, SeriesPoint>();

  for (let i = periods - 1; i >= 0; i--) {
    const start = addPeriods(current, g, -i);
    const key = keyOf(start, g);
    const point: SeriesPoint = { key, label: labelOf(start, g), users: 0, orders: 0, revenue: 0 };
    points.push(point);
    index.set(key, point);
  }

  for (const u of users) {
    if (u.role && u.role !== 'customer') continue;
    const d = parse(u.created_at);
    if (!d) continue;
    const point = index.get(keyOf(startOf(d, g), g));
    if (point) point.users += 1;
  }

  for (const o of orders) {
    const d = parse(o.created_at);
    if (!d) continue;
    const point = index.get(keyOf(startOf(d, g), g));
    if (!point) continue;
    point.orders += 1;
    if (isSale(o)) point.revenue += Number(o.total) || 0;
  }

  return points;
}

export interface RangeSummary {
  orderCount: number;
  revenue: number;
  userCount: number;
  avgOrderValue: number;
}

// Aggregates realised revenue, order count, new customers and average order
// value for an inclusive [from, to] calendar range (both YYYY-MM-DD dates).
export function summarizeRange(
  orders: Order[],
  users: Profile[],
  from: Date,
  to: Date,
): RangeSummary {
  const { orderCount, revenue, userCount } = aggregate(orders, users, from, to);
  return {
    orderCount,
    revenue,
    userCount,
    avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
  };
}

// Chooses a sensible bucket size so a custom range renders a readable number of
// points: days for short ranges, weeks for a few months, months beyond that.
export function pickGranularity(from: Date, to: Date): Granularity {
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
  if (days <= 62) return 'day';
  if (days <= 366) return 'week';
  if (days <= 366 * 3) return 'month';
  return 'year';
}

// Builds a contiguous series covering [from, to] (exclusive end) at the given
// granularity, aggregating new users, order count and realised revenue.
export function buildRangeSeries(
  orders: Order[],
  users: Profile[],
  from: Date,
  to: Date,
  g: Granularity,
): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  const index = new Map<string, SeriesPoint>();

  let cursor = startOf(from, g);
  for (let guard = 0; cursor < to && guard < 1000; guard++) {
    const key = keyOf(cursor, g);
    const point: SeriesPoint = { key, label: labelOf(cursor, g), users: 0, orders: 0, revenue: 0 };
    points.push(point);
    index.set(key, point);
    cursor = addPeriods(cursor, g, 1);
  }

  for (const u of users) {
    if (u.role && u.role !== 'customer') continue;
    const d = parse(u.created_at);
    if (!d || d < from || d >= to) continue;
    const point = index.get(keyOf(startOf(d, g), g));
    if (point) point.users += 1;
  }

  for (const o of orders) {
    const d = parse(o.created_at);
    if (!d || d < from || d >= to) continue;
    const point = index.get(keyOf(startOf(d, g), g));
    if (!point) continue;
    point.orders += 1;
    if (isSale(o)) point.revenue += Number(o.total) || 0;
  }

  return points;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function aggregate(orders: Order[], users: Profile[], from: Date, to: Date) {
  let orderCount = 0;
  let revenue = 0;
  let userCount = 0;
  for (const o of orders) {
    const d = parse(o.created_at);
    if (!d || d < from || d >= to) continue;
    orderCount += 1;
    if (isSale(o)) revenue += Number(o.total) || 0;
  }
  for (const u of users) {
    if (u.role && u.role !== 'customer') continue;
    const d = parse(u.created_at);
    if (!d || d < from || d >= to) continue;
    userCount += 1;
  }
  return { orderCount, revenue, userCount };
}

const COMPARISON_LABELS: Record<Granularity, { label: string; current: string; previous: string }> = {
  day: { label: 'Today vs Yesterday', current: 'Today', previous: 'Yesterday' },
  week: { label: 'This Week vs Last Week', current: 'This week', previous: 'Last week' },
  month: { label: 'This Month vs Last Month', current: 'This month', previous: 'Last month' },
  year: { label: 'This Year vs Last Year', current: 'This year', previous: 'Last year' },
};

// Compares the current period against the immediately preceding one for the
// given granularity (day/week/month/year).
export function comparePeriod(
  orders: Order[],
  users: Profile[],
  g: Granularity,
  now: Date = new Date(),
): ComparisonMetric {
  const curStart = startOf(now, g);
  const curEnd = addPeriods(curStart, g, 1);
  const prevStart = addPeriods(curStart, g, -1);
  const cur = aggregate(orders, users, curStart, curEnd);
  const prev = aggregate(orders, users, prevStart, curStart);
  const labels = COMPARISON_LABELS[g];
  return {
    granularity: g,
    label: labels.label,
    currentLabel: labels.current,
    previousLabel: labels.previous,
    currentRevenue: cur.revenue,
    previousRevenue: prev.revenue,
    currentOrders: cur.orderCount,
    previousOrders: prev.orderCount,
    currentUsers: cur.userCount,
    previousUsers: prev.userCount,
    revenueChangePercent: pctChange(cur.revenue, prev.revenue),
    ordersChangePercent: pctChange(cur.orderCount, prev.orderCount),
    usersChangePercent: pctChange(cur.userCount, prev.userCount),
  };
}
