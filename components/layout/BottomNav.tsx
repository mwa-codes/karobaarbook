"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookIcon,
  HomeIcon,
  MenuIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/ui/Icons";
import { useToast } from "@/components/ui/Toast";
import { classNames } from "@/lib/format";

interface Tab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean;
}

const TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/khata", label: "Khata", icon: BookIcon },
  { href: "/karigar", label: "Karigar", icon: UsersIcon, comingSoon: true },
  { href: "/more", label: "More", icon: MenuIcon, comingSoon: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleQuickAdd() {
    if (pathname.startsWith("/khata")) {
      router.push("/khata/new");
    } else {
      router.push("/khata/new");
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-app -translate-x-1/2 safe-bottom"
      aria-label="Primary"
    >
      <div className="relative mx-3 mb-3 grid grid-cols-5 items-end rounded-2xl border border-line bg-white shadow-card">
        {TABS.slice(0, 2).map((t) => (
          <TabLink
            key={t.href}
            tab={t}
            active={isActive(t.href)}
            onComingSoon={() => toast.show(`${t.label} — coming soon`)}
          />
        ))}

        <div className="relative flex justify-center">
          <button
            type="button"
            onClick={handleQuickAdd}
            aria-label="Quick add"
            className={classNames(
              "absolute -top-6 inline-flex h-14 w-14 items-center justify-center",
              "rounded-full bg-brand text-white shadow-fab",
              "transition-transform active:scale-95"
            )}
          >
            <PlusIcon width={26} height={26} />
          </button>
          <div className="h-[64px]" aria-hidden />
        </div>

        {TABS.slice(2).map((t) => (
          <TabLink
            key={t.href}
            tab={t}
            active={isActive(t.href)}
            onComingSoon={() => toast.show(`${t.label} — coming soon`)}
          />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  tab,
  active,
  onComingSoon,
}: {
  tab: Tab;
  active: boolean;
  onComingSoon: () => void;
}) {
  const Icon = tab.icon;
  const content = (
    <span
      className={classNames(
        "flex h-16 flex-col items-center justify-center gap-1",
        active ? "text-brand" : "text-ink-500"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-medium leading-none">{tab.label}</span>
    </span>
  );

  if (tab.comingSoon) {
    return (
      <button
        type="button"
        onClick={onComingSoon}
        className="focus:outline-none"
      >
        {content}
      </button>
    );
  }
  return (
    <Link href={tab.href} className="focus:outline-none">
      {content}
    </Link>
  );
}
