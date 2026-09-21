import clsx from "clsx";

/**
 * The app-wide content container — the single source of truth for horizontal
 * alignment. Every layout region (sticky navbar, main content area, landing
 * sections) wraps its content in this so their left/right edges line up exactly
 * on every viewport width.
 *
 * IMPORTANT: horizontal padding never lives on the container itself. It belongs
 * on the padded, full-width parent — the shared `.app-gutter` class defined in
 * globals.css — so the container's inner edge, not its padded edge, is what
 * lines up, and notched phones get safe-area-aware gutters for free.
 */
export default function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={clsx("mx-auto w-full max-w-7xl", className)}>{children}</div>;
}
