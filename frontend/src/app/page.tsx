// src/app/page.tsx
import Hero from "@/src/components/home/Hero";
import Categories from "@/src/components/home/Categories";
import DiscoveryGrid from "../components/home/DiscoveryGrid";

export default function Home() {
  return (
    <main>
      <Hero />
      <Categories />
      <DiscoveryGrid />
    </main>
  );
}