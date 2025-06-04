import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable unused variable warnings
      "@typescript-eslint/no-unused-vars": "off",
      
      // Allow unescaped entities (apostrophes, quotes, etc.)
      "react/no-unescaped-entities": "off",
      
      // Allow explicit any types
      "@typescript-eslint/no-explicit-any": "off",
      
      // Make useEffect dependency warnings less strict
      "react-hooks/exhaustive-deps": "warn",
      
      // Allow img elements (disable Next.js image optimization warnings)
      "@next/next/no-img-element": "off",
      
      // Disable console warnings for development
      "no-console": "off"
    }
  }
];

export default eslintConfig;
