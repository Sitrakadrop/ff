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

type CategoryIconProps = {
  name?: string | null;
  className?: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function CategoryIcon({
  name,
  className,
}: CategoryIconProps) {
  const value = normalize(name ?? "");

  if (
    value.includes("business") ||
    value.includes("corporate") ||
    value.includes("business & corporate")
  ) {
    return (
      <BriefcaseBusiness
        className={className}
      />
    );
  }

  if (
    value.includes("data") ||
    value.includes("analytics")
  ) {
    return (
      <BarChart3
        className={className}
      />
    );
  }

  if (
    value.includes("food") ||
    value.includes("restaurant")
  ) {
    return (
      <Utensils
        className={className}
      />
    );
  }

  if (
    value.includes("infographic") ||
    value.includes("infographie")
  ) {
    return (
      <Image
        className={className}
      />
    );
  }

  if (
    value.includes("medical") ||
    value.includes("healthcare") ||
    value.includes("health")
  ) {
    return (
      <HeartPulse
        className={className}
      />
    );
  }

  if (
    value.includes("portfolio") ||
    value.includes("social media") ||
    value.includes("social")
  ) {
    return (
      <Camera
        className={className}
      />
    );
  }

  if (
    value.includes("product") ||
    value.includes("presentation")
  ) {
    return (
      <Package
        className={className}
      />
    );
  }

  if (
    value.includes("startup") ||
    value.includes("investment")
  ) {
    return (
      <Rocket
        className={className}
      />
    );
  }

  if (
    value.includes("technology") ||
    value.includes("it")
  ) {
    return (
      <Cpu
        className={className}
      />
    );
  }

  if (
    value.includes("travel") ||
    value.includes("tourism")
  ) {
    return (
      <Plane
        className={className}
      />
    );
  }

  /*
   * Fallback uniquement si une catégorie
   * inconnue est ajoutée plus tard.
   */
  return (
    <BriefcaseBusiness
      className={className}
    />
  );
}