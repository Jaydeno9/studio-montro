import Image from "next/image";
import Link from "next/link";

const discoveryItems = [
  {
    title: "New Arrivals",
    description: "The latest pieces to enter the studio.",
    linkText: "See what's new",
    href: "/products?sort=newest",
    image: "/discovery/new-arrivals.webp",
  },
  {
    title: "Most Loved",
    description: "Pieces people keep coming back to.",
    linkText: "See the favourites",
    href: "/products?sort=popular",
    image: "/discovery/most-loved.webp",
  },
  {
    title: "Curated Collections",
    description: "Objects brought together by mood, material and form.",
    linkText: "Explore the collection",
    href: "/collections",
    image: "/discovery/curated-collections.webp",
  },
];

function DiscoveryCard({
  title,
  description,
  linkText,
  href,
  image,
  large = false,
}: {
  title: string;
  description: string;
  linkText: string;
  href: string;
  image: string;
  large?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden ${
        large ? "aspect-[2/1]" : "aspect-[4/3]"
      }`}
    >
      <Image
        src={image}
        alt={title}
        fill
        sizes={
          large
            ? "(max-width: 1024px) 100vw, 60vw"
            : "(max-width: 1024px) 50vw, 30vw"
        }
        className="object-cover transition-transform duration-1200 ease-out group-hover:scale-[1.13]"
      />

      {/* Top dark to bottom transparent gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3f1704]/35 via-[#3f1704]/30 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col p-5 text-white md:p-6 lg:p-7">
        <h3 className="tracking-[-0.02em]">
          <span className="text-3xl font-normal text-[#f5f1e8] md:text-4xl lg:text-[42px]">
            {title}
          </span>
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">
          {description}
        </p>
        <span className="mt-auto inline-block text-xs uppercase tracking-[0.14em] text-white/90">
          {linkText} →
        </span>
      </div>
    </Link>
  );
}

export default function DiscoveryGrid() {
  return (
    <section className="my-[30px] py-[20px]">
      <div className="container">
        <div className="grid gap-10 lg:grid-cols-[5fr_3fr] lg:gap-12">
          {/* Left — Discovery cards */}
          <div className="grid gap-2 md:gap-3">
            {/* Top row */}
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <DiscoveryCard {...discoveryItems[0]} />
              <DiscoveryCard {...discoveryItems[1]} />
            </div>

            {/* Bottom — Curated Collections */}
            <DiscoveryCard {...discoveryItems[2]} large />
          </div>

          {/* Right — Editorial statement */}
          <div className="lg:relative">
            <div className="lg:sticky lg:top-24">
              <div className="max-w-xl">
                <h2 className="text-5xl leading-[1.1] tracking-tight md:text-4xl lg:text-5xl">
                  Start with what speaks to you.
                </h2>

                <p className="mt-5 max-w-sm text-sm leading-relaxed text-black/60 md:text-base">
                  Explore pieces by mood, material and form — and find something
                  that feels right at home.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
