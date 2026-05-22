import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { Card } from "@/components/ui/Card";
import { classNames } from "@/lib/format";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export function DashboardSectionHeader({
  title,
  subtitle,
  featured = false,
  modules,
  action,
}: {
  title: string;
  subtitle?: string;
  /** Larger card with brand tint — use for the main overview block */
  featured?: boolean;
  modules?: { href: string; label: string; icon: Icon }[];
  action?: { href: string; label: string };
}) {
  if (featured) {
    return (
      <Card padded={false} className="overflow-hidden border border-brand-100">
        <div className="bg-gradient-to-br from-brand-50 via-white to-white px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
                Dashboard
              </p>
              <h2 className="mt-0.5 text-lg font-bold leading-tight text-ink-900">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_4px_12px_rgba(26,86,219,0.25)]"
              aria-hidden
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect
                  x="3"
                  y="3"
                  width="8"
                  height="8"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <rect
                  x="13"
                  y="3"
                  width="8"
                  height="5"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <rect
                  x="13"
                  y="11"
                  width="8"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <rect
                  x="3"
                  y="14"
                  width="8"
                  height="7"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>
        {modules && modules.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 border-t border-brand-100/80 bg-white px-3 py-3">
            {modules.map((m) => (
              <ModuleChip key={m.href} {...m} />
            ))}
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-ink-900">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="shrink-0 text-xs font-semibold text-brand hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function ModuleChip({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: Icon;
}) {
  return (
    <Link
      href={href}
      className={classNames(
        "flex flex-col items-center gap-1.5 rounded-xl border border-line bg-page py-2.5",
        "transition-colors hover:border-brand-100 hover:bg-brand-50"
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand shadow-sm ring-1 ring-line">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="text-[11px] font-semibold text-ink-700">{label}</span>
    </Link>
  );
}
