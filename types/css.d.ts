// ============================================
// Déclarations ambient — imports CSS
// ============================================
// TypeScript active noUncheckedSideEffectImports : un import side-effect
// comme `import "./globals.css"` exige une déclaration de module.
// Next ne déclare que les *.module.css ; ce fichier couvre le reste.
// (fix erreur TS2882 sur app/layout.tsx — aucune incidence au runtime)

declare module "*.css";
