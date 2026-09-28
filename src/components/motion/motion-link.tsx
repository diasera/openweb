"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useAppMotion } from "./motion-context";

type MotionLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/** Link Next.js dengan progressive View Transition dan fallback normal. */
export function MotionLink({ href, onClick, ...props }: MotionLinkProps) {
  const { navigate } = useAppMotion();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.currentTarget.target === "_blank" ||
      event.currentTarget.hasAttribute("download")
    ) {
      return;
    }

    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    navigate(href);
  }

  return <Link href={href} onClick={handleClick} {...props} />;
}

