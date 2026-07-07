const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("./middleware/auth");

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretgymkey123";

// Middleware
app.use(cors());
app.use(express.json());



// ════════════════════════════════════════════════════════════
//  AUTH ENDPOINTS
// ════════════════════════════════════════════════════════════

// 1. Register User Baru
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, dan password wajib diisi." });
    }

    // Periksa apakah username atau email sudah terdaftar
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: email.trim().toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: "Username atau email sudah digunakan." });
    }

    // Enkripsi password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword
      }
    });

    // Buat token JWT otomatis untuk langsung login
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });

    res.status(201).json({
      message: "Registrasi berhasil.",
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Login User
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username dan password wajib diisi." });
    }

    // Cari user berdasarkan username
    const user = await prisma.user.findUnique({
      where: { username: username.trim() }
    });

    if (!user) {
      return res.status(401).json({ error: "Username atau password salah." });
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Username atau password salah." });
    }

    // Generate token JWT
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Lihat Semua User (Kebutuhan Pengujian/Admin)
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      },
      orderBy: { id: "asc" }
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
//  WORKOUT DAYS ENDPOINTS (BR-1)
// ════════════════════════════════════════════════════════════

// 1. Lihat semua daftar hari latihan (workout split) milik user yang login
app.get("/api/workouts", authenticateToken, async (req, res) => {
  try {
    const workouts = await prisma.workoutDay.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "asc" }
    });
    res.json(workouts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Membuat kategori hari latihan baru
app.post("/api/workouts", authenticateToken, async (req, res) => {
  try {
    const { day_name } = req.body;

    if (!day_name || day_name.trim() === "") {
      return res.status(400).json({ error: "Nama hari latihan (day_name) wajib diisi." });
    }

    const workoutDay = await prisma.workoutDay.create({
      data: {
        dayName: day_name.trim(),
        userId: req.user.id
      }
    });

    // Output yang diharapkan sesuai proposal: { workout_day }
    res.status(201).json({ workout_day: workoutDay });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Menghapus kategori hari latihan beserta seluruh gerakan di dalamnya (cascade)
app.delete("/api/workouts/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Pastikan hari latihan ini milik user yang login
    const workoutDay = await prisma.workoutDay.findUnique({
      where: { id }
    });

    if (!workoutDay) {
      return res.status(404).json({ error: "Hari latihan tidak ditemukan." });
    }

    if (workoutDay.userId !== req.user.id) {
      return res.status(403).json({ error: "Akses ditolak. Ini bukan kategori Anda." });
    }

    await prisma.workoutDay.delete({
      where: { id }
    });

    res.json({ message: "Hari latihan berhasil dihapus." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
//  EXERCISES ENDPOINTS (BR-2)
// ════════════════════════════════════════════════════════════

// 1. Lihat semua daftar gerakan yang ada di hari latihan tertentu
app.get("/api/workouts/:day_id/exercises", authenticateToken, async (req, res) => {
  try {
    const dayId = parseInt(req.params.day_id);

    // Pastikan hari latihan ini milik user yang login
    const workoutDay = await prisma.workoutDay.findUnique({
      where: { id: dayId }
    });

    if (!workoutDay) {
      return res.status(404).json({ error: "Hari latihan tidak ditemukan." });
    }

    if (workoutDay.userId !== req.user.id) {
      return res.status(403).json({ error: "Akses ditolak." });
    }

    const exercises = await prisma.exercise.findMany({
      where: { workoutDayId: dayId },
      orderBy: { createdAt: "asc" }
    });

    // Mapped sesuai struktur di proposal: [{ id, exercise_name, sets, reps, weight_kg }]
    const mapped = exercises.map(ex => ({
      id: ex.id,
      exercise_name: ex.exerciseName,
      sets: ex.sets,
      reps: ex.reps,
      weight_kg: ex.weightKg
    }));

    res.json(mapped);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Menambahkan gerakan baru ke dalam hari latihan tertentu
app.post("/api/exercises", authenticateToken, async (req, res) => {
  try {
    const { workout_day_id, exercise_name, sets, reps, weight_kg } = req.body;

    if (!workout_day_id || !exercise_name || sets === undefined || reps === undefined || weight_kg === undefined) {
      return res.status(400).json({ error: "workout_day_id, exercise_name, sets, reps, dan weight_kg wajib diisi." });
    }

    // Pastikan hari latihan ini milik user yang login
    const workoutDay = await prisma.workoutDay.findUnique({
      where: { id: parseInt(workout_day_id) }
    });

    if (!workoutDay) {
      return res.status(404).json({ error: "Hari latihan tidak ditemukan." });
    }

    if (workoutDay.userId !== req.user.id) {
      return res.status(403).json({ error: "Akses ditolak." });
    }

    const exercise = await prisma.exercise.create({
      data: {
        exerciseName: exercise_name.trim(),
        sets: parseInt(sets),
        reps: parseInt(reps),
        weightKg: parseFloat(weight_kg),
        workoutDayId: parseInt(workout_day_id)
      }
    });

    // Output yang diharapkan sesuai proposal: { exercise }
    res.status(201).json({
      exercise: {
        id: exercise.id,
        exercise_name: exercise.exerciseName,
        sets: exercise.sets,
        reps: exercise.reps,
        weight_kg: exercise.weightKg,
        workout_day_id: exercise.workoutDayId
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Memperbarui jumlah set, reps, atau beban dari gerakan tertentu
app.put("/api/exercises/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { sets, reps, weight_kg } = req.body;

    // Pastikan gerakan ini milik user yang login (cek via WorkoutDay)
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: { workoutDay: true }
    });

    if (!exercise) {
      return res.status(404).json({ error: "Gerakan latihan tidak ditemukan." });
    }

    if (exercise.workoutDay.userId !== req.user.id) {
      return res.status(403).json({ error: "Akses ditolak." });
    }

    const data = {};
    if (sets !== undefined) data.sets = parseInt(sets);
    if (reps !== undefined) data.reps = parseInt(reps);
    if (weight_kg !== undefined) data.weightKg = parseFloat(weight_kg);

    const updated = await prisma.exercise.update({
      where: { id },
      data
    });

    res.json({
      exercise: {
        id: updated.id,
        exercise_name: updated.exerciseName,
        sets: updated.sets,
        reps: updated.reps,
        weight_kg: updated.weightKg,
        workout_day_id: updated.workoutDayId
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Menghapus gerakan dari daftar latihan
app.delete("/api/exercises/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Pastikan gerakan ini milik user yang login
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: { workoutDay: true }
    });

    if (!exercise) {
      return res.status(404).json({ error: "Gerakan latihan tidak ditemukan." });
    }

    if (exercise.workoutDay.userId !== req.user.id) {
      return res.status(403).json({ error: "Akses ditolak." });
    }

    await prisma.exercise.delete({
      where: { id }
    });

    // Output yang diharapkan sesuai proposal: { message: "Exercise deleted" }
    res.json({ message: "Exercise deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ════════════════════════════════════════════════════════════
//  WEIGHT LOGS ENDPOINTS (BR-3)
// ════════════════════════════════════════════════════════════

// 1. Ambil histori berat badan milik user
app.get("/api/weights", authenticateToken, async (req, res) => {
  try {
    const weights = await prisma.weightLog.findMany({
      where: { userId: req.user.id },
      orderBy: { logDate: "asc" }
    });
    res.json(weights);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. User menginput log berat badan baru
app.post("/api/weights", authenticateToken, async (req, res) => {
  try {
    const { weight, log_date } = req.body;

    if (weight === undefined || parseFloat(weight) <= 0) {
      return res.status(400).json({ error: "Berat badan (weight) wajib diisi dengan nilai positif." });
    }

    const logDate = log_date ? new Date(log_date) : new Date();

    const weightLog = await prisma.weightLog.create({
      data: {
        weight: parseFloat(weight),
        logDate: logDate,
        userId: req.user.id
      }
    });

    // Output yang diharapkan sesuai proposal: { weight_log }
    res.status(201).json({ weight_log: weightLog });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Menghapus log berat badan tertentu
app.delete("/api/weights/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Pastikan log berat badan ini milik user yang login
    const weightLog = await prisma.weightLog.findUnique({
      where: { id }
    });

    if (!weightLog) {
      return res.status(404).json({ error: "Log berat badan tidak ditemukan." });
    }

    if (weightLog.userId !== req.user.id) {
      return res.status(403).json({ error: "Akses ditolak." });
    }

    await prisma.weightLog.delete({
      where: { id }
    });

    res.json({ message: "Log berat badan berhasil dihapus." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Gym Tracker API running on http://localhost:${PORT}`);
});
