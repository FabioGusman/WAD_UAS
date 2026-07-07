// src/App.jsx
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import {
  Dumbbell,
  LogIn,
  User,
  UserPlus,
  Mail,
  Lock,
  Calendar,
  TrendingUp,
  LogOut,
  Plus,
  X,
  ClipboardList,
  Trash2,
  Edit3,
  Check,
  Scale,
  Activity,
  Loader,
  CalendarDays
} from 'lucide-react';

// Registrasi komponen Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = "http://localhost:3000/api";

function App() {
  // Sesi Autentikasi
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authAlert, setAuthAlert] = useState({ message: '', type: '' });

  // Navigasi Dasbor
  const [activePanel, setActivePanel] = useState('workout'); // 'workout' atau 'weight'

  // Data Workout Splits
  const [workouts, setWorkouts] = useState([]);
  const [workoutDayName, setWorkoutDayName] = useState('');
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);

  // Data Gerakan Latihan (Exercises)
  const [selectedWorkoutDay, setSelectedWorkoutDay] = useState(null); // { id, dayName }
  const [exercises, setExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [exerciseInput, setExerciseInput] = useState({
    exerciseName: '',
    sets: '',
    reps: '',
    weightKg: ''
  });

  // Inline Edit Gerakan
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [editExerciseInputs, setEditExerciseInputs] = useState({
    sets: '',
    reps: '',
    weightKg: ''
  });

  // Data Progres Berat Badan
  const [weightLogs, setWeightLogs] = useState([]);
  const [loadingWeights, setLoadingWeights] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightDateInput, setWeightDateInput] = useState(new Date().toISOString().split('T')[0]);

  // Global Toast Notification
  const [toast, setToast] = useState({ message: '', type: '', visible: false });

  // ════════════════════════════════════════════════════════════
  //  EFEK & INITIALIZATION
  // ════════════════════════════════════════════════════════════
  useEffect(() => {
    const storedUser = localStorage.getItem("gym_user");
    const storedToken = localStorage.getItem("gym_token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      if (activePanel === 'workout') {
        fetchWorkouts();
      } else if (activePanel === 'weight') {
        fetchWeightLogs();
      }
    }
  }, [token, activePanel]);

  // ════════════════════════════════════════════════════════════
  //  NOTIFIKASI & HEADERS
  // ════════════════════════════════════════════════════════════
  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const showAuthAlert = (message, type = 'danger') => {
    setAuthAlert({ message, type });
    setTimeout(() => {
      setAuthAlert({ message: '', type: '' });
    }, 4000);
  };

  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const formatDate = (dateStr, includeDayName = false) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    if (includeDayName) {
      options.weekday = 'long';
    }
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  };

  // ════════════════════════════════════════════════════════════
  //  AUTENTIKASI ACTIONS
  // ════════════════════════════════════════════════════════════
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const username = e.target.regUsername.value.trim();
    const email = e.target.regEmail.value.trim();
    const password = e.target.regPassword.value;

    if (password.length < 6) {
      showAuthAlert("Password minimal terdiri dari 6 karakter!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal melakukan registrasi.");

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("gym_user", JSON.stringify(data.user));
      localStorage.setItem("gym_token", data.token);

      showToast("Pendaftaran berhasil! Selamat datang.");
    } catch (err) {
      showAuthAlert(err.message);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const username = e.target.loginUsername.value.trim();
    const password = e.target.loginPassword.value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login gagal, silakan coba lagi.");

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("gym_user", JSON.stringify(data.user));
      localStorage.setItem("gym_token", data.token);

      showToast(`Halo, ${data.user.username}! Selamat berlatih.`);
    } catch (err) {
      showAuthAlert(err.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setSelectedWorkoutDay(null);
    setExercises([]);
    setWorkouts([]);
    setWeightLogs([]);
    localStorage.removeItem("gym_user");
    localStorage.removeItem("gym_token");
    showToast("Anda berhasil keluar akun.");
  };

  // ════════════════════════════════════════════════════════════
  //  WORKOUT SPLITS (BR-1)
  // ════════════════════════════════════════════════════════════
  const fetchWorkouts = async () => {
    setLoadingWorkouts(true);
    try {
      const res = await fetch(`${API_BASE}/workouts`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Gagal mengambil data hari latihan.");
      const data = await res.json();
      setWorkouts(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const handleAddWorkoutSubmit = async (e) => {
    e.preventDefault();
    if (!workoutDayName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/workouts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ day_name: workoutDayName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambahkan hari latihan.");

      setWorkoutDayName('');
      showToast(`Kategori ${data.workout_day.dayName} berhasil ditambahkan!`);
      fetchWorkouts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteWorkoutDay = async (id, dayName) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori '${dayName}'? Semua gerakan latihan di dalamnya juga akan terhapus secara permanen.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/workouts/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus hari latihan.");

      showToast("Kategori hari latihan berhasil dihapus.");
      if (selectedWorkoutDay && selectedWorkoutDay.id === id) {
        setSelectedWorkoutDay(null);
        setExercises([]);
      }
      fetchWorkouts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ════════════════════════════════════════════════════════════
  //  EXERCISES LOGGING (BR-2)
  // ════════════════════════════════════════════════════════════
  const openExercisesManager = (dayId, dayName) => {
    setSelectedWorkoutDay({ id: dayId, dayName });
    fetchExercises(dayId);
    setTimeout(() => {
      document.getElementById("exercises-manager-card")?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchExercises = async (dayId) => {
    setLoadingExercises(true);
    try {
      const res = await fetch(`${API_BASE}/workouts/${dayId}/exercises`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Gagal mengambil daftar gerakan latihan.");
      const data = await res.json();
      setExercises(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingExercises(false);
    }
  };

  const handleAddExerciseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWorkoutDay) return;

    try {
      const res = await fetch(`${API_BASE}/exercises`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          workout_day_id: selectedWorkoutDay.id,
          exercise_name: exerciseInput.exerciseName,
          sets: parseInt(exerciseInput.sets),
          reps: parseInt(exerciseInput.reps),
          weight_kg: parseFloat(exerciseInput.weightKg)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambahkan gerakan latihan.");

      setExerciseInput({ exerciseName: '', sets: '', reps: '', weightKg: '' });
      showToast(`Gerakan ${data.exercise.exercise_name} ditambahkan!`);
      fetchExercises(selectedWorkoutDay.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const startInlineEdit = (ex) => {
    setEditingExerciseId(ex.id);
    setEditExerciseInputs({
      sets: ex.sets,
      reps: ex.reps,
      weightKg: ex.weight_kg
    });
  };

  const saveInlineEdit = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/exercises/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          sets: parseInt(editExerciseInputs.sets),
          reps: parseInt(editExerciseInputs.reps),
          weight_kg: parseFloat(editExerciseInputs.weightKg)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui gerakan.");

      setEditingExerciseId(null);
      showToast("Gerakan berhasil diperbarui (Progressive Overload dicatat!).");
      fetchExercises(selectedWorkoutDay.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteExercise = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus gerakan latihan ini dari program?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/exercises/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus gerakan latihan.");

      showToast("Gerakan berhasil dihapus.");
      fetchExercises(selectedWorkoutDay.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ════════════════════════════════════════════════════════════
  //  WEIGHT LOGGING (BR-3)
  // ════════════════════════════════════════════════════════════
  const fetchWeightLogs = async () => {
    setLoadingWeights(true);
    try {
      const res = await fetch(`${API_BASE}/weights`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Gagal mengambil histori berat badan.");
      const data = await res.json();
      setWeightLogs(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoadingWeights(false);
    }
  };

  const handleAddWeightSubmit = async (e) => {
    e.preventDefault();
    if (!weightInput || parseFloat(weightInput) <= 0) return;

    try {
      const res = await fetch(`${API_BASE}/weights`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          weight: parseFloat(weightInput),
          log_date: weightDateInput
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan log berat badan.");

      setWeightInput('');
      setWeightDateInput(new Date().toISOString().split('T')[0]);
      showToast(`Log berat badan ${data.weight_log.weight} Kg berhasil disimpan!`);
      fetchWeightLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteWeightLog = async (id) => {
    if (!confirm("Hapus catatan log berat badan ini?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/weights/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus log berat badan.");

      showToast("Log berat badan telah dihapus.");
      fetchWeightLogs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ════════════════════════════════════════════════════════════
  //  CHART DATA PREPARATION (Chart.js)
  // ════════════════════════════════════════════════════════════
  const sortedWeights = [...weightLogs].sort((a, b) => new Date(a.logDate) - new Date(b.logDate));
  const chartData = {
    labels: sortedWeights.map(d => formatDate(d.logDate)),
    datasets: [{
      label: 'Berat Badan (Kg)',
      data: sortedWeights.map(d => d.weight),
      borderColor: '#00bbf9',
      backgroundColor: 'rgba(0, 187, 249, 0.05)',
      borderWidth: 3,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#00bbf9',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
      tension: 0.35,
      fill: true
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
        bodyFont: { family: 'Outfit', size: 14 },
        padding: 12,
        borderColor: 'rgba(0, 187, 249, 0.3)',
        borderWidth: 1,
        displayColors: false,
        callbacks: {
          label: (context) => `Berat: ${context.parsed.y} Kg`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' },
        ticks: {
          color: '#9ca3af',
          font: { family: 'Outfit', size: 11 },
          callback: (value) => `${value} Kg`
        }
      }
    }
  };

  // ════════════════════════════════════════════════════════════
  //  JSX RENDER
  // ════════════════════════════════════════════════════════════
  
  // RENDER AUTH (LOGIN & REGISTER)
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo">
              <Dumbbell className="logo-icon" />
              <span>GymProgress</span>
            </div>
            <p>
              {isRegistering 
                ? "Buat akun baru untuk mulai mencatat progres kebugaran" 
                : "Mulai catat latihan dan pantau progres kebugaran mandiri Anda"}
            </p>
          </div>

          {!isRegistering ? (
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <h2 className="form-title">Masuk ke Akun</h2>
              <div className="input-group">
                <label htmlFor="loginUsername"><User /> Username</label>
                <input type="text" id="loginUsername" name="loginUsername" placeholder="Masukkan username Anda" required />
              </div>
              <div className="input-group">
                <label htmlFor="loginPassword"><Lock /> Password</label>
                <input type="password" id="loginPassword" name="loginPassword" placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                <span>Masuk</span> <LogIn size={18} />
              </button>
              <p className="auth-switch">
                Belum punya akun? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegistering(true); }}>Daftar sekarang</a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="auth-form">
              <h2 className="form-title">Daftar Akun Baru</h2>
              <div className="input-group">
                <label htmlFor="regUsername"><User /> Username</label>
                <input type="text" id="regUsername" name="regUsername" placeholder="Pilih username unik" required />
              </div>
              <div className="input-group">
                <label htmlFor="regEmail"><Mail /> Email</label>
                <input type="email" id="regEmail" name="regEmail" placeholder="nama@email.com" required />
              </div>
              <div className="input-group">
                <label htmlFor="regPassword"><Lock /> Password</label>
                <input type="password" id="regPassword" name="regPassword" placeholder="Minimal 6 karakter" required />
              </div>
              <button type="submit" className="btn btn-accent btn-block">
                <span>Daftar Akun</span> <UserPlus size={18} />
              </button>
              <p className="auth-switch">
                Sudah punya akun? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegistering(false); }}>Masuk disini</a>
              </p>
            </form>
          )}

          {authAlert.message && (
            <div className={`alert alert-${authAlert.type}`}>
              {authAlert.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  // RENDER MAIN DASHBOARD
  return (
    <div className="dashboard-wrapper">
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Dumbbell className="logo-icon" />
          <span>GymProgress</span>
        </div>
        <div className="user-profile">
          <div className="avatar">
            <User size={18} />
          </div>
          <div className="user-info">
            <span className="username">{user?.username || "User"}</span>
            <span className="user-role">Mandiri Member</span>
          </div>
        </div>
        <nav className="sidebar-menu">
          <a
            href="#"
            className={`menu-item ${activePanel === 'workout' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActivePanel('workout'); }}
          >
            <Calendar size={20} /> <span>Jadwal Latihan</span>
          </a>
          <a
            href="#"
            className={`menu-item ${activePanel === 'weight' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActivePanel('weight'); }}
          >
            <TrendingUp size={20} /> <span>Progres Berat Badan</span>
          </a>
        </nav>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn btn-outline btn-block">
            <LogOut size={16} /> <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="content-header">
          <h1>
            {activePanel === 'workout' 
              ? "Jadwal Kategori Latihan (Workout Splits)" 
              : "Progres Berat Badan Mandiri"}
          </h1>
          <div className="current-date">
            <CalendarDays size={16} />
            <span>{formatDate(new Date(), true)}</span>
          </div>
        </header>

        {/* PANEL 1: WORKOUT SPLITS MANAGEMENT */}
        {activePanel === 'workout' && (
          <section className="panel-section active">
            <div className="card action-bar-card">
              <div className="card-body action-bar-body">
                <div className="action-info">
                  <h3>Tambah Hari Latihan Baru</h3>
                  <p>Kelola program latihan (workout split) harian Anda, seperti Push, Pull, Leg Day.</p>
                </div>
                <form onSubmit={handleAddWorkoutSubmit} className="inline-form">
                  <input
                    type="text"
                    placeholder="Contoh: Push Day (Dada & Bahu)"
                    value={workoutDayName}
                    onChange={(e) => setWorkoutDayName(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary">
                    <Plus size={16} /> <span>Tambah</span>
                  </button>
                </form>
              </div>
            </div>

            <div className="section-header-row">
              <h2>Daftar Hari Latihan Anda</h2>
              <span className="badge">{workouts.length} Hari</span>
            </div>

            {loadingWorkouts ? (
              <div className="loading-state">
                <Loader className="animate-spin" />
                <p>Memuat hari latihan...</p>
              </div>
            ) : workouts.length === 0 ? (
              <div className="loading-state">
                <Calendar size={40} className="text-muted" />
                <p>Belum ada hari latihan. Tambahkan hari latihan di atas!</p>
              </div>
            ) : (
              <div className="workout-grid">
                {workouts.map(day => (
                  <div key={day.id} className="card workout-card">
                    <div 
                      className="card-body workout-header-content" 
                      onClick={() => openExercisesManager(day.id, day.dayName)}
                    >
                      <div className="workout-icon-container">
                        <Calendar size={20} />
                      </div>
                      <div className="workout-details">
                        <h3>{day.dayName}</h3>
                        <div className="workout-meta">
                          <Calendar size={12} /> Dibuat: {formatDate(day.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="workout-card-actions">
                      <button 
                        onClick={() => handleDeleteWorkoutDay(day.id, day.dayName)} 
                        className="btn-danger-text"
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* EXERCISE MANAGER VIEW */}
            {selectedWorkoutDay && (
              <div id="exercises-manager-card" className="card exercises-manager">
                <div className="card-header">
                  <div className="header-title">
                    <ClipboardList className="text-primary" size={24} />
                    <div>
                      <h3>{selectedWorkoutDay.dayName}</h3>
                      <p className="subtitle">Kelola gerakan latihan dan set/reps/beban di hari ini</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedWorkoutDay(null); setExercises([]); }} 
                    className="btn-icon-only"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="card-body split-body">
                  {/* Left side: Add Exercise */}
                  <div className="exercise-form-wrapper">
                    <h4>Tambah Gerakan Baru</h4>
                    <form onSubmit={handleAddExerciseSubmit}>
                      <div className="input-group">
                        <label>Nama Gerakan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Flat Bench Press"
                          value={exerciseInput.exerciseName}
                          onChange={(e) => setExerciseInput(prev => ({ ...prev, exerciseName: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-row-3">
                        <div className="input-group">
                          <label>Sets</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            placeholder="4"
                            value={exerciseInput.sets}
                            onChange={(e) => setExerciseInput(prev => ({ ...prev, sets: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="input-group">
                          <label>Reps</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="10"
                            value={exerciseInput.reps}
                            onChange={(e) => setExerciseInput(prev => ({ ...prev, reps: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="input-group">
                          <label>Beban (kg)</label>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="60"
                            value={exerciseInput.weightKg}
                            onChange={(e) => setExerciseInput(prev => ({ ...prev, weightKg: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn btn-primary btn-block">
                        <Plus size={16} /> <span>Tambah Gerakan</span>
                      </button>
                    </form>
                  </div>

                  {/* Right side: Exercise Table */}
                  <div className="exercise-table-wrapper">
                    <h4>Gerakan Latihan Terdaftar</h4>
                    <div className="table-container">
                      {loadingExercises ? (
                        <div className="loading-state">
                          <Loader className="animate-spin" />
                          <p>Memuat gerakan...</p>
                        </div>
                      ) : exercises.length === 0 ? (
                        <div className="empty-table-message">
                          <Dumbbell size={32} />
                          <p>Belum ada gerakan latihan ditambahkan. Tambahkan di form sebelah kiri!</p>
                        </div>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Nama Gerakan</th>
                              <th className="text-center">Sets</th>
                              <th className="text-center">Reps</th>
                              <th className="text-center">Beban (Kg)</th>
                              <th className="text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exercises.map(ex => {
                              const isEditing = editingExerciseId === ex.id;
                              return (
                                <tr key={ex.id}>
                                  <td><strong>{ex.exercise_name}</strong></td>
                                  
                                  <td className="text-center">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        className="inline-edit-input"
                                        value={editExerciseInputs.sets}
                                        onChange={(e) => setEditExerciseInputs(prev => ({ ...prev, sets: e.target.value }))}
                                      />
                                    ) : ex.sets}
                                  </td>
                                  
                                  <td className="text-center">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        className="inline-edit-input"
                                        value={editExerciseInputs.reps}
                                        onChange={(e) => setEditExerciseInputs(prev => ({ ...prev, reps: e.target.value }))}
                                      />
                                    ) : ex.reps}
                                  </td>
                                  
                                  <td className="text-center">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        step="0.5"
                                        className="inline-edit-input"
                                        value={editExerciseInputs.weightKg}
                                        onChange={(e) => setEditExerciseInputs(prev => ({ ...prev, weightKg: e.target.value }))}
                                      />
                                    ) : `${ex.weight_kg} Kg`}
                                  </td>

                                  <td className="text-right">
                                    {isEditing ? (
                                      <div className="exercise-actions">
                                        <button 
                                          onClick={() => saveInlineEdit(ex.id)} 
                                          className="btn-icon-only text-success"
                                          title="Simpan"
                                        >
                                          <Check size={14} className="text-success" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingExerciseId(null)} 
                                          className="btn-icon-only text-muted"
                                          title="Batal"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="exercise-actions">
                                        <button 
                                          onClick={() => startInlineEdit(ex)} 
                                          className="btn-icon-only"
                                          title="Edit"
                                        >
                                          <Edit3 size={14} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteExercise(ex.id)} 
                                          className="btn-icon-only"
                                          title="Hapus"
                                        >
                                          <Trash2 size={14} className="text-danger" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* PANEL 2: WEIGHT PROGRESS TRACKING */}
        {activePanel === 'weight' && (
          <section className="panel-section active">
            <div className="weight-dashboard-grid">
              {/* Left panel: Form and List */}
              <div className="weight-controls">
                <div className="card">
                  <div className="card-header">
                    <h3>Catat Berat Badan</h3>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleAddWeightSubmit}>
                      <div className="input-group">
                        <label>Berat Badan (Kg)</label>
                        <div className="input-unit-wrapper">
                          <input
                            type="number"
                            step="0.1"
                            min="20"
                            max="300"
                            placeholder="75.0"
                            value={weightInput}
                            onChange={(e) => setWeightInput(e.target.value)}
                            required
                          />
                          <span className="unit">Kg</span>
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Tanggal Pencatatan</label>
                        <input
                          type="date"
                          value={weightDateInput}
                          onChange={(e) => setWeightDateInput(e.target.value)}
                          required
                        />
                      </div>
                      <button type="submit" className="btn btn-accent btn-block">
                        <Scale size={16} /> <span>Simpan Catatan</span>
                      </button>
                    </form>
                  </div>
                </div>

                <div className="card weight-history-card">
                  <div className="card-header">
                    <h3>Riwayat Penginputan</h3>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-container">
                      {loadingWeights ? (
                        <div className="loading-state">
                          <Loader className="animate-spin" />
                          <p>Memuat riwayat...</p>
                        </div>
                      ) : weightLogs.length === 0 ? (
                        <div className="empty-table-message">
                          <Scale size={32} />
                          <p>Belum ada log berat badan.</p>
                        </div>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Tanggal</th>
                              <th className="text-center">Berat (Kg)</th>
                              <th className="text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weightLogs.map(log => (
                              <tr key={log.id}>
                                <td>{formatDate(log.logDate)}</td>
                                <td className="text-center font-semibold text-accent">{log.weight} Kg</td>
                                <td className="text-right">
                                  <button 
                                    onClick={() => handleDeleteWeightLog(log.id)} 
                                    className="btn-icon-only"
                                    title="Hapus log"
                                  >
                                    <Trash2 size={14} className="text-danger" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right panel: Line Chart */}
              <div className="weight-chart-wrapper">
                <div className="card chart-card">
                  <div className="card-header">
                    <div className="header-title">
                      <Activity className="text-accent" size={24} />
                      <div>
                        <h3>Grafik Tren Berat Badan</h3>
                        <p className="subtitle">Visualisasi perubahan berat badan Anda dari waktu ke waktu</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-body chart-body">
                    <div className="canvas-container">
                      {weightLogs.length === 0 ? (
                        <div className="loading-state" style={{ height: '100%' }}>
                          <Activity size={40} className="text-muted" />
                          <p>Catat berat badan Anda terlebih dahulu untuk melihat grafik tren progres!</p>
                        </div>
                      ) : (
                        <Line data={chartData} options={chartOptions} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Global Alert Notification Toast */}
      {toast.visible && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          <span className="toast-message">{toast.message}</span>
          <button onClick={() => setToast(prev => ({ ...prev, visible: false }))} className="toast-close">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
