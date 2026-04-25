import Header from "../components/Header";
import Hero from "../components/Hero";
import AboutSection from "../components/AboutSection";
import FeaturesSection from "../components/FeaturesSection";
import HowItWorksSection from "../components/HowItWorksSection";
import PartnersSection from "../components/PartnersSection";
import AnalyticsPageView from "../components/AnalyticsPageView";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground selection:bg-[#FF5722] selection:text-white">
      <AnalyticsPageView page="home" />
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
