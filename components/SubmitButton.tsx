"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn",
  pendingText = "Gözləyin…",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending || disabled}>
      {pending ? pendingText : children}
    </button>
  );
}
