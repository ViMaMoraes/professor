"use client";

import { useRouter } from "next/navigation";

import { Input } from "@/components/ui";

export function SeletorData({ valor, todos }: { valor: string; todos: boolean }) {
  const router = useRouter();
  return (
    <Input
      type="date"
      defaultValue={valor}
      className="w-auto"
      onChange={(e) => {
        if (e.target.value) router.push(`/chamada?data=${e.target.value}${todos ? "&todos=1" : ""}`);
      }}
    />
  );
}
