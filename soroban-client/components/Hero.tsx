import Image from "next/image";
import { useTranslations } from "next-intl";

export default function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-background px-4 pb-20 pt-32">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-8 lg:grid-cols-2">
        {/* Text Content */}
        <div className="relative z-50 pl-4 lg:pl-12">
          <p className="text-[#FF5722] font-semibold tracking-wider mb-4 uppercase text-sm">
            {t("tagline")}
          </p>
          <h1 className="mb-8 text-5xl font-bold leading-[1.1] tracking-tight text-zinc-950 dark:text-white lg:text-[4.5rem]">
            {t("headline")}{" "}
            <span className="text-[#FF5722]">{t("brand")}</span>
          </h1>
          <button className="bg-[#FF5722] hover:bg-[#F4511E] text-white text-lg px-10 py-4 rounded-xl font-bold shadow-lg transition transform hover:-translate-y-1">
            {t("cta")}
          </button>
        </div>

        {/* Image Collage Area */}
        <div className="relative flex h-[600px] w-full origin-center scale-75 items-center justify-center md:scale-90 lg:origin-right lg:scale-100">
          <div className="relative w-[900px] h-[600px]">
            <div className="absolute left-0 top-[100px] z-20 h-[280px] w-[180px] overflow-hidden rounded-[1.5rem] border-[3px] border-zinc-950/10 shadow-2xl shadow-zinc-900/10 transition duration-500 hover:scale-105 dark:border-white/10 dark:shadow-black/30">
              <Image src="/hero-balloons.png" alt="Balloons" fill className="object-cover" />
            </div>
            <div className="absolute bottom-[60px] left-[40px] z-10 text-zinc-500 dark:text-white/80">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none">
                <path d="M10 90 L80 20 M80 20 L50 20 M80 20 L80 50" stroke="#FF5722" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="absolute left-[220px] top-[0px] z-10 h-[350px] w-[500px] overflow-hidden rounded-[2rem] border-[3px] border-zinc-950/10 shadow-2xl shadow-zinc-900/10 dark:border-white/10 dark:shadow-black/30">
              <Image src="/hero-concert.png" alt="Concert" fill className="object-cover" />
            </div>
            <div className="absolute left-[380px] top-[280px] z-30 h-[220px] w-[340px] overflow-hidden rounded-[1.5rem] border-[3px] border-zinc-950/10 shadow-2xl shadow-zinc-900/10 transition duration-500 hover:scale-105 dark:border-white/10 dark:shadow-black/30">
              <Image src="/hero-meeting.png" alt="Meeting" fill className="object-cover" />
            </div>
            <div className="absolute right-[20px] top-[120px] z-20 h-[360px] w-[180px] overflow-hidden rounded-[1.5rem] border-[3px] border-zinc-950/10 shadow-2xl shadow-zinc-900/10 transition duration-500 hover:scale-105 dark:border-white/10 dark:shadow-black/30">
              <Image src="/hero-toast.png" alt="Toast" fill className="object-cover" />
            </div>
            <div className="absolute right-[60px] top-[20px] z-10 text-zinc-500 dark:text-white/80">
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
                <line x1="20" y1="80" x2="20" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <line x1="90" y1="10" x2="40" y2="60" stroke="#FF5722" strokeWidth="4" strokeLinecap="round" />
                <line x1="50" y1="90" x2="90" y2="88" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
