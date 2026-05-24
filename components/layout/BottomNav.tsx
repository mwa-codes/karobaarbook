"use client";

import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  BookIcon,
  HomeIcon,
  MenuIcon,
  RoznamchaIcon,
  UsersIcon,
} from "@/components/ui/Icons";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/Toast";
import { classNames, openWhatsApp } from "@/lib/format";
import { OWNER_WHATSAPP } from "@/lib/support";

interface Tab {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/khata", label: "Khata", icon: BookIcon },
  { href: "/karigar", label: "Karigar", icon: UsersIcon },
  { href: "/roznamcha", label: "Roznamcha", icon: RoznamchaIcon },
  { href: "/more", label: "More", icon: MenuIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const toast = useToast();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/more") return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <nav
        className={classNames(
          "fixed bottom-0 z-40",
          "left-1/2 -translate-x-1/2",
          "w-full max-w-app",
          "bg-white border-t border-line",
          "shadow-[0_-4px_12px_rgba(0,0,0,0.08)] safe-bottom"
        )}
        aria-label="Primary"
      >
        <div className="grid grid-cols-5 h-[68px]">
          {TABS.map((tab) =>
            tab.href === "/more" ? (
              <TabButton
                key={tab.href}
                tab={tab}
                active={false}
                onClick={() => setMoreOpen(true)}
              />
            ) : (
              <TabLink
                key={tab.href}
                tab={tab}
                active={isActive(tab.href)}
              />
            )
          )}
        </div>
      </nav>

      <BottomSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="More"
      >
        <div className="flex flex-col gap-2">
          <MoreLink
            label="📲 App Share Karein"
            sublabel="Doston ko KarobaarBook ke baare mein batayein"
            onClick={() => {
              const msg =
                "KarobaarBook — factory owners ke liye digital register app.\n\nhttps://karobaarbook.vercel.app";
              openWhatsApp(msg);
              setMoreOpen(false);
            }}
          />
          <MoreLink
            label="💬 Feedback Dein"
            sublabel="Koi masla ya suggestion ho to batayein"
            onClick={() => {
              const msg = "KarobaarBook feedback:\n\n";
              openWhatsApp(msg, OWNER_WHATSAPP);
              setMoreOpen(false);
            }}
          />
          <MoreLink
            label="👤 Profile"
            sublabel="Coming soon"
            onClick={() => {
              setMoreOpen(false);
              toast.show("Coming soon");
            }}
          />
        </div>
      </BottomSheet>
    </>
  );
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;
  // Full page navigation so the service worker can serve cached HTML offline
  // (Next.js <Link> uses RSC requests that often miss the SW cache on iOS/Android).
  return (
    <a
      href={tab.href}
      className={classNames(
        "flex flex-col items-center justify-center gap-1 focus:outline-none",
        active ? "text-brand" : "text-ink-500"
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-semibold leading-none">
        {tab.label}
      </span>
    </a>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: Tab;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "flex flex-col items-center justify-center gap-1 focus:outline-none",
        active ? "text-brand" : "text-ink-500"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-semibold leading-none">
        {tab.label}
      </span>
    </button>
  );
}

function MoreLink({
  label,
  sublabel,
  onClick,
}: {
  label: string;
  sublabel?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 text-left hover:bg-page"
    >
      <div>
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        {sublabel ? (
          <p className="text-xs text-ink-500">{sublabel}</p>
        ) : null}
      </div>
      <span className="text-ink-500">›</span>
    </button>
  );
}
