"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";

const navItems = [
  { href: "/", label: "Dashboard", icon: "H" },
  { href: "/explore", label: "Explore", icon: "E" },
  { href: "/markets", label: "Markets", icon: "M" },
  { href: "/performance", label: "Performance", icon: "P" },
  { href: "/settings", label: "Settings", icon: "S" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { models } = useModels();

  const enabledNames = models
    .filter((m) => m.enabled)
    .map((m) => m.display_name);

  return (
    <aside className="w-64 border-r border-border bg-card min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold">PolyAIbot</h1>
        <p className="text-xs text-muted-foreground">Prediction Aggregator</p>
      </div>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="w-6 h-6 rounded bg-muted/30 flex items-center justify-center text-xs font-bold">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="text-xs text-muted-foreground pt-4 border-t border-border">
        {enabledNames.length > 0
          ? `Powered by ${enabledNames.join(", ")}`
          : "No models enabled"}
      </div>
    </aside>
  );
}
