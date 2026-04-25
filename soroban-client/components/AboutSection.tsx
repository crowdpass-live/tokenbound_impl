import Image from "next/image";
import { useTranslations } from "next-intl";

export default function AboutSection() {
  const t = useTranslations("about");

  return (
    <section className="flex w-full items-center justify-center bg-background py-24">
      <div className="relative w-full max-w-[1300px] h-[800px] mx-6">
        <div className="absolute inset-0 w-full h-full rounded-[3rem] overflow-hidden grid grid-cols-2 grid-rows-2">
          <div className="relative w-full h-full">
            <Image src="/about-team.png" alt="Team" fill className="object-cover" />
          </div>
          <div className="relative w-full h-full">
            <Image src="/about-speaker.png" alt="Speaker" fill className="object-cover" />
          </div>
          <div className="relative w-full h-full">
            <Image src="/about-concert.png" alt="Concert" fill className="object-cover" />
          </div>
          <div className="relative w-full h-full">
            <Image src="/about-dinner.png" alt="Dinner" fill className="object-cover" />
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 z-10 flex w-[90%] max-w-[600px] -translate-x-1/2 -translate-y-1/2 flex-col justify-center rounded-[2rem] border border-zinc-200/80 bg-white/92 p-10 shadow-2xl shadow-zinc-900/10 md:p-14 dark:border-white/10 dark:bg-[#525252] dark:shadow-black/20">
          <h2 className="mb-8 text-left text-4xl font-bold text-zinc-950 dark:text-white md:text-5xl">
            {t("title")}
          </h2>
          <div className="mb-10 space-y-6 text-left text-[15px] leading-relaxed text-zinc-600 dark:text-gray-100 md:text-base">
            <p>{t("p1")}</p>
            <p>{t("p2")}</p>
            <p>{t("p3")}</p>
          </div>
          <button className="w-full bg-[#FF5722] hover:bg-[#F4511E] text-white text-lg font-bold py-4 rounded-xl shadow-lg transition transform hover:-translate-y-1">
            {t("cta")}
          </button>
        </div>
      </div>
    </section>
  );
}
