import { classNames } from "@/lib/format";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={classNames("skeleton block", className)}
      style={style}
      aria-hidden
    />
  );
}
