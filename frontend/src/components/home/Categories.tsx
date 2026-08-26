// src/components/home/Categories.tsx

import Image from "next/image";
import Link from "next/link";

const categories = [
  {
    name: "Furniture",
    image: "/categories/furniture.png",
    href: "/products?category=furniture",
  },
  {
    name: "Tables",
    image: "/categories/tables.png",
    href: "/products?category=tables",
  },
  {
    name: "Seating",
    image: "/categories/seating.png",
    href: "/products?category=seating",
  },
  {
    name: "Lighting",
    image: "/categories/lighting.png",
    href: "/products?category=lighting",
  },
  {
    name: "Decor",
    image: "/categories/decor.png",
    href: "/products?category=decor",
  },
  {
    name: "Objects",
    image: "/categories/objects.png",
    href: "/products?category=objects",
  },
];

export default function Categories() {
  return (
    <section className="my-[30px] bg-[#F5F1E8] py-[20px]">
      <div className="container">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl tracking-tight md:text-5xl">
            Shop by category
          </h2>
        </div>

        <div className="hide-scrollbar flex gap-6 overflow-x-auto md:gap-">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="group w-[45vw] shrink-0 sm:w-[30vw] md:w-[20vw] lg:w-[16%]"
            >
              <div className="relative aspect-[7/6] overflow-hidden ">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 68vw, (max-width: 768px) 42vw, (max-width: 1024px) 29vw, 23vw"
                  className="object-contain transition-transform duration-500 group-hover:scale-[1.30]"
                />
              </div>

              <p className="mt-3 text-center text-base font-medium tracking-wide md:text-lg">
                {category.name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
