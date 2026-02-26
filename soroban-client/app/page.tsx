import Header from "../components/Header";
import Hero from "../components/Hero";
import AboutSection from "../components/AboutSection";
import FeaturesSection from "../components/FeaturesSection";
import HowItWorksSection from "../components/HowItWorksSection";
import PartnersSection from "../components/PartnersSection";

export default function Home() {
  return (
    <div className="bg-[#18181B] min-h-screen text-white font-sans selection:bg-[#FF5722] selection:text-white flex flex-col">
      <Header />
      <main className="grow flex flex-col">
        <Hero />
        <AboutSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PartnersSection />
      </main>
    </div>
  );
}
