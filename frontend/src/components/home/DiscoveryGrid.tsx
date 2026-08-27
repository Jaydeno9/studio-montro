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
    title: "Studio Picks",
    description: "A considered edit of pieces we return to again and again.",
    linkText: "Explore the edit",
    href: "/products",
    image: "/discovery/most-loved.webp",
  },
  {
    title: "Material Stories",
    description:
      "A study in texture, grain and the materials that shape a room.",
    linkText: "Explore materials",
    href: "/products?search=oak",
    image: "/discovery/material-stories.png",
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
        className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.06]"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-[#321c19]/40 via-[#321c19]/18 to-black/10" />

      <div className="absolute inset-0 flex flex-col p-5 text-white md:p-6 lg:p-7">
        <h3 className="tracking-[-0.02em]">
          <span className="text-3xl font-normal text-[#f5f1e8] md:text-4xl lg:text-[42px]">
            {title}
          </span>
        </h3>

        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/75">
          {description}
        </p>

        <span className="mt-auto inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/90">
          {linkText}
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
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
          <div className="grid gap-2 md:gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-3">
              <DiscoveryCard {...discoveryItems[0]} />
              <DiscoveryCard {...discoveryItems[1]} />
            </div>

            <DiscoveryCard {...discoveryItems[2]} large />
          </div>

          <div className="lg:relative">
            <div className="lg:sticky lg:top-24">
              <div className="max-w-xl">
                <p className="mb-5 text-[10px] uppercase tracking-[0.16em] text-black/45">
                  Discover
                </p>

                <h2 className="text-4xl leading-[1.08] tracking-[-0.035em] md:text-5xl lg:text-5xl">
                  Start with what speaks to you.
                </h2>

                <p className="mt-5 max-w-sm text-sm leading-7 text-black/55 md:text-base">
                  New pieces, studio favourites and material-led edits —
                  different ways into the MONTRO collection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
