"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";

type FurnitureVariant = {
  src: string;

  /**
   * ONLY controls the permanent calibration of this specific PNG.
   * Never put hover transforms here.
   */
  poseClassName: string;

  /**
   * Dark, compact shadow directly underneath the furniture.
   */
  contactShadowClassName: string;

  /**
   * Longer directional shadow caused by the strong left-side sunlight.
   */
  castShadowClassName: string;

  imageStyle: CSSProperties;
};

/* =========================================================
   CHAIRS
   ========================================================= */

const CHAIRS: FurnitureVariant[] = [
  {
    src: "/chairs/chair-01.png",

    poseClassName:
      "translate-x-[0%] translate-y-[1%] scale-[0.86] " +
      "sm:translate-x-[0%] sm:translate-y-[0%] sm:scale-[0.85] " +
      "md:translate-x-[0%] md:translate-y-[-1%] md:scale-[0.84] " +
      "lg:translate-x-[0%] lg:translate-y-[-2%] lg:scale-[0.82]",

    contactShadowClassName:
      "left-[22%] bottom-[6%] h-[7%] w-[55%] " +
      "bg-[#24170f]/45 blur-[12px] " +
      "sm:left-[22%] sm:bottom-[6%] sm:h-[7%] sm:w-[55%] " +
      "md:left-[21%] md:bottom-[6%] md:h-[8%] md:w-[56%] md:bg-[#24170f]/50 md:blur-[13px] " +
      "lg:left-[21%] lg:bottom-[6%] lg:h-[8%] lg:w-[57%] lg:bg-[#24170f]/55 lg:blur-[14px]",

    castShadowClassName:
      "left-[24%] bottom-[4%] h-[8%] w-[64%] " +
      "translate-x-[8%] rotate-[3deg] bg-[#372419]/25 blur-[21px] " +
      "sm:translate-x-[11%] sm:w-[66%] " +
      "md:left-[23%] md:bottom-[4%] md:h-[9%] md:w-[69%] md:translate-x-[15%] md:bg-[#372419]/29 md:blur-[24px] " +
      "lg:left-[22%] lg:bottom-[4%] lg:h-[9%] lg:w-[72%] lg:translate-x-[18%] lg:rotate-[4deg] lg:bg-[#372419]/32 lg:blur-[27px]",

    imageStyle: {
      filter:
        "brightness(0.72) saturate(0.80) contrast(0.96) sepia(0.055) " +
        "drop-shadow(9px 13px 9px rgba(42,28,18,0.21)) " +
        "drop-shadow(3px 4px 4px rgba(42,28,18,0.16))",
    },
  },

  {
    src: "/chairs/chair-02.png",

    poseClassName:
      "translate-x-[3%] translate-y-[13%] scale-[1.00] " +
      "sm:translate-x-[3%] sm:translate-y-[14%] sm:scale-[1.03] " +
      "md:translate-x-[4%] md:translate-y-[16%] md:scale-[1.07] " +
      "lg:translate-x-[5%] lg:translate-y-[18%] lg:scale-[1.10]",

    contactShadowClassName:
      "left-[14%] bottom-[0%] h-[8%] w-[68%] " +
      "bg-[#24170f]/43 blur-[12px] " +
      "sm:left-[14%] sm:w-[69%] " +
      "md:left-[14%] md:h-[9%] md:w-[70%] md:bg-[#24170f]/48 md:blur-[14px] " +
      "lg:left-[24%] lg:bottom-[15%] lg:h-[9%] lg:w-[72%] lg:bg-[#24170f]/93 lg:blur-[15px]",

    castShadowClassName:
      "left-[17%] bottom-[-1%] h-[8%] w-[74%] " +
      "translate-x-[7%] rotate-[3deg] bg-[#372419]/24 blur-[20px] " +
      "sm:translate-x-[10%] sm:w-[76%] " +
      "md:left-[16%] md:h-[9%] md:w-[78%] md:translate-x-[13%] md:bg-[#372419]/28 md:blur-[23px] " +
      "lg:left-[16%] lg:bottom-[-1%] lg:h-[9%] lg:w-[80%] lg:translate-x-[16%] lg:rotate-[4deg] lg:bg-[#372419]/31 lg:blur-[26px]",

    imageStyle: {
      filter:
        "brightness(0.70) saturate(0.76) contrast(0.96) sepia(0.06) " +
        "drop-shadow(9px 13px 10px rgba(42,28,18,0.20)) " +
        "drop-shadow(3px 4px 4px rgba(42,28,18,0.15))",
    },
  },

  {
    src: "/chairs/chair-03.png",

    poseClassName:
      "translate-x-[0%] translate-y-[1%] scale-[0.82] " +
      "sm:translate-x-[0%] sm:translate-y-[0%] sm:scale-[0.80] " +
      "md:translate-x-[0%] md:translate-y-[-2%] md:scale-[0.77] " +
      "lg:translate-x-[0%] lg:translate-y-[-3%] lg:scale-[0.75]",

    contactShadowClassName:
      "left-[22%] bottom-[6%] h-[7%] w-[53%] " +
      "bg-[#24170f]/43 blur-[12px] " +
      "sm:left-[22%] sm:w-[54%] " +
      "md:left-[21%] md:h-[8%] md:w-[55%] md:bg-[#24170f]/48 md:blur-[14px] " +
      "lg:left-[21%] lg:bottom-[6%] lg:h-[8%] lg:w-[57%] lg:bg-[#24170f]/52 lg:blur-[15px]",

    castShadowClassName:
      "left-[24%] bottom-[4%] h-[7%] w-[62%] " +
      "translate-x-[8%] rotate-[3deg] bg-[#372419]/24 blur-[20px] " +
      "sm:translate-x-[11%] sm:w-[64%] " +
      "md:left-[23%] md:h-[8%] md:w-[67%] md:translate-x-[14%] md:bg-[#372419]/28 md:blur-[23px] " +
      "lg:left-[23%] lg:bottom-[4%] lg:h-[8%] lg:w-[70%] lg:translate-x-[17%] lg:rotate-[4deg] lg:bg-[#372419]/31 lg:blur-[26px]",

    imageStyle: {
      filter:
        "brightness(0.69) saturate(0.78) contrast(0.97) sepia(0.06) " +
        "drop-shadow(9px 14px 10px rgba(42,28,18,0.22)) " +
        "drop-shadow(3px 4px 4px rgba(42,28,18,0.15))",
    },
  },

  {
    src: "/chairs/chair-04.png",

    poseClassName:
      "translate-x-[0%] translate-y-[5%] scale-[0.88] " +
      "sm:translate-x-[0%] sm:translate-y-[4%] sm:scale-[0.87] " +
      "md:translate-x-[0%] md:translate-y-[3%] md:scale-[0.86] " +
      "lg:translate-x-[0%] lg:translate-y-[2%] lg:scale-[0.85]",

    contactShadowClassName:
      "left-[16%] bottom-[4%] h-[8%] w-[65%] " +
      "bg-[#24170f]/43 blur-[12px] " +
      "sm:left-[16%] sm:w-[66%] " +
      "md:left-[16%] md:h-[9%] md:w-[67%] md:bg-[#24170f]/48 md:blur-[14px] " +
      "lg:left-[16%] lg:bottom-[4%] lg:h-[9%] lg:w-[69%] lg:bg-[#24170f]/52 lg:blur-[15px]",

    castShadowClassName:
      "left-[19%] bottom-[2%] h-[8%] w-[72%] " +
      "translate-x-[8%] rotate-[3deg] bg-[#372419]/23 blur-[20px] " +
      "sm:translate-x-[10%] sm:w-[74%] " +
      "md:left-[18%] md:h-[9%] md:w-[76%] md:translate-x-[13%] md:bg-[#372419]/27 md:blur-[23px] " +
      "lg:left-[18%] lg:bottom-[2%] lg:h-[9%] lg:w-[78%] lg:translate-x-[16%] lg:rotate-[4deg] lg:bg-[#372419]/30 lg:blur-[26px]",

    imageStyle: {
      filter:
        "brightness(0.72) saturate(0.75) contrast(0.96) sepia(0.05) " +
        "drop-shadow(9px 13px 10px rgba(42,28,18,0.21)) " +
        "drop-shadow(3px 4px 4px rgba(42,28,18,0.15))",
    },
  },
];

