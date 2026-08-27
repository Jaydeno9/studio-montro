// src/app/page.tsx
import Hero from "@/src/components/home/Hero";
import Categories from "@/src/components/home/Categories";
import DiscoveryGrid from "../components/home/DiscoveryGrid";
import ShopByRoom from "@/src/components/home/ShopByRoom";
import ProductListingSection from "@/src/components/product/ProductListingSection";
import EditorialCTA from "@/src/components/common/EditorialCTA";
import BrandStatement from "@/src/components/home/BrandStatement";

export default function Home() {
  return (
    <main>
      <Hero />
      <Categories />
      <DiscoveryGrid />
      <ProductListingSection />
      <BrandStatement />
      <ShopByRoom />
      <EditorialCTA />
    </main>
  );
}
