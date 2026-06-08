// prisma.config.js
// Konfigurasi Prisma 7 — letaknya HARUS di root project (sejajar package.json)
//
// Di Prisma 7, url DATABASE tidak lagi ditulis di schema.prisma,
// tapi dipindah ke file ini.
//
// Rename ke prisma.config.mjs jika dapat error "import not supported"

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema-v7.prisma",
  datasource: {
    url: env("DATABASE_URL"),   // ← DATABASE_URL tetap dari .env seperti biasa
  },
});
