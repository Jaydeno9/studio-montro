import localFont from "next/font/local";

export const headingFont = localFont({
  src: "./heading/AMORIA.otf",
  variable: "--font-heading",
  display: "swap",
});

export const bodyFont = localFont({
  src: "./body/Scaver-Regular.ttf",
  variable: "--font-body",
  display: "swap",
});