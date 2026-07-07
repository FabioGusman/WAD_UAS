// src/index-v7.js
// Shop API — versi Prisma 7
//
// PERBEDAAN dari index.js (Prisma 5):
//   1. Import PrismaClient dari './generated/prisma', bukan '@prisma/client'
//   2. Driver adapter wajib dipakai — Prisma 7 tidak bisa konek DB tanpa adapter
//   3. PrismaClient menerima { adapter } sebagai argument
//
// Setup:
//   npm install @prisma/adapter-mariadb
//   npx prisma generate --schema=prisma/schema-v7.prisma
//   node src/index-v7.js

const express = require("express");

// ↓ Prisma 7: import dari generated path
const { PrismaClient } = require("./generated/prisma");

// ↓ Prisma 7: driver adapter wajib — pakai mariadb adapter untuk MySQL
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

// Parse DATABASE_URL supaya adapter bisa pakai env yang sama
// Format: mysql://user:password@host:3306/database
const dbUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host:            dbUrl.hostname,
  port:            parseInt(dbUrl.port || "3306"),
  user:            dbUrl.username,
  password:        dbUrl.password,
  database:        dbUrl.pathname.slice(1), // hapus "/" di depan
  connectionLimit: 5,
});

// ↓ Prisma 7: adapter dipass ke constructor
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ════════════════════════════════════════════════════════════
//  CATEGORY ENDPOINTS
// ════════════════════════════════════════════════════════════

app.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    });
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!category)
      return res.status(404).json({ error: "Category tidak ditemukan" });

    res.json(category);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/categories", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "")
      return res.status(400).json({ error: "name wajib diisi" });

    const category = await prisma.category.create({
      data: { name: name.trim() },
    });
    res.status(201).json(category);
  } catch (e) {
    if (e.code === "P2002")
      return res.status(409).json({ error: "Nama category sudah dipakai" });
    res.status(500).json({ error: e.message });
  }
});

app.delete("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0)
      return res.status(400).json({
        error: `Tidak bisa hapus — masih ada ${productCount} produk di category ini`,
      });

    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ error: "Category tidak ditemukan" });
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
//  PRODUCT ENDPOINTS
// ════════════════════════════════════════════════════════════

app.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product)
      return res.status(404).json({ error: "Produk tidak ditemukan" });

    res.json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/products", async (req, res) => {
  try {
    const { name, price, stock, categoryId } = req.body;

    if (!name || name.trim() === "")
      return res.status(400).json({ error: "name wajib diisi" });
    if (price === undefined || price < 0)
      return res.status(400).json({ error: "price wajib diisi dan tidak boleh negatif" });
    if (!categoryId)
      return res.status(400).json({ error: "categoryId wajib diisi" });

    const categoryExists = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
    });
    if (!categoryExists)
      return res.status(404).json({ error: "Category tidak ditemukan" });

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        price,
        stock: stock ?? 0,
        categoryId: parseInt(categoryId),
      },
      include: { category: true },
    });

    res.status(201).json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, price, stock, categoryId } = req.body;

    if (name === undefined && price === undefined &&
        stock === undefined && categoryId === undefined)
      return res.status(400).json({ error: "Kirim minimal satu field untuk diupdate" });

    if (categoryId !== undefined) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });
      if (!categoryExists)
        return res.status(404).json({ error: "Category tidak ditemukan" });
    }

    const data = {};
    if (name       !== undefined) data.name       = name.trim();
    if (price      !== undefined) data.price      = price;
    if (stock      !== undefined) data.stock      = stock;
    if (categoryId !== undefined) data.categoryId = parseInt(categoryId);

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });

    res.json(updated);
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    res.status(500).json({ error: e.message });
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (e) {
    if (e.code === "P2025")
      return res.status(404).json({ error: "Produk tidak ditemukan" });
    res.status(500).json({ error: e.message });
  }
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Shop API (Prisma 7) running on http://localhost:${PORT}`);
});
