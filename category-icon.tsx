import {
  BarChart3,
  BriefcaseBusiness,
  Camera,
  Cpu,
  HeartPulse,
  Image,
  Package,
  Plane,
  Rocket,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CategoryIconProps = {
  name?: string | null;
  className?: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // BC — Business & Corporate
  bc: BriefcaseBusiness,
  business: BriefcaseBusiness,
  corporate: BriefcaseBusiness,
  "business corporate": BriefcaseBusiness,

  // DA — Data & Analytics
  da: BarChart3,
  data: BarChart3,
  analytics: BarChart3,
  "data analytics": BarChart3,

  // FR — Food & Restaurant
  fr: Utensils,
  food: Utensils,
  restaurant: Utensils,
  "food restaurant": Utensils,

  // IF — Infographic
  if: Image,
  infographic: Image,
  infographie: Image,

  // MH — Medical & Healthcare
  mh: HeartPulse,
  medical: HeartPulse,
  healthcare: HeartPulse,
  health: HeartPulse,
  "medical healthcare": HeartPulse,

  // PS — Portfolio & Social Media
  ps: Camera,
  portfolio: Camera,
  social: Camera,
  "social media": Camera,
  "portfolio social media": Camera,

  // PP — Product Presentation
  pp: Package,
  product: Package,
  presentation: Package,
  "product presentation": Package,

  // SI — Startup & Investment
  si: Rocket,
  startup: Rocket,
  investment: Rocket,
  "startup investment": Rocket,

  // TI — Technology & IT
  ti: Cpu,
  technology: Cpu,
  it: Cpu,
  "technology it": Cpu,

  // TT — Travel & Tourism
  tt: Plane,
  travel: Plane,
  tourism: Plane,
  "travel tourism": Plane,
};

function resolveIcon(name?: string | null): LucideIcon {
  const value = normalize(name ?? "");

  if (!value) {
    return BriefcaseBusiness;
  }

  // Correspondance directe
  if (CATEGORY_ICONS[value]) {
    return CATEGORY_ICONS[value];
  }

  // Correspondance par code de catégorie
  const firstWord = value.split(" ")[0];

  if (CATEGORY_ICONS[firstWord]) {
    return CATEGORY_ICONS[firstWord];
  }

  // Correspondance avec les anciens noms
  if (
    value.includes("business") ||
    value.includes("corporate")
  ) {
    return BriefcaseBusiness;
  }

  if (
    value.includes("data") ||
    value.includes("analytics")
  ) {
    return BarChart3;
  }

  if (
    value.includes("food") ||
    value.includes("restaurant")
  ) {
    return Utensils;
  }

  if (
    value.includes("infographic") ||
    value.includes("infographie")
  ) {
    return Image;
  }

  if (
    value.includes("medical") ||
    value.includes("healthcare") ||
    value.includes("health")
  ) {
    return HeartPulse;
  }

  if (
    value.includes("portfolio") ||
    value.includes("social")
  ) {
    return Camera;
  }

  if (
    value.includes("product") ||
    value.includes("presentation")
  ) {
    return Package;
  }

  if (
    value.includes("startup") ||
    value.includes("investment")
  ) {
    return Rocket;
  }

  if (
    value.includes("technology") ||
    value === "it"
  ) {
    return Cpu;
  }

  if (
    value.includes("travel") ||
    value.includes("tourism")
  ) {
    return Plane;
  }

  // Fallback
  return BriefcaseBusiness;
}

export function CategoryIcon({
  name,
  className,
}: CategoryIconProps) {
  const Icon = resolveIcon(name);

  return (
    <Icon
      className={className}
      aria-hidden="true"
    />
  );
}