/* =========================================================
   TABLES
   ========================================================= */

const TABLES: FurnitureVariant[] = [
  {
    src: "/tables/table-01.png",

    poseClassName:
      "translate-x-[0%] translate-y-[11%] scale-[0.97] " +
      "sm:translate-x-[0%] sm:translate-y-[13%] sm:scale-[1.00] " +
      "md:translate-x-[0%] md:translate-y-[15%] md:scale-[1.03] " +
      "lg:translate-x-[0%] lg:translate-y-[16%] lg:scale-[1.05]",

    contactShadowClassName:
      "left-[8%] bottom-[0%] h-[8%] w-[84%] " +
      "bg-[#24170f]/43 blur-[11px] " +
      "sm:bg-[#24170f]/46 " +
      "md:left-[8%] md:h-[9%] md:w-[85%] md:bg-[#24170f]/50 md:blur-[13px] " +
      "lg:left-[8%] lg:bottom-[0%] lg:h-[9%] lg:w-[86%] lg:bg-[#24170f]/54 lg:blur-[14px]",

    castShadowClassName:
      "left-[11%] bottom-[-2%] h-[7%] w-[89%] " +
      "translate-x-[7%] rotate-[2deg] bg-[#372419]/22 blur-[19px] " +
      "sm:translate-x-[9%] " +
      "md:left-[10%] md:h-[8%] md:w-[92%] md:translate-x-[12%] md:bg-[#372419]/26 md:blur-[22px] " +
      "lg:left-[10%] lg:bottom-[-2%] lg:h-[8%] lg:w-[94%] lg:translate-x-[15%] lg:rotate-[3deg] lg:bg-[#372419]/29 lg:blur-[25px]",

    imageStyle: {
      filter:
        "brightness(0.71) saturate(0.79) contrast(0.97) sepia(0.055) " +
        "drop-shadow(8px 10px 8px rgba(42,28,18,0.19)) " +
        "drop-shadow(3px 4px 4px rgba(42,28,18,0.13))",
    },
  },

  {
    src: "/tables/table-02.png",

    poseClassName:
      "translate-x-[4%] translate-y-[8%] scale-[0.84] " +
      "sm:translate-x-[5%] sm:translate-y-[9%] sm:scale-[0.85] " +
      "md:translate-x-[6%] md:translate-y-[11%] md:scale-[0.86] " +
      "lg:translate-x-[7%] lg:translate-y-[12%] lg:scale-[0.87]",

    contactShadowClassName:
      "left-[9%] bottom-[2%] h-[8%] w-[82%] " +
      "bg-[#24170f]/43 blur-[11px] " +
      "sm:bg-[#24170f]/46 " +
      "md:left-[9%] md:h-[9%] md:w-[83%] md:bg-[#24170f]/50 md:blur-[13px] " +
      "lg:left-[9%] lg:bottom-[2%] lg:h-[9%] lg:w-[84%] lg:bg-[#24170f]/54 lg:blur-[14px]",

    castShadowClassName:
      "left-[12%] bottom-[0%] h-[7%] w-[86%] " +
      "translate-x-[7%] rotate-[2deg] bg-[#372419]/22 blur-[19px] " +
      "sm:translate-x-[9%] " +
      "md:left-[11%] md:h-[8%] md:w-[89%] md:translate-x-[12%] md:bg-[#372419]/26 md:blur-[22px] " +
      "lg:left-[11%] lg:bottom-[0%] lg:h-[8%] lg:w-[91%] lg:translate-x-[15%] lg:rotate-[3deg] lg:bg-[#372419]/29 lg:blur-[25px]",

    imageStyle: {
      filter:
        "brightness(0.69) saturate(0.75) contrast(0.98) sepia(0.06) " +
        "drop-shadow(8px 10px 8px rgba(42,28,18,0.19)) " +
        "drop-shadow(3px 4px 4px rgba(42,28,18,0.13))",
    },
  },

  {
    src: "/tables/table-03.png",

    poseClassName:
      "translate-x-[1%] translate-y-[6%] scale-[0.96] " +
      "sm:translate-x-[1%] sm:translate-y-[7%] sm:scale-[0.99] " +
      "md:translate-x-[1%] md:translate-y-[9%] md:scale-[1.02] " +
      "lg:translate-x-[1%] lg:translate-y-[10%] lg:scale-[1.05]",

    contactShadowClassName:
      "left-[27%] bottom-[2%] h-[8%] w-[47%] " +
      "bg-[#24170f]/45 blur-[10px] " +
      "sm:bg-[#24170f]/48 " +
      "md:left-[26%] md:h-[9%] md:w-[49%] md:bg-[#24170f]/52 md:blur-[12px] " +
      "lg:left-[26%] lg:bottom-[2%] lg:h-[9%] lg:w-[50%] lg:bg-[#24170f]/56 lg:blur-[13px]",

    castShadowClassName:
      "left-[29%] bottom-[0%] h-[7%] w-[55%] " +
      "translate-x-[9%] rotate-[3deg] bg-[#372419]/23 blur-[18px] " +
      "sm:translate-x-[11%] " +
      "md:left-[28%] md:h-[8%] md:w-[59%] md:translate-x-[14%] md:bg-[#372419]/27 md:blur-[21px] " +
      "lg:left-[28%] lg:bottom-[0%] lg:h-[8%] lg:w-[62%] lg:translate-x-[17%] lg:rotate-[4deg] lg:bg-[#372419]/30 lg:blur-[24px]",

    imageStyle: {
      filter:
        "brightness(0.72) saturate(0.79) contrast(0.98) sepia(0.05) " +
        "drop-shadow(8px 11px 8px rgba(42,28,18,0.19)) " +
        "drop-shadow(3px 4px 4px rgba(42,28,18,0.13))",
    },
  },

  {
    src: "/tables/table-04.png",

    poseClassName:
      "translate-x-[0%] translate-y-[19%] scale-[1.08] " +
      "sm:translate-x-[0%] sm:translate-y-[22%] sm:scale-[1.13] " +
      "md:translate-x-[0%] md:translate-y-[25%] md:scale-[1.19] " +
      "lg:translate-x-[0%] lg:translate-y-[28%] lg:scale-[1.24]",

    contactShadowClassName:
      "left-[5%] bottom-[-3%] h-[8%] w-[90%] " +
      "bg-[#24170f]/42 blur-[11px] " +
      "sm:bg-[#24170f]/45 " +
      "md:left-[4%] md:h-[9%] md:w-[92%] md:bg-[#24170f]/49 md:blur-[13px] " +
      "lg:left-[4%] lg:bottom-[-3%] lg:h-[9%] lg:w-[93%] lg:bg-[#24170f]/53 lg:blur-[14px]",

    castShadowClassName:
      "left-[7%] bottom-[-5%] h-[7%] w-[96%] " +
      "translate-x-[6%] rotate-[2deg] bg-[#372419]/21 blur-[19px] " +
      "sm:translate-x-[8%] " +
      "md:left-[6%] md:h-[8%] md:w-[100%] md:translate-x-[11%] md:bg-[#372419]/25 md:blur-[22px] " +
      "lg:left-[6%] lg:bottom-[-5%] lg:h-[8%] lg:w-[103%] lg:translate-x-[14%] lg:rotate-[3deg] lg:bg-[#372419]/28 lg:blur-[25px]",

    imageStyle: {
      filter:
        "brightness(0.70) saturate(0.81) contrast(0.97) sepia(0.055) " +
        "drop-shadow(8px 10px 8px rgba(42,28,18,0.18)) " +
        "drop-shadow(3px 4px 4px rgba(42,28,18,0.13))",
    },
  },
];

