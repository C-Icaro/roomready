import { Sofa, CookingPot, BedDouble, Bath } from "lucide-react";
export const rooms = [
  {
    id: "living",
    name: "Living room",
    short: "Living",
    icon: Sofa,
    color: "#b4ce8d",
    description: "A place to land. And a little room to breathe.",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    short: "Kitchen",
    icon: CookingPot,
    color: "#e5af77",
    description: "First coffee. First dinner. First memories.",
  },
  {
    id: "bedroom",
    name: "Bedroom",
    short: "Bedroom",
    icon: BedDouble,
    color: "#a2b6ce",
    description: "Make your first night feel like home.",
  },
  {
    id: "bathroom",
    name: "Bathroom",
    short: "Bath",
    icon: Bath,
    color: "#acc9c4",
    description: "The everyday essentials, taken care of.",
  },
] as const;
export type RoomId = (typeof rooms)[number]["id"];
export const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
export function daysUntil(date: string) {
  const today = new Date();
  const [year, month, day] = date.split("-").map(Number);
  const targetDay = Date.UTC(year, month - 1, day);
  const currentDay = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.max(0, Math.round((targetDay - currentDay) / 86400000));
}
