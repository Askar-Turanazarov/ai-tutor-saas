import {
  BookOpen,
  Car,
  MapPin,
  Briefcase,
  Building2,
  CalendarDays,
  Clapperboard,
  Clock,
  CloudSun,
  GraduationCap,
  Hand,
  Handshake,
  HeartPulse,
  Landmark,
  Leaf,
  MessageCircle,
  Newspaper,
  Palette,
  PenLine,
  Plane,
  Rocket,
  Scale,
  ShoppingBag,
  Smartphone,
  Soup,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Car,
  MapPin,
  Briefcase,
  Building2,
  CalendarDays,
  Clapperboard,
  Clock,
  CloudSun,
  GraduationCap,
  Hand,
  Handshake,
  HeartPulse,
  Landmark,
  Leaf,
  Newspaper,
  Palette,
  PenLine,
  Plane,
  Rocket,
  Scale,
  ShoppingBag,
  Smartphone,
  Soup,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
};

export const TOPIC_ICONS = Object.keys(ICONS);

export function TopicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? MessageCircle;
  return <Icon {...props} />;
}

/** Calm per-level tints so the topic grid reads as a progression. */
export const LEVEL_TINT: Record<string, { fg: string; bg: string }> = {
  A1: { fg: "text-teal", bg: "bg-teal-soft" },
  A2: { fg: "text-success", bg: "bg-success-soft" },
  B1: { fg: "text-accent", bg: "bg-accent-soft" },
  B2: { fg: "text-accent", bg: "bg-accent-soft" },
  C1: { fg: "text-gold", bg: "bg-gold-soft" },
  C2: { fg: "text-danger", bg: "bg-danger-soft" },
};
