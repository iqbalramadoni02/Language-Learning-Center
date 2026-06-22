import React, { useState } from "react";
import SiswaDashboard from "./components/SiswaDashboard";
import GuruDashboard from "./components/GuruDashboard";
import { Siswa, Guru } from "./types";

// Predefined demo accounts for easy inspection & simulation
const DEMO_STUDENTS: Siswa[] = [
  {
    nis: "1001",
    nama: "Asyah Putri",
    kelas: "X 1",
    email: "asyah.putri@smaitalittihad.sch.id",
    mapelPilihan: ["English Wajib", "Bahasa Arab", "Bahasa Indonesia"]
  },
  {
    nis: "1002",
    nama: "Farhan Al-Ghifari",
    kelas: "X 1",
    email: "farhan.ghifari@smaitalittihad.sch.id",
    mapelPilihan: ["English Wajib", "Bahasa Indonesia"]
  },
  {
    nis: "1003",
    nama: "Siti Nurhaliza",
    kelas: "X 2",
    email: "siti.nurhaliza@smaitalittihad.sch.id",
    mapelPilihan: ["Bahasa Arab", "Bahasa Indonesia"]
  },
  {
    nis: "1101",
    nama: "Naufal Shidqi",
    kelas: "XI 1",
    email: "naufal.shidqi@smaitalittihad.sch.id",
    mapelPilihan: ["English Wajib", "Bahasa Arab", "Bahasa Indonesia"]
  },
  {
    nis: "1102",
    nama: "Aisyah Humaira",
    kelas: "XI 1",
    email: "aisyah.humaira@smaitalittihad.sch.id",
    mapelPilihan: ["English Wajib", "Bahasa Indonesia", "Bahasa Arab"]
  },
  {
    nis: "1103",
    nama: "Zidni Ilman",
    kelas: "XI 2",
    email: "zidni.ilman@smaitalittihad.sch.id",
    mapelPilihan: ["English Wajib", "Bahasa Indonesia"]
  },
  {
    nis: "1201",
    nama: "Muhammad Fatih",
    kelas: "XII 1",
    email: "fatih@smaitalittihad.sch.id",
    mapelPilihan: ["English Wajib", "Bahasa Arab"]
  },
  {
    nis: "1202",
    nama: "Lina Marlina",
    kelas: "XII 1",
    email: "lina@smaitalittihad.sch.id",
    mapelPilihan: ["English Wajib", "Bahasa Indonesia", "Bahasa Arab"]
  }
];

const DEMO_TEACHERS: Guru[] = [
  {
    nama: "Fatimah, M.Pd",
    email: "fatimah@smaitalittihad.sch.id",
    mapelList: ["English Wajib", "English Lanjut", "Bahasa Indonesia", "Bahasa Arab"]
  },
  {
    nama: "Ahmad, S.Ag",
    email: "ahmad@smaitalittihad.sch.id",
    mapelList: ["Bahasa Arab", "English Wajib"]
  }
];

