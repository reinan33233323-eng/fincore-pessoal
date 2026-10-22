import { Landmark } from "lucide-react";

// Brand marks for the most common Brazilian banks, recognized by account name.
type Brand = { bg: string; fg: string; mark: string; size?: string; weight?: number };
const brands: [RegExp, Brand][] = [
  [/nu ?bank|^nu\b|roxinho/i, { bg: "#820AD1", fg: "#fff", mark: "nu", size: "0.95em", weight: 700 }],
  [/ita[uú]/i, { bg: "#EC7000", fg: "#003A8C", mark: "itaú", size: "0.74em", weight: 800 }],
  [/bradesco/i, { bg: "#CC092F", fg: "#fff", mark: "b", size: "1em", weight: 800 }],
  [/santander/i, { bg: "#EC0000", fg: "#fff", mark: "S", size: "0.95em", weight: 800 }],
  [/banco do brasil|^bb\b/i, { bg: "#FCF900", fg: "#0038A8", mark: "BB", size: "0.7em", weight: 800 }],
  [/caixa|cef\b/i, { bg: "#005CA9", fg: "#F39200", mark: "X", size: "1em", weight: 800 }],
  [/inter\b|banco inter/i, { bg: "#FF7A00", fg: "#fff", mark: "inter", size: "0.55em", weight: 800 }],
  [/c6/i, { bg: "#1C1C1C", fg: "#fff", mark: "C6", size: "0.7em", weight: 800 }],
  [/btg/i, { bg: "#0B2A4A", fg: "#fff", mark: "btg", size: "0.6em", weight: 800 }],
  [/picpay/i, { bg: "#11C76F", fg: "#fff", mark: "pic", size: "0.6em", weight: 800 }],
  [/mercado ?pago/i, { bg: "#00B1EA", fg: "#fff", mark: "mp", size: "0.75em", weight: 800 }],
  [/\bxp\b/i, { bg: "#111", fg: "#FFD400", mark: "xp", size: "0.8em", weight: 800 }],
  [/sicoob/i, { bg: "#003641", fg: "#C9D200", mark: "S", size: "0.95em", weight: 800 }],
  [/sicredi/i, { bg: "#3FA110", fg: "#fff", mark: "S", size: "0.95em", weight: 800 }],
  [/neon/i, { bg: "#00E5FF", fg: "#0A1E3C", mark: "neon", size: "0.55em", weight: 800 }],
  [/pagbank|pagseguro/i, { bg: "#1BB99A", fg: "#fff", mark: "pag", size: "0.6em", weight: 800 }],
  [/safra/i, { bg: "#0F2B5B", fg: "#C8A04A", mark: "S", size: "0.95em", weight: 800 }],
];
export const bankBrand = (name = "") => brands.find(([pattern]) => pattern.test(name))?.[1];

export default function BankLogo({ name, className = "h-10 w-10 text-base" }: { name?: string; className?: string }) {
  const brand = bankBrand(name);
  if (!brand)
    return (
      <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-xl bg-[#191918] text-white shadow-[0_8px_18px_-8px_rgba(24,24,27,0.9)] ${className}`}>
        <Landmark className="h-[45%] w-[45%]" />
      </span>
    );
  return (
    <span
      aria-hidden
      className={`flex shrink-0 select-none items-center justify-center rounded-xl leading-none tracking-[-0.04em] ring-1 ring-black/5 ${className}`}
      style={{ backgroundColor: brand.bg, color: brand.fg, boxShadow: `0 8px 18px -8px ${brand.bg}` }}
    >
      <span style={{ fontSize: brand.size, fontWeight: brand.weight }}>{brand.mark}</span>
    </span>
  );
}
