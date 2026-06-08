// prisma/seed.js
// Isi database dengan data contoh untuk demo & testing
// Jalankan: node prisma/seed.js
//
// Web Advanced Development — P6

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hapus data lama dulu (urutan penting! hapus Product dulu baru Category)
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  console.log("   ✓ Data lama dihapus");

  // ── Buat Categories ──────────────────────────────────────
  const electronics = await prisma.category.create({
    data: { name: "Electronics" },
  });
  const fashion = await prisma.category.create({
    data: { name: "Fashion" },
  });
  const food = await prisma.category.create({
    data: { name: "Food & Beverage" },
  });
  console.log("   ✓ 3 categories dibuat");

  // ── Buat Products (pakai categoryId dari category di atas) ─
  await prisma.product.createMany({
    data: [
      // Electronics
      { name: "iPhone 15 Pro",        price: 19999000, stock: 25,  categoryId: electronics.id },
      { name: "Samsung Galaxy S24",   price: 14999000, stock: 30,  categoryId: electronics.id },
      { name: "MacBook Air M3",       price: 21999000, stock: 10,  categoryId: electronics.id },
      { name: "Xiaomi Redmi Note 13", price:  2999000, stock: 100, categoryId: electronics.id },

      // Fashion
      { name: "Kemeja Oxford Putih",  price:   299000, stock: 50,  categoryId: fashion.id },
      { name: "Celana Chino Navy",    price:   349000, stock: 40,  categoryId: fashion.id },
      { name: "Sepatu Sneakers Putih",price:   599000, stock: 35,  categoryId: fashion.id },

      // Food & Beverage
      { name: "Kopi Arabika 250g",    price:    89000, stock: 200, categoryId: food.id },
      { name: "Teh Hijau Premium",    price:    65000, stock: 150, categoryId: food.id },
      { name: "Granola Bar Coklat",   price:    45000, stock: 300, categoryId: food.id },
    ],
  });
  console.log("   ✓ 10 products dibuat");

  console.log("");
  console.log("✅ Seeding selesai!");
  console.log("   Coba GET /categories atau GET /products di Postman.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
