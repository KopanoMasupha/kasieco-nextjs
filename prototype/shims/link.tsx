import React from "react";
import { navigate } from "./router";
export default function Link({ href, onClick, children, ...rest }: any) {
  const to = typeof href === "string" ? href : href?.pathname || "/";
  return (
    <a href={"#" } {...rest} onClick={(e) => { onClick?.(e); if (e.defaultPrevented) return; e.preventDefault(); navigate(to); }}>
      {children}
    </a>
  );
}
