// prisma/seed.js
// Seeding data awal untuk aplikasi Gym Workout & Weight Tracker
// Jalankan: node prisma/seed.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hapus data lama (urutan penting untuk menghindari constraint error)
  await prisma.weightLog.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.workoutDay.deleteMany();
  await prisma.user.deleteMany();
  console.log("   ✓ Data lama berhasil dibersihkan");

  // 1. Buat User Contoh
  const hashedPassword = await bcrypt.hash("password123", 10);
  const user = await prisma.user.create({
    data: {
      username: "fabio",
      email: "fabio@example.com",
      password: hashedPassword,
    },
  });
  console.log(`   ✓ User '${user.username}' berhasil dibuat`);

  // 2. Buat Workout Days (Workout Splits)
  const pushDay = await prisma.workoutDay.create({
    data: {
      dayName: "Push Day (Dada, Bahu, Trisep)",
      userId: user.id,
    },
  });

  const pullDay = await prisma.workoutDay.create({
    data: {
      dayName: "Pull Day (Punggung, Bisep)",
      userId: user.id,
    },
  });

  const legDay = await prisma.workoutDay.create({
    data: {
      dayName: "Leg Day (Kaki, Core)",
      userId: user.id,
    },
  });
  console.log("   ✓ 3 Workout Day (kategori hari latihan) berhasil dibuat");

  // 3. Buat Latihan (Exercises)
  // Push Day Exercises
  await prisma.exercise.createMany({
    data: [
      { exerciseName: "Flat Barbell Bench Press", sets: 4, reps: 10, weightKg: 60.0, workoutDayId: pushDay.id },
      { exerciseName: "Seated Dumbbell Shoulder Press", sets: 3, reps: 12, weightKg: 15.0, workoutDayId: pushDay.id },
      { exerciseName: "Tricep Pushdown (Cable)", sets: 3, reps: 15, weightKg: 20.0, workoutDayId: pushDay.id },
    ],
  });

  // Pull Day Exercises
  await prisma.exercise.createMany({
    data: [
      { exerciseName: "Lat Pulldown", sets: 4, reps: 12, weightKg: 50.0, workoutDayId: pullDay.id },
      { exerciseName: "Bent Over Barbell Row", sets: 3, reps: 10, weightKg: 45.0, workoutDayId: pullDay.id },
      { exerciseName: "Incline Dumbbell Curl", sets: 3, reps: 12, weightKg: 10.0, workoutDayId: pullDay.id },
    ],
  });

  // Leg Day Exercises
  await prisma.exercise.createMany({
    data: [
      { exerciseName: "Barbell Back Squat", sets: 4, reps: 8, weightKg: 80.0, workoutDayId: legDay.id },
      { exerciseName: "Romanian Deadlift", sets: 3, reps: 10, weightKg: 60.0, workoutDayId: legDay.id },
      { exerciseName: "Standing Calf Raises", sets: 4, reps: 15, weightKg: 40.0, workoutDayId: legDay.id },
    ],
  });
  console.log("   ✓ Daftar latihan default berhasil ditambahkan ke masing-masing hari");

  // 4. Buat Log Berat Badan (Weight Logs)
  const now = new Date();
  await prisma.weightLog.createMany({
    data: [
      { weight: 75.0, logDate: new Date(new Date().setDate(now.getDate() - 6)), userId: user.id },
      { weight: 74.8, logDate: new Date(new Date().setDate(now.getDate() - 5)), userId: user.id },
      { weight: 74.9, logDate: new Date(new Date().setDate(now.getDate() - 4)), userId: user.id },
      { weight: 74.5, logDate: new Date(new Date().setDate(now.getDate() - 3)), userId: user.id },
      { weight: 74.7, logDate: new Date(new Date().setDate(now.getDate() - 2)), userId: user.id },
      { weight: 74.2, logDate: new Date(new Date().setDate(now.getDate() - 1)), userId: user.id },
      { weight: 74.0, logDate: now, userId: user.id },
    ],
  });
  console.log("   ✓ Histori berat badan 7 hari terakhir berhasil dicatat");

  console.log("\n✅ Seeding selesai! Gunakan akun ini untuk testing:");
  console.log("   Username: fabio");
  console.log("   Password: password123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