export default function App() {
  const [role, setRole] = useState<"guest" | "siswa" | "guru">("guest");
  const [activeSiswa, setActiveSiswa] = useState<Siswa | null>(null);
  const [activeGuru, setActiveGuru] = useState<Guru | null>(null);

  // Users lists loaded from manual localStorage fallback
  const [students, setStudents] = useState<Siswa[]>(() => {
    const saved = localStorage.getItem("smait_siswa_list");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEMO_STUDENTS;
  });

  const [teachers, setTeachers] = useState<Guru[]>(() => {
    const saved = localStorage.getItem("smait_guru_list");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEMO_TEACHERS;
  });

  // UI state toggles
  const [activePortal, setActivePortal] = useState<"siswa" | "guru">("siswa");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Input states for Login Forms
  const [loginNisEmail, setLoginNisEmail] = useState<string>("");
  const [loginPass, setLoginPass] = useState<string>("");

  // Input states for Student Register (Daftar Santri)
  const [regSiswaNis, setRegSiswaNis] = useState<string>("");
  const [regSiswaNama, setRegSiswaNama] = useState<string>("");
  const [regSiswaEmail, setRegSiswaEmail] = useState<string>("");
  const [regSiswaKelas, setRegSiswaKelas] = useState<string>("X 1");
  const [regSiswaMapel, setRegSiswaMapel] = useState<string[]>(["Bahasa Indonesia", "English Wajib"]);
  const [regSiswaPassword, setRegSiswaPassword] = useState<string>("");

  // Input states for Teacher Register (Daftar Guru)
  const [regGuruNama, setRegGuruNama] = useState<string>("");
  const [regGuruEmail, setRegGuruEmail] = useState<string>("");
  const [regGuruMapel, setRegGuruMapel] = useState<string[]>(["Bahasa Indonesia", "English Wajib"]);
  const [regGuruPassword, setRegGuruPassword] = useState<string>("");

  const [userTypeError, setUserTypeError] = useState<string>("");

  const CLASSES = [
    "X 1", "X 2", "X 3", "X 4",
    "XI 1", "XI 2", "XI 3", "XI 4",
    "XII 1", "XII 2", "XII 3", "XII 4"
  ];

  const AVAILABLE_MAPEL = [
    "English Wajib",
    "English Lanjut",
    "Bahasa Indonesia",
    "Bahasa Arab"
  ];

  const handleRegSiswaNisChange = (nisVal: string) => {
    setRegSiswaNis(nisVal);
    const matched = [...students, ...DEMO_STUDENTS].find(s => s.nis === nisVal.trim());
    if (matched) {
      setRegSiswaNama(matched.nama);
      setRegSiswaKelas(matched.kelas);
    }
  };

  const handleDemoStudentLogin = (student: Siswa) => {
    setActivePortal("siswa");
    setAuthMode("login");
    setLoginNisEmail(student.nis);
    
    setActiveSiswa(student);
    setRole("siswa");
    setUserTypeError("");
  };

  const handleDemoTeacherLogin = (teacher: Guru) => {
    setActivePortal("guru");
    setAuthMode("login");
    setLoginNisEmail(teacher.email);

    setActiveGuru(teacher);
    setRole("guru");
    setUserTypeError("");
  };

  const handleSiswaLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginNisEmail) {
      setUserTypeError("Harap masukkan NISN atau Akun Email Siswa.");
      return;
    }

    // Try to match in state students
    let matchedSiswa = students.find(
      (s) => s.nis === loginNisEmail || s.email.toLowerCase() === loginNisEmail.toLowerCase()
    );

    // If not found in loaded state yet, try to search in the DEMO_STUDENTS master database array
    if (!matchedSiswa) {
      matchedSiswa = DEMO_STUDENTS.find(
        (s) => s.nis === loginNisEmail || s.email.toLowerCase() === loginNisEmail.toLowerCase()
      );
      if (matchedSiswa) {
        // Hydrate the students state list with the master student records
        const updated = [...students, matchedSiswa];
        setStudents(updated);
        localStorage.setItem("smait_siswa_list", JSON.stringify(updated));
      }
    }

    if (matchedSiswa) {
      if (matchedSiswa.password && loginPass && matchedSiswa.password !== loginPass) {
        setUserTypeError("Sandi keamanan (password) yang Anda masukkan salah.");
        return;
      }
      setActiveSiswa(matchedSiswa);
      setRole("siswa");
      setUserTypeError("");
      return;
    }

    // Auto-fallback helper for student registration if numeric NIS is inserted
    if (!isNaN(Number(loginNisEmail))) {
      const guestSiswa: Siswa = {
        nis: loginNisEmail,
        nama: `Siswa Baru (${loginNisEmail})`,
        kelas: "X 1",
        email: `${loginNisEmail}@smaitalittihad.sch.id`,
        mapelPilihan: ["English Wajib", "English Lanjut", "Bahasa Arab", "Bahasa Indonesia"]
      };
      const updated = [...students, guestSiswa];
      setStudents(updated);
      localStorage.setItem("smait_siswa_list", JSON.stringify(updated));
      setActiveSiswa(guestSiswa);
      setRole("siswa");
      setUserTypeError("");
      return;
    }

    setUserTypeError("Data NISN siswa tidak ditemukan. Silakan klik tab 'Daftar' untuk membuat akun baru.");
  };

  const handleGuruLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginNisEmail) {
      setUserTypeError("Harap masukkan E-mail Edukasi Resmi Ustadz/ah.");
      return;
    }

    const matchedGuru = teachers.find(
      (g) => g.email.toLowerCase() === loginNisEmail.toLowerCase()
    );

    if (matchedGuru) {
      if (matchedGuru.password && loginPass && matchedGuru.password !== loginPass) {
        setUserTypeError("Sandi keamanan (password) yang Anda masukkan salah.");
        return;
      }
      setActiveGuru(matchedGuru);
      setRole("guru");
      setUserTypeError("");
      return;
    }

    // Auto-fallback helper for teacher registration if email and contains @
    if (loginNisEmail.includes("@")) {
      const parts = loginNisEmail.split("@")[0];
      const fallbackName = parts.charAt(0).toUpperCase() + parts.slice(1);
      const guestGuru: Guru = {
        nama: `${fallbackName}`,
        email: loginNisEmail,
        mapelList: ["English Wajib", "English Lanjut", "Bahasa Arab", "Bahasa Indonesia"]
      };
      const updated = [...teachers, guestGuru];
      setTeachers(updated);
      localStorage.setItem("smait_guru_list", JSON.stringify(updated));
      setActiveGuru(guestGuru);
      setRole("guru");
      setUserTypeError("");
      return;
    }

    setUserTypeError("E-mail guru tidak terdaftar. Silakan daftar via tab 'Daftar' terlebih dahulu.");
  };

  const handleSiswaRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regSiswaNis || !regSiswaNama || !regSiswaPassword) {
      setUserTypeError("Harap isi seluruh kolom wajib termasuk Sandi Keamanan.");
      return;
    }
    if (isNaN(Number(regSiswaNis))) {
      setUserTypeError("NISN harus berupa kombinasi nomor/angka saja.");
      return;
    }
    const exists = students.some((s) => s.nis === regSiswaNis);
    if (exists) {
      setUserTypeError("NISN sudah digunakan oleh siswa terdaftar lainnya.");
      return;
    }
    if (regSiswaMapel.length === 0) {
      setUserTypeError("Harap pilih minimal 1 mata pelajaran favorit.");
      return;
    }

    const email = regSiswaEmail || `${regSiswaNis}@smaitalittihad.sch.id`;
    const newSiswa: Siswa = {
      nis: regSiswaNis,
      nama: regSiswaNama,
      kelas: regSiswaKelas,
      email: email,
      mapelPilihan: regSiswaMapel,
      password: regSiswaPassword
    };

    const updated = [...students, newSiswa];
    setStudents(updated);
    localStorage.setItem("smait_siswa_list", JSON.stringify(updated));

    // Auto log in newly registered student
    setActiveSiswa(newSiswa);
    setRole("siswa");
    setUserTypeError("");
    
    // Clear registration fields
    setRegSiswaNis("");
    setRegSiswaNama("");
    setRegSiswaEmail("");
    setRegSiswaPassword("");
    alert(`Alhamdulillah, Registrasi Akun Siswa ${regSiswaNama} berhasil!`);
  };

  const handleGuruRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regGuruNama || !regGuruEmail || !regGuruPassword) {
      setUserTypeError("Harap isi seluruh kolom wajib termasuk Sandi Keamanan.");
      return;
    }
    if (!regGuruEmail.includes("@")) {
      setUserTypeError("Harap masukkan format e-mail edukasi yang valid.");
      return;
    }
    const exists = teachers.some((t) => t.email.toLowerCase() === regGuruEmail.toLowerCase());
    if (exists) {
      setUserTypeError("Akun guru dengan e-mail ini sudah terdaftar.");
      return;
    }
    if (regGuruMapel.length === 0) {
      setUserTypeError("Harap pilih minimal 1 mata pelajaran yang Anda ampu.");
      return;
    }

    const newGuru: Guru = {
      nama: regGuruNama,
      email: regGuruEmail,
      mapelList: regGuruMapel,
      password: regGuruPassword
    };

    const updated = [...teachers, newGuru];
    setTeachers(updated);
    localStorage.setItem("smait_guru_list", JSON.stringify(updated));

    // Auto log in newly registered teacher
    setActiveGuru(newGuru);
    setRole("guru");
    setUserTypeError("");

    // Clear registration fields
    setRegGuruNama("");
    setRegGuruEmail("");
    setRegGuruPassword("");
    alert(`Alhamdulillah, Registrasi Akun Ustadz/ah ${regGuruNama} berhasil!`);
  };

  const toggleSiswaMapelOption = (m: string) => {
    setRegSiswaMapel(prev => 
      prev.includes(m) ? prev.filter(item => item !== m) : [...prev, m]
    );
  };

  const toggleGuruMapelOption = (m: string) => {
    setRegGuruMapel(prev => 
      prev.includes(m) ? prev.filter(item => item !== m) : [...prev, m]
    );
  };

  const handleLogout = () => {
    setRole("guest");
    setActiveSiswa(null);
    setActiveGuru(null);
    setLoginNisEmail("");
    setLoginPass("");
    setUserTypeError("");
  };

  if (role === "siswa" && activeSiswa) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 text-slate-900">
        <div className="max-w-7xl mx-auto">
          <SiswaDashboard user={activeSiswa} onLogout={handleLogout} />
        </div>
      </div>
    );
  }

  if (role === "guru" && activeGuru) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 md:p-6 text-slate-900">
        <div className="max-w-7xl mx-auto">
          <GuruDashboard user={activeGuru} onLogout={handleLogout} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-wave-bg flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[600px]">
        
        {/* Left Side: Brand Visuals */}
        <div className="md:col-span-12 lg:col-span-4 p-8 flex flex-col justify-between text-white bg-gradient-to-br from-indigo-950/90 to-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="space-y-2">
            <span className="px-2.5 py-1 bg-indigo-500/15 text-indigo-300 rounded border border-indigo-500/30 text-[10px] font-extrabold tracking-widest uppercase inline-block">
              ✨ HIGH DENSITY LMS
            </span>
            <div className="pt-4">
              <h2 className="text-2xl font-bold font-serif leading-tight">LMS Al-Ittihad</h2>
              <p className="text-xs opacity-75 mt-1">Sistem Manajemen Pembelajaran Terpadu SMAIT Al-Ittihad Pekanbaru</p>
            </div>
          </div>

          <div className="pt-8">
            <p className="text-xs italic leading-relaxed text-slate-300 font-serif">
              "Bismillah, tuntutlah ilmu setinggi langit dengan hati yang bersih, integritas moral yang luhur, dan komitmen spiritual harian."
            </p>
            <p className="text-[10px] text-indigo-400 font-bold mt-2">— SMAIT AL-ITTIHAD PEKANBARU</p>
          </div>
        </div>

        {/* Right Side: Login & Registration Interfaces */}
        <div className="md:col-span-12 lg:col-span-8 p-8 bg-white flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Header Title based on Portal Side */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {activePortal === "siswa" ? "👨‍🎓 Portal Siswa" : "👩‍🏫 Portal Ustadz/ah / Guru"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {activePortal === "siswa" 
                  ? "Akses modul materi siswa, penyerahan tugas ujian harian, evaluasi kuis, nilai transkrip dan presensi." 
                  : "Akses modul publikasi silabus, materi & penugasan, koreksi log integritas kuis, input ledger kelas dan raport harian."}
              </p>
            </div>

            {/* Step 1: Switch Portal Guru vs Siswa (Upper Tab Switcher) */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setActivePortal("siswa");
                  setUserTypeError("");
                }}
                className={`py-2 text-xs font-bold rounded-lg transition duration-150 cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  activePortal === "siswa" 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>👨‍🎓</span> Siswa Belajar
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePortal("guru");
                  setUserTypeError("");
                }}
                className={`py-2 text-xs font-bold rounded-lg transition duration-150 cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  activePortal === "guru" 
                    ? "bg-emerald-600 text-white shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>👩‍🏫</span> Ustadz / Guru
              </button>
            </div>

            {/* Step 2: Switch Masuk vs Daftar (Pills Selector) */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setUserTypeError("");
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  authMode === "login"
                    ? activePortal === "siswa" 
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                🔑 Masuk Sistem
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setUserTypeError("");
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  authMode === "register"
                    ? activePortal === "siswa"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                📝 Registrasi Baru (Daftar)
              </button>
            </div>

            {userTypeError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                ⚠️ {userTypeError}
              </div>
            )}

            {/* --- PORTAL FORM RENDER --- */}

            {/* A. SISWA PORTAL */}
            {activePortal === "siswa" && (
              <>
                {authMode === "login" ? (
                  /* Siswa Login */
                  <form onSubmit={handleSiswaLoginSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500">Nomor Induk Siswa Nasional (NIS / NISN)</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        placeholder="Contoh: 1001, 1002, 1003..."
                        value={loginNisEmail}
                        onChange={(e) => setLoginNisEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">Sandi Keamanan</label>
                      <input 
                        type="password" 
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                        placeholder="Masukkan password ananda..."
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition duration-200 cursor-pointer shadow-md shadow-indigo-100"
                    >
                      Masuk sebagai Siswa
                    </button>
                  </form>
                ) : (
                  /* Siswa Registration */
                  <form onSubmit={handleSiswaRegisterSubmit} className="space-y-3">
                    {(() => {
                      const matchedSiswaDB = [...students, ...DEMO_STUDENTS].find(s => s.nis === regSiswaNis.trim());
                      const isFound = !!matchedSiswaDB;

                      return (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-slate-500 flex justify-between">
                                <span>Nomor Induk Siswa (NIS / NISN) *</span>
                                {isFound && (
                                  <span className="text-emerald-600 font-black animate-pulse text-[10px]">● Terhubung</span>
                                )}
                              </label>
                              <input 
                                type="text" 
                                required
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-bold"
                                placeholder="Masukkan NISN baru (Contoh: 1001)"
                                value={regSiswaNis}
                                onChange={(e) => handleRegSiswaNisChange(e.target.value)}
                              />
                              {isFound && (
                                <p className="text-[9px] text-emerald-600 font-bold mt-1">✓ Siswa Ditemukan di Database! Nama & Kelas langsung diimpor.</p>
                              )}
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500">Nama Lengkap Siswa *</label>
                              <input 
                                type="text" 
                                required
                                disabled={isFound}
                                className={`w-full p-2.5 border rounded-xl mt-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 ${
                                  isFound ? "bg-slate-100 border-slate-300 text-slate-500 font-mono font-bold cursor-not-allowed" : "bg-slate-50 border-slate-200"
                                }`}
                                placeholder="Nama lengkap ananda..."
                                value={regSiswaNama}
                                onChange={(e) => setRegSiswaNama(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-slate-500">Alamat E-mail (Opsional)</label>
                              <input 
                                type="email" 
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                placeholder="siswa@smaitalittihad.sch.id"
                                value={regSiswaEmail}
                                onChange={(e) => setRegSiswaEmail(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-slate-500">Kelas Belajar *</label>
                              {isFound ? (
                                <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-xl mt-1 text-xs text-slate-500 font-mono font-bold cursor-not-allowed">
                                  Kelas {regSiswaKelas} (Tersinkronisasi)
                                </div>
                              ) : (
                                <select 
                                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-indigo-500"
                                  value={regSiswaKelas}
                                  onChange={(e) => setRegSiswaKelas(e.target.value)}
                                >
                                  {CLASSES.map((c) => (
                                    <option key={c} value={c}>Kelas {c}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    <div>
                      <span className="text-xs font-bold text-slate-500 block mb-1">Mata Pelajaran Pilihan / Favorit *</span>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_MAPEL.map((m) => (
                          <button
                            type="button"
                            key={m}
                            onClick={() => toggleSiswaMapelOption(m)}
                            className={`px-2.5 py-1.5 border text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              regSiswaMapel.includes(m)
                                ? "bg-indigo-50 border-indigo-400 text-indigo-700"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {regSiswaMapel.includes(m) ? "✅ " : ""}{m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">Sandi Keamanan (Password) Masuk *</label>
                      <input 
                        type="password" 
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        placeholder="Buat sandi keamanan baru..."
                        value={regSiswaPassword}
                        onChange={(e) => setRegSiswaPassword(e.target.value)}
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition duration-200 cursor-pointer shadow-md mt-2"
                    >
                      Daftar Baru &amp; Masuk Ke Dashboard
                    </button>
                  </form>
                )}
              </>
            )}

            {/* B. GURU PORTAL */}
            {activePortal === "guru" && (
              <>
                {authMode === "login" ? (
                  /* Guru Login */
                  <form onSubmit={handleGuruLoginSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500">E-mail Resmi Edukasi Pengajar (Ustadz/ah)</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                        placeholder="Contoh: fatimah@smaitalittihad.sch.id"
                        value={loginNisEmail}
                        onChange={(e) => setLoginNisEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">Sandi Keamanan</label>
                      <input 
                        type="password" 
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                        placeholder="Masukkan password ustadz/ah..."
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition duration-200 cursor-pointer shadow-md shadow-emerald-100"
                    >
                      Masuk sebagai Guru / Ustadz
                    </button>
                  </form>
                ) : (
                  /* Guru Registration */
                  <form onSubmit={handleGuruRegisterSubmit} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500">Nama Lengkap &amp; Gelar Akademik *</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        placeholder="Contoh: Fatimah, M.Pd atau Ahmad, S.Ag..."
                        value={regGuruNama}
                        onChange={(e) => setRegGuruNama(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">E-mail Resmi Edukasi (ID) *</label>
                      <input 
                        type="email" 
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        placeholder="Contoh: ahmad@smaitalittihad.sch.id"
                        value={regGuruEmail}
                        onChange={(e) => setRegGuruEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-500 block mb-1">Mata Pelajaran yang Diampu *</span>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABLE_MAPEL.map((m) => (
                          <button
                            type="button"
                            key={m}
                            onClick={() => toggleGuruMapelOption(m)}
                            className={`px-2.5 py-1.5 border text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              regGuruMapel.includes(m)
                                ? "bg-emerald-50 border-emerald-400 text-emerald-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {regGuruMapel.includes(m) ? "✅ " : ""}{m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500">Sandi Keamanan (Password) Masuk Baru *</label>
                      <input 
                        type="password" 
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mt-1 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        placeholder="Buat sandi keamanan ustadz/ah..."
                        value={regGuruPassword}
                        onChange={(e) => setRegGuruPassword(e.target.value)}
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition duration-200 cursor-pointer shadow-md mt-2"
                    >
                      Daftar Baru &amp; Masuk Ke Portal Pengajar
                    </button>
                  </form>
                )}
              </>
            )}

          </div>



        </div>

      </div>
    </div>
  );
}
