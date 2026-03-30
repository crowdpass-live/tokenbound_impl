import AnalyticsPageView from "@/components/AnalyticsPageView";
import Header from "@/components/Header";
import MarketplaceCatalog from "@/components/Marketplace/MarketplaceCatalog";

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-[#18181B] text-white">
      <AnalyticsPageView page="marketplace" />
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-20 pt-36 sm:px-6">
        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8">
          <p className="text-sm uppercase tracking-[0.4em] text-sky-200/80">Marketplace</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Buy and sell tickets peer-to-peer
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            List your unused tickets for resale or discover great deals from other fans.
            All transfers are secured by smart contracts with built-in price caps to prevent scalping.
          </p>
        </section>

        <MarketplaceCatalog />
      </main>
    </div>
  );
}