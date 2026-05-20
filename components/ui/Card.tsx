import { HTMLAttributes } from "react";
import { classNames } from "@/lib/format";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={classNames(
        "rounded-2xl bg-white shadow-card",
        padded && "p-4",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
