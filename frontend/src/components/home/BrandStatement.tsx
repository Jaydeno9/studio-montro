import Image from "next/image";
import Link from "next/link";

type BrandStatementProps = {
  eyebrow?: string;
  title?: string;
  body?: string;
  imageSrc?: string;
  imageAlt?: string;
  linkHref?: string;
  linkLabel?: string;
  className?: string;
};

export default function BrandStatement({
  eyebrow = "Our Point of View",
  title = "Quiet forms. Honest materials. Spaces made to be lived in.",
  body = "We are drawn to pieces that feel considered without feeling precious — natural materials, balanced proportions and objects that become part of everyday life.",
  imageSrc = "/design-style.png",
  imageAlt = "Studio MONTRO interior detail",
  linkHref = "/products",
  linkLabel = "Discover the collection",
  className = "",
}: BrandStatementProps) {
  return (
    <section
      className={`bg-[#f4f0e9] px-4 py-14 md:px-6 md:py-20 lg:px-8 lg:py-20 ${className}`}
    >
      <div className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12">
        {/* LEFT — must stretch to the full height of the grid row */}
        <div className="relative self-stretch">
          <div className="py-4 lg:sticky lg:top-28 lg:max-w-xl lg:py-0">
            <p className="text-[10px] uppercase tracking-[0.17em] text-[#837970]">
              {eyebrow}
            </p>

            <h2 className="mt-5 text-4xl font-normal leading-[1.04] tracking-[-0.04em] md:text-5xl lg:text-[56px]">
              <span className="text-[#4b1f26]">{title}</span>
            </h2>

            <p className="mt-6 max-w-lg text-sm leading-7 text-[#756d65] md:text-[15px]">
              {body}
            </p>

            <Link
              href={linkHref}
              className="group mt-8 inline-flex items-center gap-3 text-sm text-[#4b1f26]"
            >
              <span className="border-b border-[#4b1f26]/35 pb-1 transition group-hover:border-[#4b1f26]">
                {linkLabel}
              </span>

              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>

        {/* RIGHT — creates the height that gives sticky room to move */}
        <div className="relative min-h-[420px] overflow-hidden md:min-h-[580px] lg:min-h-[900px]">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover transition-transform duration-[1200ms] ease-out hover:scale-[1.025]"
          />
        </div>
      </div>
    </section>
  );
}
