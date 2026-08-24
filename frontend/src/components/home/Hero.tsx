// src/components/home/Hero.tsx
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* 背景图：换成你 public 资料夹里实际的档名 */}
      <Image
        src="/hero-livingroom.jpeg"
        alt="STUDIO MONTRO interior"
        fill
        priority
        className="object-cover"
      />

      {/* 底部渐层，确保文字在图片上依然清楚可读 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* 文字内容：左下角对齐 */}
      <div className="container relative h-full flex flex-col justify-end pb-12 md:pb-16 lg:pb-20">
        <h1 className="max-w-3xl text-4xl leading-[1.1] text-white md:text-6xl lg:text-7xl">
          Make your home feel
          <br />a little more you.
        </h1>

        <p className="mt-4 max-w-1xl text-sm uppercase tracking-[0.15em] text-white/75 md:text-base">
          Malaysia&apos;s new generation of design-led interior objects
        </p>
      </div>
    </section>
  );
}
