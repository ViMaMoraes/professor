import { GraduationCap } from "lucide-react";

import { cn } from "./ui";

/** Ícone do app: neutro, serve para qualquer tipo de aula. */
export function Logo({ grande, className }: { grande?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-marca text-marca-contraste",
        grande ? "size-12 rounded-2xl shadow-lg" : "size-8 rounded-lg",
        className,
      )}
    >
      <GraduationCap className={grande ? "size-6" : "size-4"} />
    </span>
  );
}
