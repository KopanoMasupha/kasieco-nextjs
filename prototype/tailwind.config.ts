import base from "../tailwind.config";
export default {
  ...base,
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./prototype/*.tsx", "./prototype/shims/*.tsx"],
};
