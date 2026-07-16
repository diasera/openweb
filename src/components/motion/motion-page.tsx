"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { useAppMotion } from "./motion-context";
import type { RouteMotionKind } from "./route-motion";

export function MotionPage({
  children,
  className,
  navigationReady = true,
  profile,
}: {
  children: ReactNode;
  className?: string;
  navigationReady?: boolean;
  profile?: RouteMotionKind;
}) {
  const { markPageReady, pathname, transition } = useAppMotion();
  const [instancePath] = useState(pathname);
  const current = instancePath === pathname;

  useLayoutEffect(() => {
    if (current && navigationReady) markPageReady(instancePath);
  }, [current, instancePath, markPageReady, navigationReady]);

  return (
    <div
      className={cn("route-motion", className)}
      data-current={current}
      data-motion={current ? (profile ?? transition) : "initial"}
      data-route-path={instancePath}
    >
      {children}
    </div>
  );
}
