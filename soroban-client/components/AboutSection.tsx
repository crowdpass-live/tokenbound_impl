import Image from "next/image";
import { useTranslations } from "next-intl";

export default function AboutSection() {
  const t = useTranslations("about");

  return (
    <section className="w-full py-24 bg-[#18181B] flex items-center justify-center">
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

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[600px] bg-[#525252] rounded-[2rem] p-10 md:p-14 shadow-2xl z-10 flex flex-col justify-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 text-left">
            {t("title")}
          </h2>
          <div className="space-y-6 text-gray-100 text-[15px] md:text-base leading-relaxed mb-10 text-left">
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