/* =========================================================
   HERO
   ========================================================= */

export default function Hero() {
  const [chairIndex, setChairIndex] = useState(0);
  const [tableIndex, setTableIndex] = useState(0);

  function nextChair() {
    setChairIndex((current) => (current + 1) % CHAIRS.length);
  }

  function nextTable() {
    setTableIndex((current) => (current + 1) % TABLES.length);
  }

  return (
    <section className="relative h-svh min-h-[620px] w-full overflow-hidden bg-[#b89d7c]">
      {/* ==================================================
          ROOM BACKGROUND
          ================================================== */}

      <img
        src="/hero-livingroom1.png"
        alt="Studio MONTRO interior"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Keep copy readable without flattening the room */}
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-black/40 via-black/[0.08] to-transparent" />

      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/26 via-transparent to-black/[0.02]" />

      {/* Very subtle warm atmosphere over the interactive zone.
          Helps generated cutouts live inside the same photographic world. */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          bottom-0
          right-0
          z-[3]
          h-[64%]
          w-[62%]
          bg-[radial-gradient(ellipse_at_65%_85%,rgba(102,70,43,0.10),transparent_65%)]
        "
      />

      {/* ==================================================
          INTERACTIVE FURNITURE
          ================================================== */}

      <div className="absolute inset-0 z-10">
        {/* ==================================================
            CHAIR
            ================================================== */}

        <button
          type="button"
          onClick={nextChair}
          aria-label="Restyle the room with another chair"
          className="
            group/chair
            absolute
            bottom-[7%]
            right-[2%]
            z-20
            h-[42%]
            w-[43%]
            cursor-pointer
            touch-manipulation
            outline-none

            sm:bottom-[6%]
            sm:right-[3%]
            sm:h-[45%]
            sm:w-[40%]

            md:bottom-[5%]
            md:right-[4%]
            md:h-[47%]
            md:w-[36%]

            lg:bottom-[4%]
            lg:right-[5%]
            lg:h-[49%]
            lg:w-[34%]

            xl:right-[6%]
            xl:h-[50%]
            xl:w-[33%]
          "
        >
          {CHAIRS.map((chair, index) => {
            const active = chairIndex === index;

            return (
              <span
                key={chair.src}
                className={`
                  absolute
                  inset-0
                  origin-bottom
                  transition-[opacity]
                  duration-500
                  ease-out

                  ${active ? "opacity-100" : "pointer-events-none opacity-0"}
                `}
              >
                {/* Long sunlight cast shadow */}
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none
                    absolute
                    rounded-[50%]
                    transition-[opacity,filter]
                    duration-300

                    ${chair.castShadowClassName}

                    md:group-hover/chair:opacity-90
                  `}
                />

                {/* Heavy contact shadow */}
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none
                    absolute
                    rounded-[50%]
                    transition-[opacity,filter]
                    duration-300

                    ${chair.contactShadowClassName}

                    md:group-hover/chair:opacity-95
                  `}
                />

                {/* Permanent PNG calibration */}
                <span
                  className={`
                    absolute
                    inset-0
                    origin-bottom
                    ${chair.poseClassName}
                  `}
                >
                  {/* Hover animation lives on its OWN layer.
                      It therefore never overwrites poseClassName. */}
                  <span
                    className="
                      absolute
                      inset-0
                      origin-bottom
                      transition-transform
                      duration-500
                      ease-[cubic-bezier(0.22,1,0.36,1)]

                      md:group-hover/chair:-translate-y-[2px]
                      md:group-hover/chair:scale-[1.006]
                    "
                  >
                    <Image
                      src={chair.src}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 43vw, (max-width: 1024px) 36vw, 33vw"
                      className="object-contain object-bottom"
                      style={chair.imageStyle}
                    />
                  </span>
                </span>
              </span>
            );
          })}
        </button>

        {/* ==================================================
            COFFEE TABLE
            ================================================== */}

        <button
          type="button"
          onClick={nextTable}
          aria-label="Restyle the room with another coffee table"
          className="
            group/table
            absolute
            bottom-[5%]
            right-[26%]
            z-30
            h-[25%]
            w-[30%]
            cursor-pointer
            touch-manipulation
            outline-none

            sm:bottom-[4%]
            sm:right-[26%]
            sm:h-[27%]
            sm:w-[28%]

            md:bottom-[3%]
            md:right-[25%]
            md:h-[29%]
            md:w-[25%]

            lg:bottom-[3%]
            lg:right-[24%]
            lg:h-[31%]
            lg:w-[24%]

            xl:right-[24%]
            xl:h-[32%]
            xl:w-[23%]
          "
        >
          {TABLES.map((table, index) => {
            const active = tableIndex === index;

            return (
              <span
                key={table.src}
                className={`
                  absolute
                  inset-0
                  origin-bottom
                  transition-[opacity]
                  duration-500
                  ease-out

                  ${active ? "opacity-100" : "pointer-events-none opacity-0"}
                `}
              >
                {/* Directional cast */}
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none
                    absolute
                    rounded-[50%]
                    transition-[opacity,filter]
                    duration-300

                    ${table.castShadowClassName}

                    md:group-hover/table:opacity-90
                  `}
                />

                {/* Contact shadow */}
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none
                    absolute
                    rounded-[50%]
                    transition-[opacity,filter]
                    duration-300

                    ${table.contactShadowClassName}

                    md:group-hover/table:opacity-95
                  `}
                />

                {/* Permanent position calibration */}
                <span
                  className={`
                    absolute
                    inset-0
                    origin-bottom
                    ${table.poseClassName}
                  `}
                >
                  {/* Independent hover motion */}
                  <span
                    className="
                      absolute
                      inset-0
                      origin-bottom
                      transition-transform
                      duration-500
                      ease-[cubic-bezier(0.22,1,0.36,1)]

                      md:group-hover/table:-translate-y-[1px]
                      md:group-hover/table:scale-[1.005]
                    "
                  >
                    <Image
                      src={table.src}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 30vw, (max-width: 1024px) 25vw, 23vw"
                      className="object-contain object-bottom"
                      style={table.imageStyle}
                    />
                  </span>
                </span>
              </span>
            );
          })}
        </button>
      </div>

      {/* ==================================================
          HERO COPY
          ================================================== */}

      <div
        className="
    container
    pointer-events-none
    relative
    z-40
    flex
    h-full
    flex-col
    justify-end
    pb-8

    sm:pb-10
    md:pb-12
    lg:pb-16
  "
      >
        <div className="max-w-[620px] pb-1 sm:pb-2 lg:max-w-[720px]">
          <h1
            className="
        max-w-[520px]
        text-[clamp(2.35rem,8vw,4rem)]
        font-medium
        leading-[0.98]
        tracking-[-0.045em]
        text-white

        sm:max-w-[600px]
        md:text-6xl
        lg:max-w-[720px]
        lg:text-7xl
      "
          >
            Make your home feel
            <br />a little more you.
          </h1>

          <p
            className="
        mt-4
        max-w-[390px]
        text-[10px]
        uppercase
        leading-5
        tracking-[0.14em]
        text-white/65

        sm:text-xs
        md:mt-5
        md:max-w-[520px]
        md:text-sm
      "
          >
            Different pieces. Different feeling. Find the combination that
            changes the way your space feels.
          </p>
        </div>
      </div>
    </section>
  );
}
