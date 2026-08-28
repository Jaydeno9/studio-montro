import Image from "next/image";
import type { ReactNode } from "react";

type AuthShellProps = {
  headline: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ headline, description, children }: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-[#f4f0e9] text-[#25211d] lg:fixed lg:inset-0 lg:z-[1200] lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:overflow-hidden">
      <AuthVisual headline={headline} description={description} />

      <section className="min-h-dvh lg:h-dvh lg:overflow-y-auto">
        <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-6 py-14 sm:px-10 lg:px-10 lg:py-16 xl:px-12">
          {children}
        </div>
      </section>
    </main>
  );
}

function AuthVisual({ headline, description }: Omit<AuthShellProps, "children">) {
  return (
    <section className="relative min-h-[250px] overflow-hidden sm:min-h-[320px] lg:h-dvh lg:min-h-0">
      <Image
        src="/hero-livingroom.jpeg"
        alt="Studio MONTRO living room interior"
        fill
        priority
        sizes="(min-width: 1024px) 54vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1d1713]/80 via-[#1d1713]/20 to-[#1d1713]/20" />

      <div className="relative flex h-full min-h-[250px] flex-col justify-between p-6 text-[#f4f0e9] sm:min-h-[320px] sm:p-10 lg:min-h-dvh lg:p-12 xl:p-16">
        <p className="text-[11px] uppercase tracking-[0.2em]">Studio MONTRO</p>
        <div className="max-w-[590px]">
          <p className="text-4xl font-medium leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl xl:text-7xl">
            {headline}
          </p>
          <p className="mt-5 max-w-[430px] text-sm leading-7 text-[#eee8df]">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
