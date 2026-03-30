import AnalyticsPageView from "@/components/AnalyticsPageView";
import EventCatalog from "@/components/EventCatalog";
import Header from "@/components/Header";

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-[#18181B] text-white">
      <AnalyticsPageView page="events" />
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-20 pt-36 sm:px-6">
        <section className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8">
          <p className="text-sm uppercase tracking-[0.4em] text-sky-200/80">Browse</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Discover events and buy tickets on-chain
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            Search and filter live listings from the EventManager contract, review dates
            and inventory, then confirm purchases with your wallet (Freighter by default).
            The same experience is available at{" "}
            <span className="text-zinc-200">/browse</span>.
          </p>
        </section>

        <EventCatalog />
      </main>
    </div>
  );
}
