# Shop API — Setup & Migration Guide
## Web Advanced Development — P6 · Category → Product (One-to-Many)

---

## Konsep Relasi yang Dipakai

```
Category (1) ──────────── (many) Product
  id                              id
  name                            name
  createdAt                       price
                                  stock
                                  categoryId  ← foreign key
                                  createdAt
                                  updatedAt
```

**Foreign key selalu ada di sisi "many".**
Satu product hanya bisa punya satu category,
tapi satu category bisa punya banyak product.

---

## 1. Setup Awal

```bash
# Masuk ke folder project
cd shop-api

# Install semua dependencies
npm install
```

---

## 2. Buat Database

### PostgreSQL
```sql
CREATE DATABASE shop_api_db;
```

### MySQL
```sql
CREATE DATABASE shop_api_db;
```

---

## 3. Konfigurasi .env

```bash
# Edit file .env:
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/shop_api_db"

# MySQL:
# DATABASE_URL="mysql://root:PASSWORD@localhost:3306/shop_api_db"
```

---

## 4. Migration Pertama — Buat Tabel

```bash
npx prisma migrate dev --name init
```

Output yang diharapkan:
```
✔ Generated migration: 20250101000000_init
✔ Applied migration to database
✔ Generated Prisma Client
```

SQL yang di-generate Prisma (ada di prisma/migrations/.../migration.sql):
```sql
CREATE TABLE "Category" (
    "id"        SERIAL PRIMARY KEY,
    "name"      TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Product" (
    "id"         SERIAL PRIMARY KEY,
    "name"       TEXT NOT NULL,
    "price"      DOUBLE PRECISION NOT NULL,
    "stock"      INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP NOT NULL,
    "categoryId" INTEGER NOT NULL,
    -- Foreign key constraint otomatis dibuat Prisma:
    CONSTRAINT "Product_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
);
```

---

## 5. Isi Data Awal (Seed)

```bash
node prisma/seed.js
```

Output:
```
🌱 Seeding database...
   ✓ Data lama dihapus
   ✓ 3 categories dibuat
   ✓ 10 products dibuat

✅ Seeding selesai!
```

---

## 6. Jalankan Server

```bash
# Development (auto-restart):
npm run dev

# atau langsung:
node src/index.js
```

---

## 7. Cek di Prisma Studio

```bash
npx prisma studio
# → buka http://localhost:5555
# Lihat tabel Category dan Product, cek foreign key categoryId
```

---

## Workflow Kalau Schema Berubah

Contoh: tambah kolom `description` ke Product

```bash
# 1. Edit prisma/schema.prisma
#    Tambahkan di model Product:
#      description String?   ← tanda ? = opsional (nullable)

# 2. Jalankan migration baru
npx prisma migrate dev --name add_description_to_product

# 3. Prisma Client otomatis terupdate
#    Kolom description langsung bisa dipakai di kode
```

---

## Contoh Query Relasi di Prisma

```javascript
// ── include: ambil data relasi sekalian ─────────────────────

// Ambil semua produk beserta nama category-nya:
await prisma.product.findMany({
  include: { category: true }
});
// → [{ id: 1, name: "iPhone 15", ..., category: { id: 1, name: "Electronics" } }]


// Ambil category beserta semua produknya:
await prisma.category.findUnique({
  where: { id: 1 },
  include: { products: true }
});
// → { id: 1, name: "Electronics", products: [ {...}, {...} ] }


// Hitung jumlah produk per category:
await prisma.category.findMany({
  include: {
    _count: { select: { products: true } }
  }
});
// → [{ id: 1, name: "Electronics", _count: { products: 4 } }]


// ── select: pilih field tertentu saja ───────────────────────
await prisma.product.findMany({
  select: {
    name: true,
    price: true,
    category: { select: { name: true } }  // hanya nama category
  }
});
// → [{ name: "iPhone 15", price: 19999000, category: { name: "Electronics" } }]


// ── where dengan relasi ─────────────────────────────────────
// Filter produk berdasarkan nama category:
await prisma.product.findMany({
  where: {
    category: { name: "Electronics" }
  }
});
```

---

## Command Reference

| Command | Fungsi |
|---------|--------|
| `npx prisma migrate dev --name <nama>` | Buat & jalankan migration baru |
| `npx prisma migrate status` | Cek status semua migration |
| `npx prisma migrate reset --force` | Reset DB & jalankan ulang semua migration |
| `npx prisma generate` | Regenerate Prisma Client |
| `npx prisma studio` | GUI database di browser |
| `node prisma/seed.js` | Isi data awal |

---

## Postman Test Sequence

Ikuti urutan ini — Category harus dibuat dulu sebelum Product:

```
1. POST   /categories         { "name": "Electronics" }   → 201
2. POST   /categories         { "name": "Fashion" }        → 201
3. GET    /categories                                       → list 2 category
4. POST   /products           { "name": "iPhone 15", "price": 19999000, "stock": 25, "categoryId": 1 }  → 201
5. POST   /products           { "name": "Kemeja Putih", "price": 299000, "stock": 50, "categoryId": 2 } → 201
6. GET    /products                                         → list 2 produk + nama category
7. GET    /categories/1                                     → Electronics + semua produknya
8. PUT    /products/1         { "stock": 20 }               → update stok
9. DELETE /products/1                                       → 204
10. DELETE /categories/1                                    → 204 (kosong, bisa dihapus)
11. DELETE /categories/2                                    → 400 (masih ada produk!)
```

---

## Troubleshooting

| Error | Solusi |
|-------|--------|
| `P2003: Foreign key constraint failed` | categoryId yang dikirim tidak ada di tabel Category |
| `P2002: Unique constraint failed` | Nama category sudah ada |
| `P2025: Record not found` | id tidak ada di database |
| `400: Tidak bisa hapus — masih ada N produk` | Hapus/pindahkan produk dulu sebelum hapus category |
