"use client";

import { useFormStatus } from "react-dom";
import { useT } from "@/lib/i18n/client";

export function SubmitButton({
  children,
  className = "btn",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const t = useT();
  return (
    <button className={className} type="submit" disabled={pending || disabled}>
      {pending ? t.common.wait : children}
    </button>
  );
}
