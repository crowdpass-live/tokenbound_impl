import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import AnalyticsPageView from "@/components/AnalyticsPageView";
import ContractEventFeed from "@/components/ContractEventFeed";
import Header from "@/components/Header";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnalyticsPageView page="analytics" />
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-20 pt-36 sm:px-6">
        <section className="rounded-[32px] border border-zinc-200 bg-white/90 p-8 shadow-lg shadow-zinc-900/5 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,87,34,0.18),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] dark:shadow-none">
          <p className="text-sm uppercase tracking-[0.4em] text-orange-700 dark:text-orange-200/70">
            Analytics
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-zinc-950 dark:text-white sm:text-5xl">
            Organizer and platform insights in one dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Track page views, wallet connections, batch ticket purchases, conversion
            trends, and revenue signals without leaving the CrowdPass interface.
          </p>
        </section>

        <AnalyticsDashboard />
        <ContractEventFeed />
      </main>
    </div>
  );
}
