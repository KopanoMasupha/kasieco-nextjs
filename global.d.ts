// Plain stylesheet imports are handled by Next.js at build time. Declaring the
// wildcard modules here means the TypeScript language service (TS ≥ 5.5 checks
// side-effect imports) can never flag `import "./globals.css"` in app/layout.tsx,
// even if it starts up before `.next/types` exists.
declare module "*.css";
declare module "*.scss";
declare module "*.sass";
