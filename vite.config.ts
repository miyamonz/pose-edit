import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import Terminal from "vite-plugin-terminal";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), Terminal()],
  server: {
    host: "0.0.0.0",
    https: {
      key: fs.readFileSync("./cert/key.pem"),
      cert: fs.readFileSync("./cert/cert.pem"),
    },
  },
});
