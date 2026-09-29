import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Only expose VITE_ prefixed env vars to the browser
  envPrefix: "VITE_",
});
