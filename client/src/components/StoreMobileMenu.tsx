import {
  Baby,
  BriefcaseBusiness,
  Cpu,
  Dumbbell,
  Footprints,
  Glasses,
  Landmark,
  Leaf,
  MoonStar,
  PersonStanding,
  Shirt,
  UserRound,
  Watch,
  type LucideIcon,
} from "lucide-react";
import { ADDITIONAL_FASHION_CATEGORIES, FASHION_SUBCATEGORIES } from "@shared/productCategories";

type StoreMobileMenuProps = {
  open: boolean;
  onNavigate: () => void;
};

const categoryIcons: Record<string, LucideIcon> = {
  Electronics: Cpu,
  Fashion: Shirt,
  "Men's Fashion": PersonStanding,
  "Women's Fashion": UserRound,
  "Children's Fashion": Baby,
  "Shoes & Footwear": Footprints,
  "Bags & Luggage": BriefcaseBusiness,
  "Watches & Jewellery": Watch,
  "Fashion Accessories": Glasses,
  Sportswear: Dumbbell,
  "Traditional Fashion": Landmark,
  "Underwear & Nightwear": MoonStar,
  "Agro Products": Leaf,
};

const mobileNavItems: Array<{ label: string; href: string; nested?: boolean; icon?: LucideIcon }> = [
  { label: "Electronics", href: "/shop/Electronics", icon: categoryIcons.Electronics },
  { label: "Fashion", href: "/shop/Fashion", icon: categoryIcons.Fashion },
  ...FASHION_SUBCATEGORIES.map((label) => ({ label, href: `/shop/${encodeURIComponent(label)}`, nested: true, icon: categoryIcons[label] })),
  ...ADDITIONAL_FASHION_CATEGORIES.map((label) => ({ label, href: `/shop/${encodeURIComponent(label)}`, nested: true, icon: categoryIcons[label] })),
  { label: "Agro Products", href: "/shop/Agro%20Products", icon: categoryIcons["Agro Products"] },
  { label: "About us", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "My account", href: "/account" },
  { label: "Contact", href: "#contact" },
];

export default function StoreMobileMenu({ open, onNavigate }: StoreMobileMenuProps) {
  return (
    <div className={`store-mobile-menu ${open ? "is-open" : ""} md:hidden`} inert={!open} aria-hidden={!open}>
      <nav id="mobile-menu" aria-label="Mobile navigation">
        <div className="border-t border-white/10 px-5 py-2 text-base">
          {mobileNavItems.map(({ label, href, nested, icon: Icon }) => (
            <a key={href} onClick={onNavigate} href={href} className={`flex min-h-12 items-center gap-3 border-b border-white/5 text-white/85 last:border-0 hover:text-[#d2a63b] ${nested ? "pl-8 text-sm text-white/65" : ""}`}>
              {Icon && <Icon size={18} className="shrink-0 text-[#e1ba56]" aria-hidden="true" />}
              <span>{nested ? `— ${label}` : label}</span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
