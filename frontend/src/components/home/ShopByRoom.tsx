import Image from "next/image";
import Link from "next/link";

const rooms = [
  {
    title: "The Kids' Room",
    href: "/products?room=kids-room",
    image: "/rooms/kid-room.png",
    alt: "Bright, warm kids room",
    titleClass: "text-[#f4efe7]",
    overlayClass: "bg-gradient-to-b from-black/0 via-black/0 to-[#3a211f]/55",
  },
  {
    title: "The Green Space",
    href: "/products?room=outdoor",
    image: "/rooms/green-space.png",
    alt: "Green outdoor terrace with lounge furniture",
    titleClass: "text-[#f4efe7]",
    overlayClass: "bg-gradient-to-b from-black/0 via-black/0 to-[#26372c]/60",
  },
  {
    title: "The Living Room",
    href: "/products?room=living-room",
    image: "/rooms/living-room.png",
    alt: "Bright white and cream living room",
    titleClass: "text-[#4b1f26]",
    overlayClass:
      "bg-gradient-to-b from-transparent via-transparent to-[#f4f0e9]/35",
  },
  {
    title: "The Kitchen",
    href: "/products?room=kitchen",
    image: "/rooms/kitchen.png",
    alt: "Earthy kitchen detail with ceramic tableware",
    titleClass: "text-[#f4efe7]",
    overlayClass: "bg-gradient-to-b from-black/0 via-black/0 to-[#39251f]/62",
  },
];

export default function ShopByRoom() {
  return (
    <section className="bg-[#f4f0e9] py-10 md:py-14 lg:py-16">
      <div className="px-4 md:px-6 lg:px-8">
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="flex min-w-max gap-3 md:gap-4 lg:grid lg:min-w-0 lg:grid-cols-4">
            {rooms.map((room) => (
              <Link
                key={room.title}
                href={room.href}
                className="group relative block w-[78vw] max-w-[390px] shrink-0 overflow-hidden sm:w-[52vw] md:w-[38vw] lg:w-auto lg:max-w-none"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#d8d0c6]">
                  <Image
                    src={room.image}
                    alt={room.alt}
                    fill
                    sizes="(max-width: 640px) 78vw, (max-width: 1024px) 38vw, 25vw"
                    className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.035]"
                  />

                  <div className={`absolute inset-0 ${room.overlayClass}`} />

                  <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 lg:p-7">
                    <div className="flex items-end justify-between gap-5">
                      <h3 className="max-w-[92%] font-serif text-[34px] font-normal leading-[0.96] tracking-[-0.035em] sm:text-[38px] md:text-[40px] lg:text-[42px]">
                        <span className={room.titleClass}>{room.title}</span>
                      </h3>

                      <span
                        aria-hidden="true"
                        className={`mb-1 shrink-0 text-xl font-light opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100 ${room.titleClass}`}
                      >
                        →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
