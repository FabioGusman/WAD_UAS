// src/index.js
// Shop API — Category & Product dengan relasi One-to-Many
// Web Advanced Development — P6
//
// Endpoint:
//   Categories:
//     GET    /categories              → list semua category (+ jumlah produk)
//     GET    /categories/:id          → detail category + semua produknya
//     POST   /categories              → buat category baru
//     DELETE /categories/:id          → hapus category
//
//   Products:
//     GET    /products                → list semua produk (+ nama category)
//     GET    /products/:id            → detail produk (+ category)
//     POST   /products                → buat produk baru (wajib kirim categoryId)
//     PUT    /products/:id            → update produk
//     DELETE /products/:id            → hapus produk

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ════════════════════════════════════════════════════════════
//  CATEGORY ENDPOINTS
// ════════════════════════════════════════════════════════════

// GET /categories
// List semua category — tiap category disertai jumlah produknya
app.get("/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true }, // hitung jumlah produk per category
        },
      },
    });
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /categories/:id
// Detail satu category — sekalian tampilkan semua produknya
app.get("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {                         // ← ini kekuatan relasi Prisma
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!category)
      return res.status(404).json({ error: "Category tidak ditemukan" });

    res.json(category);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /categories
// Buat category baru
// Body: { "name": "Electronics" }
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
    // P2002 = unique constraint failed (nama category sudah ada)
    if (e.code === "P2002")
      return res.status(409).json({ error: "Nama category sudah dipakai" });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /categories/:id
// Hapus category — akan gagal kalau masih ada produk di dalamnya
app.delete("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Cek dulu: masih ada produk tidak?
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

// GET /products
// List semua produk — tiap produk disertai nama category-nya
app.get("/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: true, // ← join ke tabel Category secara otomatis
      },
    });
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /products/:id
// Detail satu produk beserta data category-nya
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

// POST /products
// Buat produk baru — categoryId wajib ada dan valid
// Body: { "name": "iPhone 15", "price": 15000000, "stock": 10, "categoryId": 1 }
app.post("/products", async (req, res) => {
  try {
    const { name, price, stock, categoryId } = req.body;

    // Validasi field wajib
    if (!name || name.trim() === "")
      return res.status(400).json({ error: "name wajib diisi" });
    if (price === undefined || price < 0)
      return res.status(400).json({ error: "price wajib diisi dan tidak boleh negatif" });
    if (!categoryId)
      return res.status(400).json({ error: "categoryId wajib diisi" });

    // Cek apakah category-nya ada
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
      include: { category: true }, // langsung return data category-nya juga
    });

    res.status(201).json(product);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /products/:id
// Update produk — semua field opsional kecuali minimal satu
// Body: { "price": 14000000 } atau { "stock": 5, "name": "iPhone 15 Pro" }
app.put("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, price, stock, categoryId } = req.body;

    if (name === undefined && price === undefined &&
        stock === undefined && categoryId === undefined)
      return res.status(400).json({ error: "Kirim minimal satu field untuk diupdate" });

    // Kalau categoryId dikirim, pastikan category-nya ada
    if (categoryId !== undefined) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) },
      });
      if (!categoryExists)
        return res.status(404).json({ error: "Category tidak ditemukan" });
    }

    // Bangun data object — hanya field yang dikirim
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

// DELETE /products/:id
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
  console.log(`✅ Shop API running on http://localhost:${PORT}`);
  console.log(``);
  console.log(`  CATEGORIES`);
  console.log(`  GET    /categories`);
  console.log(`  GET    /categories/:id   (+ semua produknya)`);
  console.log(`  POST   /categories`);
  console.log(`  DELETE /categories/:id`);
  console.log(``);
  console.log(`  PRODUCTS`);
  console.log(`  GET    /products         (+ nama category)`);
  console.log(`  GET    /products/:id     (+ data category)`);
  console.log(`  POST   /products`);
  console.log(`  PUT    /products/:id`);
  console.log(`  DELETE /products/:id`);
});
