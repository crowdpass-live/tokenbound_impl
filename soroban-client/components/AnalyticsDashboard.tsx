"use client";

import { getAnalyticsSnapshot } from "@/lib/analytics";

const EVENT_HEALTH = [
  { name: "Lagos Builders", revenue: 1240, conversion: 18.5 },
  { name: "Soroban Summit", revenue: 910, conversion: 14.2 },
  { name: "Campus Launch", revenue: 670, conversion: 11.1 },
];

const BAR_COLORS = ["#FF5722", "#F97316", "#FACC15", "#38BDF8"];

export default function AnalyticsDashboard() {
  const snapshot = getAnalyticsSnapshot();
  const totalPageViews = Object.values(snapshot.pageViews).reduce(
    (sum, views) => sum + views,
    0
  );

  const pageViewSeries =
    snapshot.pageViewSeries.length > 0
      ? snapshot.pageViewSeries
      : [
          { name: "home", views: 12 },
          { name: "events", views: 8 },
          { name: "analytics", views: 4 },
        ];

  const eventSeries =
    snapshot.eventSeries.length > 0
      ? snapshot.eventSeries
      : [
          { name: "Lagos Builders", sold: 14 },
          { name: "Soroban Summit", sold: 9 },
          { name: "Campus Launch", sold: 6 },
        ];

  const platformBreakdown = [
    { name: "Wallet Connects", value: snapshot.walletConnections },
    { name: "Tickets Sold", value: snapshot.ticketsPurchased },
    { name: "Tracked Pages", value: snapshot.pageViewSeries.length },
  ];

  const maxPageViews = Math.max(...pageViewSeries.map((item) => item.views), 1);
  const maxEventSales = Math.max(...eventSeries.map((item) => item.sold), 1);
  const totalPlatformActions = platformBreakdown.reduce(
    (sum, item) => sum + item.value,
    0
  );

  return (
    <section className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Platform Page Views"
          value={totalPageViews}
          detail="Tracked across landing, events, create-event, and analytics routes"
        />
        <MetricCard
          label="Wallet Connections"
          value={snapshot.walletConnections}
          detail="Captured whenever a user authorizes Freighter"
        />
        <MetricCard
          label="Tickets Purchased"
          value={snapshot.ticketsPurchased}
          detail="Includes batch purchases from the events flow"
        />
        <MetricCard
          label="Revenue"
          value={`${snapshot.revenueXlm.toFixed(2)} XLM`}
          detail={`Organizer conversion rate: ${snapshot.organizerConversionRate}%`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-orange-200/70">
                Usage Trends
              </p>
              <h2 className="text-2xl font-semibold text-white">Page traffic</h2>
            </div>
            <p className="text-sm text-zinc-400">Local analytics snapshot</p>
          </div>

          <div className="space-y-4">
            {pageViewSeries.map((item, index) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-zinc-300">
                  <span>{item.name}</span>
                  <span>{item.views} views</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.views / maxPageViews) * 100}%`,
                      backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4">
            <p className="text-sm uppercase tracking-[0.3em] text-orange-200/70">
              Platform Mix
            </p>
            <h2 className="text-2xl font-semibold text-white">What users do most</h2>
          </div>

          <div className="space-y-4">
            {platformBreakdown.map((item, index) => {
              const width =
                totalPlatformActions === 0
                  ? 0
                  : (item.value / totalPlatformActions) * 100;

              return (
                <div key={item.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between text-sm text-zinc-300">
                    <span className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }}
                      />
                      {item.name}
                    </span>
                    <span>{item.value}</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${width}%`,
                        backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.3em] text-orange-200/70">
              Organizer Dashboard
            </p>
            <h2 className="text-2xl font-semibold text-white">Event performance</h2>
          </div>

          <div className="space-y-4">
            {EVENT_HEALTH.map((event) => (
              <div
                key={event.name}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">{event.name}</h3>
                  <span className="rounded-full bg-orange-500/15 px-3 py-1 text-sm text-orange-200">
                    {event.conversion}% conversion
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-zinc-300">
                  <span>Revenue</span>
                  <span>{event.revenue} XLM</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300"
                    style={{ width: `${Math.min(event.conversion * 4, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4">
            <p className="text-sm uppercase tracking-[0.3em] text-orange-200/70">
              Tickets by Event
            </p>
            <h2 className="text-2xl font-semibold text-white">Sales distribution</h2>
          </div>

          <div className="space-y-4">
            {eventSeries.map((item, index) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-zinc-300">
                  <span>{item.name}</span>
                  <span>{item.sold} sold</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.sold / maxEventSales) * 100}%`,
                      backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm uppercase tracking-[0.3em] text-orange-200/70">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{detail}</p>
    </article>
  );
}
