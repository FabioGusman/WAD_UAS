# GymProgress (UAS Web Advanced Development)

Ini adalah implementasi aplikasi web full-stack Sistem Latihan Gym dan Progres Kebugaran Mandiri Berbasis Web dengan arsitektur decoupled (terpisah antara frontend & backend). Proyek ini dibangun menggunakan Node.js, Express, React.js (Vite), Prisma ORM (versi 5.x), dan database MySQL (WSL).

---

## Setup Proyek

Ikuti langkah-langkah di bawah ini untuk menyiapkan dan menjalankan proyek ini di lingkungan lokal Anda.

### 1. Kloning Repositori (Jika dari Git)
Jika Anda mendapatkan proyek ini dari repositori Git, kloning terlebih dahulu:
```bash
git clone <URL_REPO_ANDA>
cd WAD
```

### 2. Jalankan WSL & MySQL
Pastikan WSL Anda telah berjalan dan service MySQL di dalamnya telah aktif. Secara default, database MySQL di dalam WSL mendengarkan pada port **3307** (port WSL default Anda).

### 3. Instal Dependensi & Konfigurasi Backend
Masuk ke folder backend proyek dan instal semua dependensi Node.js yang diperlukan:
```cmd
cd backend
npm install
```

Buat file `.env` di root folder `backend/` Anda dan tambahkan `DATABASE_URL` untuk koneksi MySQL WSL Anda serta `JWT_SECRET` untuk keamanan token:
```env
DATABASE_URL="mysql://root:Bi3214@127.0.0.1:3307/shop_api_db"
JWT_SECRET="supersecretgymkey123"
```
*Penting: File `.env` ini telah dikonfigurasi di dalam `.gitignore` agar tidak ter-commit ke kontrol versi.*

### 4. Sinkronisasi Database
Jalankan sinkronisasi database menggunakan Prisma untuk membuat skema tabel di MySQL Anda. Ini akan membuat tabel `User`, `WorkoutDay`, `Exercise`, dan `WeightLog`:
```cmd
npx prisma db push --accept-data-loss
```

### 5. Seed Database (Data Awal)
Isi database dengan data akun uji coba default, jadwal olahraga, dan log berat badan awal yang telah disediakan:
```cmd
node prisma/seed.js
```
*Hasil Seeding:*
- **Username**: `fabio`
- **Password**: `password123`

### 6. Jalankan Server Backend
Mulai server aplikasi backend:
```cmd
npm run dev
```
Server backend akan berjalan di **`http://localhost:3000`**.

### 7. Instal Dependensi & Jalankan Frontend React
Buka terminal baru, masuk ke folder frontend, instal dependensi, lalu jalankan server React (Vite):
```cmd
cd frontend
npm install
npm run dev
```
Server frontend akan berjalan di **`http://localhost:5173`**. Buka alamat tersebut di browser Anda untuk mencoba aplikasi.

---

## Endpoint API

Berikut adalah daftar endpoint API yang tersedia (API Backend berjalan mandiri/standalone):

### Autentikasi & Akun (Publik)
- **`POST /api/auth/register`**  
  Mendaftarkan pengguna baru. Membutuhkan `username`, `email`, dan `password`.
- **`POST /api/auth/login`**  
  Melakukan login dan mengembalikan token JWT untuk akses endpoint terproteksi.
- **`GET /api/users`**  
  Mengambil semua akun pengguna terdaftar (khusus kebutuhan pengujian/admin).

### Hari Latihan / Workout Days (Butuh Token JWT)
- **`GET /api/workouts`**  
  Mengambil semua kategori hari latihan (*workout split*) milik pengguna yang login.
- **`POST /api/workouts`**  
  Membuat hari latihan baru. Membutuhkan `day_name` (contoh: *Push Day*).
- **`DELETE /api/workouts/:id`**  
  Menghapus kategori hari latihan tertentu beserta seluruh gerakan latihan di dalamnya.

### Gerakan Latihan / Exercises (Butuh Token JWT)
- **`GET /api/workouts/:day_id/exercises`**  
  Mengambil daftar gerakan latihan pada hari latihan tertentu.
- **`POST /api/exercises`**  
  Menambahkan gerakan baru ke hari latihan. Membutuhkan `workout_day_id`, `exercise_name`, `sets`, `reps`, dan `weight_kg`.
- **`PUT /api/exercises/:id`**  
  Memperbarui sets, reps, atau beban dari gerakan latihan tertentu (*progressive overload*).
- **`DELETE /api/exercises/:id`**  
  Menghapus satu gerakan latihan berdasarkan ID.

### Log Berat Badan / Weight Logs (Butuh Token JWT)
- **`GET /api/weights`**  
  Mengambil histori perkembangan berat badan pengguna untuk visualisasi grafik.
- **`POST /api/weights`**  
  Mencatat log berat badan baru. Membutuhkan `weight` (log_date bersifat opsional, default hari ini).
- **`DELETE /api/weights/:id`**  
  Menghapus log berat badan tertentu berdasarkan ID.

---

## Catatan Penting
- Proyek ini menggunakan arsitektur **Decoupled API** di mana frontend React dan backend Express terpisah dan saling terhubung melalui **CORS**.
- Keamanan otentikasi menggunakan token JWT. Pastikan Anda memasukkan Header `Authorization: Bearer <token_anda>` di Postman saat menguji request dalam kategori terproteksi.
- Anda dapat mengimpor berkas **`dokumentasi/Gym_Tracker_API.postman_collection.json`** langsung ke aplikasi Postman Anda untuk melakukan pengujian instan.
- Berkas `node_modules/` dan `.env` sudah aman terdaftar di `.gitignore` untuk mencegah kebocoran credentials.
