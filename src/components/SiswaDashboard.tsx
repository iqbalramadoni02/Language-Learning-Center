import React, { useState, useEffect } from "react";
import { Siswa, Tugas, Materi, Presensi, SilabusUnit, Jadwal, QuizQuestion } from "../types";
import { 
  formatDate, 
  formatTanggalOnly, 
  buildCalendarLink, 
  getKKM, 
  fetchFromProxy,
  formatJam,
  formatJamSelesai,
  getMinutesFromTime,
  DAY_WEIGHTS
} from "../utils";

interface SiswaDashboardProps {
  user: Siswa;
  onLogout: () => void;
}

const I18N: Record<string, any> = {
  id: {
    dashboardTitle: "Dashboard Ananda",
    welcomeMsgDefault: "Bismillah, semoga ilmu yang dipelajari hari ini berkah dan bermanfaat ya! 🤲",
    jadwalTitle: "📅 Jadwal Mapel Ini",
    tugasTitle: "📝 Tugas & Star Points",
    materiTitle: "📁 Materi Pembelajaran",
    presensiTitle: "🗓️ Riwayat Presensi Mapel Ini",
    silabusTitle: "📚 Rencana Belajar Mapel Ini",
    absenSesiTitle: "⏰ Sesi Kelas Lagi Berlangsung!",
    absenSesiDesc: "Yuk absen dulu biar tercatat hadir & dapat Star Points kehadiran 🌟",
    absenBtn: "✋ ABSEN SEKARANG",
    transkripBtn: "📄 Transkrip Nilai",
    gantiMapelBtn: "🔄 Ganti Mapel",
    keluarBtn: "Keluar",
    kosongTugas: "Alhamdulillah, bebas tugas! Tidak ada tagihan tugas aktif untuk mapel ini.",
    kosongMateri: "Belum ada materi untuk mapel ini.",
    kosongJadwal: "Belum ada jadwal untuk mapel ini.",
    kosongPresensi: "Belum ada riwayat presensi untuk mapel ini.",
    belumDinilai: "Belum Dinilai",
    kirimJawaban: "📤 Kirim Jawaban",
    kerjakanKuis: "📝 Kerjakan Kuis",
    tuntas: "TUNTAS",
    belumTuntas: "BELUM TUNTAS",
    deadlineLabel: "Deadline",
    loading: "Memuat info..."
  },
  en: {
    dashboardTitle: "Student Dashboard",
    welcomeMsgDefault: "Bismillah, may today's learning be blessed and beneficial! 🤲",
    jadwalTitle: "📅 Class Schedule",
    tugasTitle: "📝 Assignments & Star Points",
    materiTitle: "📁 Learning Materials",
    presensiTitle: "🗓️ Attendance History",
    silabusTitle: "📚 Learning Plan for This Subject",
    absenSesiTitle: "⏰ Class Session in Progress!",
    absenSesiDesc: "Check in now to record your attendance and earn attendance Star Points 🌟",
    absenBtn: "✋ CHECK IN NOW",
    transkripBtn: "📄 Grade Transcript",
    gantiMapelBtn: "🔄 Switch Subject",
    keluarBtn: "Log Out",
    kosongTugas: "Alhamdulillah, no pending assignments for this subject!",
    kosongMateri: "No learning materials available for this subject yet.",
    kosongJadwal: "No schedule available for this subject yet.",
    kosongPresensi: "No attendance history for this subject yet.",
    belumDinilai: "Not Graded Yet",
    kirimJawaban: "📤 Submit Answer",
    kerjakanKuis: "📝 Take Quiz",
    tuntas: "PASSED",
    belumTuntas: "NOT YET PASSED",
    deadlineLabel: "Deadline",
    loading: "Loading..."
  },
  ar: {
    dashboardTitle: "لوحة تحكم الطالب / Dashboard Ananda",
    welcomeMsgDefault: "بسم الله، نسأل الله أن يبارك في علمنا اليوم 🤲 / Semoga ilmu hari ini berkah",
    jadwalTitle: "📅 الجدول الدراسي / Jadwal Mapel Ini",
    tugasTitle: "📝 الواجبات ونقاط النجوم / Tugas & Star Points",
    materiTitle: "📁 المواد التعليمية / Materi Pembelajaran",
    presensiTitle: "🗓️ سجل الحضور / Riwayat Presensi",
    silabusTitle: "📚 خطة التعلم / Rencana Belajar",
    absenSesiTitle: "⏰ الحصة جارية الآن! / Sesi Kelas Berlangsung!",
    absenSesiDesc: "سجل حضورك الآن واحصل على نقاط الحضور 🌟 / Yuk absen biar dapat Star Points",
    absenBtn: "✋ تسجيل الحضور / ABSEN SEKARANG",
    transkripBtn: "📄 كشف الدرجات / Transkrip Nilai",
    gantiMapelBtn: "🔄 تغيير المادة / Ganti Mapel",
    keluarBtn: "خروج / Keluar",
    kosongTugas: "الحمد لله، لا توجد واجبات معلقة! / Alhamdulillah, bebas tugas!",
    kosongMateri: "لا توجد مواد تعليمية بعد / Belum ada materi.",
    kosongJadwal: "لا يوجد جدول بعد / Belum ada jadwal.",
    kosongPresensi: "لا يوجد سجل حضور بعد / Belum ada riwayat presensi.",
    belumDinilai: "لم يُقيَّم بعد / Belum Dinilai",
    kirimJawaban: "📤 إرسال الإجابة / Kirim Jawaban",
    kerjakanKuis: "📝 أداء الاختبار / Kerjakan Kuis",
    tuntas: "ناجح / TUNTAS",
    belumTuntas: "غير ناجح بعد / BELUM TUNTAS",
    deadlineLabel: "الموعد النهائي / Deadline",
    loading: "تحميل..."
  }
};

const SAPAAN: Record<string, string[]> = {
  id: [
    "Bismillah, semoga ilmu hari ini berkah dan jadi amal jariyah ya! 🤲",
    "Yuk semangat belajar, sedikit demi sedikit lama-lama jadi bukit ✨",
    "Setiap usaha belajarmu dicatat sebagai kebaikan, tetap istiqomah ya! 📖",
    "\"Barang siapa menempuh jalan mencari ilmu, Allah mudahkan jalannya ke surga\" — Semangat terus! 🌟",
    "Jangan lupa berdoa sebelum belajar, biar makin paham dan berkah 🤍"
  ],
  en: [
    "Bismillah, may today's learning be a source of blessing and good deeds! 🤲",
    "Keep going - small steps every day lead to big progress ✨",
    "Every effort you put into learning is written down as a good deed 📖",
    "\"Whoever takes a path seeking knowledge, Allah eases their path to Jannah\" — Keep going! 🌟",
    "Don't forget to make du'a before studying, for understanding and barakah 🤍"
  ],
  ar: [
    "بسم الله، نسأل الله أن يبارك في علمنا اليوم 🤲 / Semoga ilmu hari ini berkah",
    "واصل التقدم، خطوة بخطوة تصل إلى القمة ✨ / Sedikit demi sedikit jadi bukit",
    "كل جهد dalam menuntut ilmu يُكتب حسنة 📖 / Setiap usaha belajar dicatat kebaikan",
    "«من سلك طريقًا يلتمس فيه علمًا سهل الله له به طريقًا إلى الجنة» 🌟",
    "لا تنسَ الدعاء قبل الدراسة 🤍 / Jangan lupa berdoa sebelum belajar"
  ]
};

export default function SiswaDashboard({ user, onLogout }: SiswaDashboardProps) {
  const [lockedMapel, setLockedMapel] = useState<string>("");
  const [lockedSemester, setLockedSemester] = useState<string>("1");
  const [availableMapel, setAvailableMapel] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  
  // Dynamic names from Gsheet
  const [namaSiswaGsheet, setNamaSiswaGsheet] = useState<string>("");
  const [waliKelasGsheet, setWaliKelasGsheet] = useState<string>("");
  
  // Dashboard states
  const [jadwal, setJadwal] = useState<Jadwal[]>([]);
  const [materi, setMateri] = useState<Materi[]>([]);
  const [tugas, setTugas] = useState<Tugas[]>([]);
  const [nilai, setNilai] = useState<any[]>([]);
  const [absensiMapel, setAbsensiMapel] = useState<Presensi[]>([]);
  const [rencanaBelajar, setRencanaBelajar] = useState<any[]>([]);
  const [sesiAktif, setSesiAktif] = useState<boolean>(false);
  const [sudahAbsenHariIni, setSudahAbsenHariIni] = useState<boolean>(false);
  
  // Statistics
  const [studentProgress, setStudentProgress] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [transkripList, setTranskripList] = useState<any[]>([]);
  const [showTranskrip, setShowTranskrip] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("beranda");
  
  // Toast and alerts
  const [toastMsg, setToastMsg] = useState<string>("");
  const [absenLoading, setAbsenLoading] = useState<boolean>(false);

  // Quiz Monitoring / Anti-cheat states
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Tugas | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizStartTime, setQuizStartTime] = useState<Date | null>(null);
  const [cheatsCount, setCheatsCount] = useState<number>(0);
  const [cheatsLog, setCheatsLog] = useState<string[]>([]);
  const [deviceWasOff, setDeviceWasOff] = useState<boolean>(false);
  const [randomGreeting, setRandomGreeting] = useState<string>("");

  // Get active translation mode
  const currentLangMode = lockedMapel.includes("Arab") ? "ar" : (lockedMapel.includes("English") ? "en" : "id");
  const t = I18N[currentLangMode] || I18N.id;

  // 1. Fetch available subjects for pupil's grade
  useEffect(() => {
    setLoading(true);
    fetchFromProxy({ action: "getMapelUntukKelas", kelas: user.kelas })
      .then((res) => {
        const maps = res.mapelList || [];
        setAvailableMapel(maps);
        if (maps.length > 0) {
          setLockedMapel(maps[0].mapel);
        }
      })
      .catch((err) => console.error("Error loaded mapel list:", err))
      .finally(() => setLoading(false));
  }, [user.kelas]);

  // Dual-lingual notice randomly picked
  useEffect(() => {
    if (isLocked) {
      const greetings = SAPAAN[currentLangMode] || SAPAAN.id;
      setRandomGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    }
  }, [isLocked, lockedMapel]);

  // 2. Fetch locked-subject pupil dashboard
  const handleLockIn = () => {
    if (!lockedMapel) {
      alert("Pilih Mata Pelajaran terlebih dahulu, Ananda!");
      return;
    }
    setIsLocked(true);
    loadDashboardData();
  };

  const loadDashboardData = () => {
    setLoading(true);
    fetchFromProxy({
      action: "getSiswaDashboard",
      nisn: user.nis,
      mapel: lockedMapel,
      semester: lockedSemester
    })
      .then((res) => {
        if (res.status === "success") {
          // Format and sort schedule by days and earliest hours
          let rawJadwal = res.jadwal || [];
          try {
            const deletedJadwal = JSON.parse(localStorage.getItem("deleted_jadwal") || "[]");
            const editedJadwal = JSON.parse(localStorage.getItem("edited_jadwal") || "[]");
            rawJadwal = rawJadwal.filter((j: any) => j.id && !deletedJadwal.includes(j.id));
            rawJadwal = rawJadwal.map((j: any) => {
              const match = editedJadwal.find((ej: any) => ej.id === j.id);
              return match ? { ...j, ...match } : j;
            });
          } catch (e) {
            console.error("Local storage merge err (jadwal):", e);
          }

          const formattedJadwal = rawJadwal.map((j: any) => ({
            ...j,
            jamMulai: formatJam(j.jamMulai),
            jamSelesai: formatJamSelesai(j.jamSelesai)
          }));
          const sortedJadwal = [...formattedJadwal].sort((a, b) => {
            const dayA = DAY_WEIGHTS[a.hari] || 99;
            const dayB = DAY_WEIGHTS[b.hari] || 99;
            if (dayA !== dayB) return dayA - dayB;
            return getMinutesFromTime(a.jamMulai) - getMinutesFromTime(b.jamMulai);
          });
          setJadwal(sortedJadwal);

          // Apply local storage overrides for materials (materi)
          let finalMateri = res.materi || [];
          try {
            const deletedMateri = JSON.parse(localStorage.getItem("deleted_materi") || "[]");
            const editedMateri = JSON.parse(localStorage.getItem("edited_materi") || "[]");
            finalMateri = finalMateri.filter((m: any) => m.id && !deletedMateri.includes(m.id));
            finalMateri = finalMateri.map((m: any) => {
              const match = editedMateri.find((em: any) => em.id === m.id);
              return match ? { ...m, ...match } : m;
            });
          } catch (e) {
            console.error("Local storage merge err (materi):", e);
          }
          setMateri(finalMateri);

          // Apply local storage overrides for tasks (tugas)
          let finalTugas = res.tugas || [];
          try {
            const deletedTugas = JSON.parse(localStorage.getItem("deleted_tugas") || "[]");
            const editedTugas = JSON.parse(localStorage.getItem("edited_tugas") || "[]");
            finalTugas = finalTugas.filter((t: any) => t.id && !deletedTugas.includes(t.id));
            finalTugas = finalTugas.map((t: any) => {
              const match = editedTugas.find((et: any) => et.id === t.id);
              return match ? { ...t, ...match } : t;
            });
          } catch (e) {
            console.error("Local storage merge err (tugas):", e);
          }
          setTugas(finalTugas);
          setNilai(res.nilai || []);
          setAbsensiMapel(res.absensiMapel || []);
          setSesiAktif(!!res.sesiAktif);
          setSudahAbsenHariIni(!!res.sudahAbsenHariIni);
          
          if (res.nama) {
            setNamaSiswaGsheet(res.nama);
          } else if (res.namaSiswa) {
            setNamaSiswaGsheet(res.namaSiswa);
          }
          if (res.waliKelas) {
            setWaliKelasGsheet(res.waliKelas);
          }

          if (res.presensiMsg) {
            setToastMsg(res.presensiMsg);
          }
        }
      })
      .catch((err) => console.error("Error fetching dashboard siswa data:", err))
      .finally(() => setLoading(false));

    // Retrieve full class report dynamically to find homeroom teacher and the student's official Gsheet name
    fetchFromProxy({
      action: "getRaportKelasLengkap",
      kelas: user.kelas
    })
      .then((res) => {
        if (res && res.status === "success") {
          if (res.waliKelas) {
            setWaliKelasGsheet(res.waliKelas);
          }
          if (res.raportList) {
            const matched = res.raportList.find((item: any) => item.nisn === user.nis);
            if (matched && matched.nama) {
              setNamaSiswaGsheet(matched.nama);
            }
          }
        }
      })
      .catch((err) => console.error("Error fetching student/wali detail from Gsheet:", err));

    fetchFromProxy({
      action: "getRencanaBelajarSiswa",
      nisn: user.nis,
      kelas: user.kelas,
      mapel: lockedMapel,
      semester: lockedSemester
    })
      .then((res) => {
        setRencanaBelajar(res.rencana || []);
      })
      .catch((e) => console.error("Error load rencana belajar:", e));

    fetchFromProxy({
      action: "getProgresBelajarSiswa",
      nisn: user.nis,
      kelas: user.kelas,
      mapel: lockedMapel,
      semester: lockedSemester
    })
      .then((res) => {
        if (res.status === "success") {
          setStudentProgress(res);
        }
      })
      .catch((e) => console.error("Error load progress stats:", e));
  };

  // 3. Native Geolocation Quick Check-In
  const handleQuickCheckIn = () => {
    if (!navigator.geolocation) {
      alert("Browser atau perangkat Ananda tidak mendukung sistem lokasi GPS. Gagal presensi mandiri.");
      return;
    }

    setAbsenLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchFromProxy({
          action: "absenMandiriSiswa",
          nisn: user.nis,
          nama: user.nama,
          kelas: user.kelas,
          mapel: lockedMapel,
          semester: lockedSemester,
          lat: position.coords.latitude,
          lon: position.coords.longitude
        })
          .then((res) => {
            alert(res.message || "Bismillah, presensi mandiri sukses!");
            loadDashboardData();
          })
          .catch((err) => {
            console.error("Presence error:", err);
            alert("Terjadi kegagalan komunikasi ke server.");
          })
          .finally(() => setAbsenLoading(false));
      },
      (error) => {
        setAbsenLoading(false);
        alert("⚠️ Izin lokasi ditolak atau tidak terdeteksi. Silakan izinkan deteksi GPS di browser untuk melakukan presensi mandiri ini.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const getQuizQuestions = (task: Tugas | null): QuizQuestion[] => {
    if (!task) return [];
    if (!task.soalList) return [];
    if (Array.isArray(task.soalList)) {
      return task.soalList;
    }
    try {
      const parsed = typeof task.soalList === "string" ? JSON.parse(task.soalList) : task.soalList;
      if (Array.isArray(parsed)) return parsed as QuizQuestion[];
    } catch (e) {
      console.error("Failed to parse soalList", e);
    }
    return [];
  };

  // 4. Anti-cheat / Quiz Monitoring API
  const handleStartQuiz = (task: Tugas) => {
    setActiveTask(task);
    setActiveQuizId(task.id);
    setQuizStartTime(new Date());
    setCheatsCount(0);
    setCheatsLog([]);
    setDeviceWasOff(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});

    const questions = getQuizQuestions(task);
    if (questions.length === 0) {
      window.open(task.gform || "", "_blank");
    }
  };

  const handleSubmitInternalQuiz = () => {
    if (!activeTask || !quizStartTime) return;
    const questions = getQuizQuestions(activeTask);
    if (questions.length === 0) return;

    const unansweredIndices: number[] = [];
    questions.forEach((_, idx) => {
      if (selectedAnswers[idx] === undefined) {
        unansweredIndices.push(idx + 1);
      }
    });

    if (unansweredIndices.length > 0) {
      const confirmSubmit = window.confirm(
        currentLangMode === "en" 
          ? `You have not answered questions: ${unansweredIndices.join(", ")}. Do you want to submit anyway?`
          : `Ananda belum menjawab soal nomor: ${unansweredIndices.join(", ")}. Yakin ingin mengumpulkan?`
      );
      if (!confirmSubmit) return;
    }

    setLoading(true);

    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.jawabanBenarIndex) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const durationMin = Math.round((new Date().getTime() - quizStartTime.getTime()) / 60000);

    fetchFromProxy({
      action: "inputNilai",
      nisn: user.nis,
      nama: user.nama,
      kelas: user.kelas,
      mapel: activeTask.mapel,
      semester: activeTask.semester,
      tugasId: activeTask.id,
      link: "KUIS-INTERAKTIF-APP",
      nilaiFinal: score,
      nilaiAI: score,
      reviewAI: `Menyelesaikan kuis interaktif via aplikasi. Jawaban benar: ${correctCount}/${questions.length}. Pelanggaran fokus layar: ${cheatsCount} kali.`,
      starWaktu: 5,
      starKualitas: Math.min(10, Math.round(score / 10)),
    })
      .then(() => {
        return fetchFromProxy({
          action: "logIntegritasKuis",
          nisn: user.nis,
          nama: user.nama,
          tugasId: activeTask.id,
          jumlahPelanggaran: cheatsCount,
          detailLog: cheatsLog.join("; "),
          durasiMin: durationMin
        });
      })
      .then(() => {
        alert(currentLangMode === "ar" 
          ? `الحمد لله! تم إرسال إجابتك. درجتك: ${score}/100`
          : (currentLangMode === "en" ? `Alhamdulillah! Your quiz has been submitted. Score: ${score}/100` : `Alhamdulillah! Kuis berhasil diselesaikan. Nilai Anda: ${score}/100`)
        );
        setActiveQuizId(null);
        setActiveTask(null);
        setQuizStartTime(null);
        loadDashboardData();
      })
      .catch((e) => {
        console.error("Save quiz score error: ", e);
        alert("Gagal mengirim jawaban kuis ke Google Sheets. Silakan coba lagi.");
      })
      .finally(() => setLoading(false));
  };

  // Visibility triggers
  useEffect(() => {
    if (!activeQuizId) return;

    const handleWindowBlur = () => {
      if (deviceWasOff) {
        setDeviceWasOff(false);
        return;
      }
      registerCheatIncident("Membuka aplikasi lain atau kehilangan fokus layar.");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        registerCheatIncident("Pindah tab browser / meminimalkan halaman kuis.");
      }
    };

    const handlePageHide = () => {
      setDeviceWasOff(true);
    };

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [activeQuizId, cheatsCount, deviceWasOff]);

  const registerCheatIncident = (description: string) => {
    setCheatsCount(prev => prev + 1);
    const nowStr = new Date().toLocaleTimeString("id-ID");
    setCheatsLog(prev => [...prev, `Pukul ${nowStr} — ${description}`]);
  };

  const handleFinishQuizSubmission = () => {
    if (!activeQuizId || !quizStartTime) return;

    const durationMin = Math.round((new Date().getTime() - quizStartTime.getTime()) / 60000);
    
    fetchFromProxy({
      action: "logIntegritasKuis",
      nisn: user.nis,
      nama: user.nama,
      tugasId: activeQuizId,
      jumlahPelanggaran: cheatsCount,
      detailLog: cheatsLog.join("; "),
      durasiMenit: durationMin
    })
      .then(() => {
        alert(currentLangMode === "ar" 
          ? "تم حفظ الجلسة! شكراً لك."
          : (currentLangMode === "en" ? "Quiz session saved. Thank you!" : "Alhamdulillah, kuis Anda berhasil disimpan dan didata!")
        );
        setActiveQuizId(null);
        setQuizStartTime(null);
        loadDashboardData();
      })
      .catch((e) => {
        console.error("Save integrity log error: ", e);
        alert("Gagal mengirim data log kuis. Namun hasil Google Form Anda tetap tersimpan resmi.");
        setActiveQuizId(null);
      });
  };

  // 5. Fetch studying transcript
  const handleLoadTranscript = () => {
    setShowTranskrip(true);
    setLoading(true);
    fetchFromProxy({ action: "getSiswaTranscript", nisn: user.nis })
      .then((res) => {
        if (res.status === "success") {
          setTranskripList(res.transkrip || []);
        }
      })
      .catch((err) => console.error("Error loaded transcript list:", err))
      .finally(() => setLoading(false));
  };

  // Find corresponding teacher
  const selectedMapelDetails = availableMapel.find(m => m.mapel === lockedMapel);
  const teacherLabel = selectedMapelDetails?.guruList ? selectedMapelDetails.guruList.join(", ") : "-";

  if (!isLocked) {
    return (
      <div id="lockMapelPage" className="max-w-md mx-auto my-12 text-center">
        <div className="text-5xl mb-3">📚🔒</div>
        <h2 className="text-2xl font-bold text-slate-900 font-serif mb-2">Yuk, Pilih Ruang Belajar!</h2>
        <p className="text-sm text-slate-500 mb-6">Pilih mata pelajaran & semester yang mau kamu pelajari sekarang. Dashboard kamu bakal otomatis rapi sesuai pilihan ini.</p>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-left">
          <label className="text-xs font-bold text-slate-600 block mb-1">Mata Pelajaran</label>
          <select 
            className="w-full p-2.5 border border-slate-200 rounded-lg mb-1 bg-slate-50 text-xs text-slate-800"
            value={lockedMapel}
            onChange={(e) => setLockedMapel(e.target.value)}
          >
            {availableMapel.map((m, idx) => (
              <option key={idx} value={m.mapel}>{m.mapel}</option>
            ))}
          </select>
          
          {selectedMapelDetails?.guruList && (
            <div className="text-xs text-slate-400 mb-4 ml-1">
              👩‍🏫 Diajar oleh: <span className="font-semibold text-slate-700">{teacherLabel}</span>
            </div>
          )}

          <label className="text-xs font-bold text-slate-600 block mb-1 mt-2">Semester</label>
          <select 
            className="w-full p-2.5 border border-slate-200 rounded-lg mb-6 bg-slate-50 text-xs text-slate-800"
            value={lockedSemester}
            onChange={(e) => setLockedSemester(e.target.value)}
          >
            <option value="1">Semester 1 (Ganjil)</option>
            <option value="2">Semester 2 (Genap)</option>
          </select>

          <button 
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition duration-200 shadow-sm cursor-pointer text-xs"
            onClick={handleLockIn}
          >
            KUNCI & MASUK DASHBOARD 🔓
          </button>
        </div>
      </div>
    );
  }

  const progressTotalTugas = studentProgress?.tugas?.total || 0;
  const progressPercentTugas = studentProgress?.tugas?.persenSelesai || 0;
  const progressTugasDinilai = studentProgress?.tugas?.dinilai || 0;
  const progressAverageNilai = studentProgress?.tugas?.rataRataNilai || "-";
  const progressPercentHadir = studentProgress?.presensi?.persenKehadiran || 0;
  const progressPresentCount = studentProgress?.presensi?.hadir || 0;
  const progressSakitCount = studentProgress?.presensi?.sakit || 0;
  const progressIzinCount = studentProgress?.presensi?.izin || 0;
  const progressAbsentCount = studentProgress?.presensi?.alpa || 0;

  return (
    <div className="space-y-4">
      {/* Dynamic @media print CSS for perfect transcript generation */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden;
          }
          #printAreaTranscript, #printAreaTranscript * {
            visibility: visible;
          }
          #printAreaTranscript {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header and top tools */}
      <div className="flex justify-between items-center flex-wrap gap-3 no-print">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">{t.dashboardTitle}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] text-slate-500 font-bold font-mono uppercase tracking-wider">PORTAL ACTIVE</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap text-[11px]">
          <button 
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition cursor-pointer shadow-sm"
            onClick={() => {
              setActiveTab("transkrip");
              setShowTranskrip(true);
              handleLoadTranscript();
            }}
          >
            📄 {t.transkripBtn}
          </button>
          <button 
            className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded transition cursor-pointer"
            onClick={() => setIsLocked(false)}
          >
            🔄 {t.gantiMapelBtn}
          </button>
          <button 
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded transition cursor-pointer"
            onClick={onLogout}
          >
            {t.keluarBtn}
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-150 text-emerald-850 p-3 rounded-lg text-xs flex items-center gap-2 no-print">
          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {currentLangMode === "ar" && (
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg space-y-1 no-print">
          <p className="font-arabic text-slate-800 text-right text-base font-semibold">مرحباً بك في لوحة التحكم! هنا نستخدم لغتين (العربية والإندونيسية) لتسهيل الفهم.</p>
          <p className="text-[11px] text-indigo-600 font-bold text-center">💡 Info: Khusus Ruang Bahasa Arab, instruksi disajikan dalam Dwibahasa (Arab - Indonesia).</p>
        </div>
      )}

      {/* Hero Welcome Card */}
      <div className="welcome-card rounded-xl p-5 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white border border-slate-800 shadow-md no-print">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-indigo-500 text-white flex items-center justify-center font-bold text-lg select-none">
              {(namaSiswaGsheet || user.nama).charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{namaSiswaGsheet || user.nama}</h3>
              <p className="text-[11px] text-slate-300 font-semibold flex flex-wrap gap-x-2 gap-y-0.5">
                <span>NISN {user.nis}</span>
                <span>• Kelas {user.kelas}</span>
                <span>• KKM {getKKM(user.kelas)}</span>
                {waliKelasGsheet && <span className="text-teal-300 font-bold">• Wali Kelas: {waliKelasGsheet}</span>}
              </p>
            </div>
          </div>
          <div className="bg-slate-800/85 px-3 py-1.5 rounded border border-slate-700 text-center md:text-right">
            <p className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase">Ruang Belajar Aktif</p>
            <p className="text-xs font-mono font-bold text-amber-300">{lockedMapel} (Sem {lockedSemester})</p>
          </div>
        </div>
        <p className="mt-3.5 text-xs italic text-slate-300 font-semibold">{randomGreeting || t.welcomeMsgDefault}</p>
        <p className="mt-2 text-[10px] font-mono text-slate-400 border-l-2 border-indigo-500 pl-2 font-semibold">Diajar oleh Ustadz/ah: {teacherLabel}</p>
      </div>

      {/* Tabs Navigation (Organized like teacher's panel) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-thin no-print">
        <button 
          className={`px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "beranda" && !showTranskrip
              ? "bg-[#02629e] text-white shadow-sm" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
          onClick={() => { setActiveTab("beranda"); setShowTranskrip(false); }}
        >
          🏠 Beranda Rekap
        </button>
        <button 
          className={`px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "materi" && !showTranskrip
              ? "bg-[#02629e] text-white shadow-sm" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
          onClick={() => { setActiveTab("materi"); setShowTranskrip(false); }}
        >
          📁 Materi &amp; Jadwal
        </button>
        <button 
          className={`px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "tugas" && !showTranskrip
              ? "bg-[#02629e] text-white shadow-sm" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
          onClick={() => { setActiveTab("tugas"); setShowTranskrip(false); }}
        >
          📝 Tugas &amp; Kuis
        </button>
        <button 
          className={`px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "presensi" && !showTranskrip
              ? "bg-[#02629e] text-white shadow-sm" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
          onClick={() => { setActiveTab("presensi"); setShowTranskrip(false); }}
        >
          🗓️ Kehadiran
        </button>
        <button 
          className={`px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "silabus" && !showTranskrip
              ? "bg-[#02629e] text-white shadow-sm" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
          onClick={() => { setActiveTab("silabus"); setShowTranskrip(false); }}
        >
          📚 Rencana Belajar
        </button>
        <button 
          className={`px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === "transkrip" || showTranskrip
              ? "bg-[#02629e] text-white shadow-sm" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
          onClick={() => { 
            setActiveTab("transkrip"); 
            setShowTranskrip(true);
            handleLoadTranscript();
          }}
        >
          📄 Transkrip &amp; Star Points
        </button>
      </div>

      {/* RENDER CONTENT PANEL */}
      
      {/* 1. BERANDA PANEL */}
      {activeTab === "beranda" && !showTranskrip && (
        <div className="space-y-4 no-print">
          {/* Progress Overview Grid */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1e3a5f]">Progres Belajar Kamu</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div className="text-xl font-bold font-mono text-slate-800">{progressPercentTugas}%</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{progressTugasDinilai}/{progressTotalTugas} Tugas Selesai</div>
                <div className="bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2 max-w-[150px] mx-auto">
                  <div 
                    className={`h-full transition-all duration-350 ${progressPercentTugas < 40 ? "bg-rose-500" : progressPercentTugas < 75 ? "bg-amber-500" : "bg-emerald-500"}`} 
                    style={{ width: `${progressPercentTugas}%` }}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center flex flex-col justify-center">
                <div className="text-xl font-bold font-mono text-slate-800">{progressAverageNilai}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rata-Rata Nilai</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div className="text-xl font-bold font-mono text-slate-800">{progressPercentHadir}%</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tingkat Kehadiran</div>
                <div className="bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2 max-w-[150px] mx-auto">
                  <div 
                    className={`h-full transition-all duration-350 ${progressPercentHadir < 80 ? "bg-rose-500" : "bg-emerald-500"}`} 
                    style={{ width: `${progressPercentHadir}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap justify-center text-[10px] pt-1">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold rounded">Hadir: {progressPresentCount}</span>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 font-bold rounded">Sakit: {progressSakitCount}</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 font-bold rounded">Izin: {progressIzinCount}</span>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 font-bold rounded">Alpa: {progressAbsentCount}</span>
            </div>
          </div>

          {/* Interactive Learning Activity Graph */}
          <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-1.5">
                  📈 Grafik Aktivitas Pembelajaran &amp; LMS
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tingkat penyelesaian harian pengerjaan materi, penugasan kuis, dan kehadiran jam kelas.
                </p>
              </div>
              <span className="text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-750 px-2.5 py-1 rounded font-bold font-mono uppercase">
                PRESTASI BELAJAR
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { day: "Senin", materi: 100, tugas: 80, absen: 100, title: "Pembahasan Teks Deskriptif", label: "93%" },
                { day: "Selasa", materi: 100, tugas: 100, absen: 100, title: "Kuis Grammar Khas", label: "100%" },
                { day: "Rabu", materi: 80, tugas: 50, absen: 100, title: "Adab Berdiskusi Islami", label: "76%" },
                { day: "Kamis", materi: 100, tugas: 90, absen: 100, title: "Uraian Menulis Mandiri", label: "96%" },
                { day: "Jumat", materi: 90, tugas: 0, absen: 100, title: "Penyebaran Materi Baru", label: "63%" }
              ].map((item, index) => {
                const average = Math.round((item.materi + item.tugas + item.absen) / 3);
                return (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center text-xs">
                    <div className="col-span-2 sm:col-span-1 font-bold text-slate-600">{item.day}</div>
                    <div className="col-span-8 sm:col-span-9 bg-slate-100 h-6 rounded-lg overflow-hidden border border-slate-200 flex items-center relative shadow-inner">
                      <div style={{ width: `${item.materi / 3}%` }} className="bg-sky-500 h-full" />
                      <div style={{ width: `${item.tugas / 3}%` }} className="bg-amber-500 h-full" />
                      <div style={{ width: `${item.absen / 3}%` }} className="bg-emerald-500 h-full" />
                      <span className="absolute left-3.5 text-[10px] font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-md">
                        📝 {item.title}
                      </span>
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-slate-800">
                      {average}%
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 flex-wrap justify-center text-[10px] uppercase font-bold tracking-wider pt-2.5 border-t border-slate-100 text-slate-500">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-sky-500"></span> Materi Dibaca</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Tugas Dikirim</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Kehadiran Kelas</span>
            </div>
          </div>

          {/* New Grafik Nilai (Standar KKM) */}
          <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-1.5">
                  📊 Grafik Capaian Nilai &amp; Evaluasi KKM
                </h3>
                <p className="text-[11px] text-slate-400">
                  Perbandingan pencapaian nilai individual tugas ke kuis terhadap standar kelulusan KKM.
                </p>
              </div>
              <div className="text-[10px] font-mono text-indigo-700 bg-indigo-150/60 border border-indigo-150 px-2.5 py-1 rounded font-bold">
                STANDAR KKM: {getKKM(user.kelas)}
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {tugas.length > 0 ? (
                tugas.map((task, idx) => {
                  const associatedGrade = nilai.find((n) => n.tugasId === task.id);
                  const isCompleted = !!associatedGrade;
                  const score = isCompleted ? Number(associatedGrade.nilai) || 0 : 0;
                  const kkmVal = getKKM(user.kelas);
                  const isAboveKkm = isCompleted && score >= kkmVal;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700 truncate max-w-[270px] sm:max-w-lg">
                          📌 {task.judul} {task.isQuiz && <span className="text-[9px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold">KUIS</span>}
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {isCompleted ? `${score}/100` : "Belum Dinilai"}
                        </span>
                      </div>
                      
                      <div className="relative w-full bg-slate-100 h-5 border border-slate-200 rounded-lg overflow-hidden flex items-center">
                        {/* KKM vertical marker line */}
                        <div 
                          className="absolute h-full border-r border-[#ff3333] z-20" 
                          style={{ left: `${kkmVal}%` }}
                          title={`KKM Standard: ${kkmVal}`}
                        />
                        
                        {isCompleted ? (
                          <div 
                            className={`h-full transition-all duration-350 ${isAboveKkm ? "bg-emerald-500" : "bg-rose-500"}`} 
                            style={{ width: `${score}%` }}
                          />
                        ) : (
                          <div className="h-full bg-slate-200 w-0" />
                        )}

                        <span className="absolute left-[calc(80%)+4px] text-[8px] font-bold text-red-600 bg-white/90 border border-red-100 px-1 rounded scale-90 z-25 font-mono">
                          Limit KKM {kkmVal}
                        </span>

                        <div className="absolute right-2 text-[9px] font-bold font-mono z-10 flex gap-2">
                          {isCompleted ? (
                            <span className={isAboveKkm ? "text-emerald-700 bg-emerald-50 px-1 border border-emerald-150 rounded" : "text-rose-700 bg-rose-50 px-1 border border-rose-150 rounded"}>
                              {isAboveKkm ? "✓ TUNTAS" : "⚠️ DI BAWAH KKM"}
                            </span>
                          ) : (
                            <span className="text-slate-500 bg-slate-50 px-1 border border-slate-150 rounded">BELUM MENGISI</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">Belum ada evaluasi atau tugas penugasan terekam.</p>
              )}
            </div>
          </div>

          {/* Academic standing notes */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#1e3a5f] flex items-center gap-1">
              📝 Keterangan Akademik &amp; Nasehat Belajar
            </h4>
            <div className="text-xs text-slate-600 leading-relaxed space-y-1.5 font-semibold">
              <p>
                Berdasarkan capaian kumulatif ruangan belajar ini, Ananda <b>{user.nama}</b> memiliki rata-rata nilai sebesar <b>{progressAverageNilai}</b> dibandingkan standar KKM mata pelajaran yaitu <b>{getKKM(user.kelas)}</b>.
              </p>
              <p className="text-[#02629e] font-bold">
                💡 Nasehat Ustadz/ah pengampu: "Ingatlah bahwa menuntut ilmu adalah ibadah mulia. Teruslah berikhtiar sungguh-sungguh, muraja'ah materi secara istiqomah, kumpulkan seluruh penugasan tepat waktu, dan nantikan evaluasi menarik berikutnya!"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. MATERI PANEL */}
      {activeTab === "materi" && !showTranskrip && (
        <div className="space-y-4 no-print">
          {/* Class Schedule Card */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.jadwalTitle}</h3>
            <div className="divide-y divide-slate-150 max-h-[250px] overflow-y-auto space-y-1.5 pr-1">
              {jadwal.length > 0 ? (
                jadwal.map((j, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 hover:bg-slate-55 border border-slate-100 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 text-xs">{j.hari}</span>
                      <p className="text-slate-400 mt-0.5 text-[10px] font-semibold">Pengajar: <span className="font-semibold text-slate-650">{j.guru}</span></p>
                    </div>
                    <div className="bg-indigo-50 text-indigo-700 border border-indigo-150 px-2.5 py-1 rounded font-mono font-bold text-[10px]">
                      {j.jamMulai} - {j.jamSelesai} ({j.ruangan || "Bilik Kelas"})
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">{t.kosongJadwal}</p>
              )}
            </div>
          </div>

          {/* Learning Materials Card */}
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.materiTitle}</h3>
              <a 
                href="https://drive.google.com/drive/folders/1v8AYYCtJoFQRNYtDHd16HMF30C1k5o8p"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 no-print"
                title="Buka Drive Rekap Materi Utama"
              >
                📂 Folder Materi Drive ➔
              </a>
            </div>
            
            <div className="divide-y divide-slate-150 max-h-[350px] overflow-y-auto space-y-1.5 pr-1">
              {materi.length > 0 ? (
                materi.map((m, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 hover:bg-slate-55 border border-slate-100 rounded-lg flex justify-between items-center gap-4">
                    <div>
                      <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold rounded mb-1">
                        {m.tipe}
                      </span>
                      <p className="font-bold text-slate-800 text-xs leading-snug">{m.judul}</p>
                      <p className="text-slate-400 mt-0.5 text-[10px] font-semibold">{m.desc}</p>
                    </div>
                    {m.link && m.link.startsWith("http") && (
                      <a 
                        href={m.link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded whitespace-nowrap text-[10px] cursor-pointer"
                      >
                        Buka File
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">{t.kosongMateri}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. TUGAS PANEL */}
      {activeTab === "tugas" && !showTranskrip && (
        <div className="space-y-4 no-print text-xs">
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.tugasTitle}</h3>
              <a 
                href="https://drive.google.com/drive/folders/1ePjPlRMtXcy2d7TNzhwN8Y1kTQY5XgPK"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 no-print"
                title="Buka Drive Rekap Tugas Utama"
              >
                📂 Hubungkan Pengumpulan Drive ➔
              </a>
            </div>
            
            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
              {tugas.length > 0 ? (
                tugas.map((task, idx) => {
                  const associatedGrade = nilai.find((n) => n.tugasId === task.id);
                  const isQuiz = task.isQuiz === true || task.isQuiz === "TRUE";
                  
                  let scoreIndicator = null;
                  if (associatedGrade) {
                    const stars = (Number(associatedGrade.starWaktu) || 0) + (Number(associatedGrade.starKualitas) || 0);
                    scoreIndicator = (
                      <div className="mt-2 text-xs flex flex-wrap gap-2 items-center font-bold">
                        <span className="text-indigo-600">Nilai: {associatedGrade.nilai}/100</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${associatedGrade.tuntas ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {associatedGrade.tuntas ? "TUNTAS" : "BELUM TUNTAS"}
                        </span>
                        <span className="inline-block bg-yellow-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px]">
                          🌟 {stars}/15 Stars
                        </span>
                      </div>
                    );
                  } else {
                    const labelSubmit = isQuiz ? t.kerjakanKuis : t.kirimJawaban;
                    scoreIndicator = (
                      <div className="mt-2 flex gap-2 items-center text-xs">
                        {isQuiz ? (
                          <button 
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[11px] cursor-pointer shadow-sm transition"
                            onClick={() => handleStartQuiz(task)}
                          >
                            {labelSubmit}
                          </button>
                        ) : (
                          <a 
                            href={task.gform} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[11px] inline-block shadow shadow-indigo-100"
                          >
                            {labelSubmit}
                          </a>
                        )}
                        <span className="px-2 py-1 bg-yellow-50 text-amber-700 border border-amber-250 text-[10px] rounded font-bold">Belum Dinilai</span>
                      </div>
                    );
                  }

                  const calendarEventLink = buildCalendarLink(
                    `${task.judul} (${task.kelas} - ${task.mapel})`, 
                    task.deadline, 
                    `Tugas Sekolah: ${task.judul}`
                  );

                  return (
                    <div key={idx} className="p-4 border-l-4 border-amber-500 bg-[#fbfcfe] rounded-r-xl space-y-1 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-gray-800 text-sm leading-tight inline-flex items-center gap-1.5">
                          {task.judul}
                          {isQuiz && <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded leading-none">QUIZ</span>}
                        </span>
                        <small className="text-gray-400 font-mono">({task.id})</small>
                      </div>
                      <p className="text-[11px] text-red-600 font-semibold mb-1">
                        ⏰ Deadline: {formatDate(task.deadline)}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed font-semibold">{task.desc}</p>
                      
                      {task.link && task.link.startsWith("http") && (
                        <p className="pt-1">
                          <a 
                            href={task.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs text-[#02629e] hover:underline font-bold inline-flex items-center gap-1"
                          >
                            📎 Download Lampiran Tugas
                          </a>
                        </p>
                      )}

                      <div className="pt-2 flex gap-3 flex-wrap items-center">
                        {scoreIndicator}
                        <a 
                          href={calendarEventLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] border border-gray-300 hover:bg-gray-50 px-2.5 py-1 rounded text-gray-650 font-bold"
                        >
                          📅 Add Calendar
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">{t.kosongTugas}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. PRESENSI PANEL */}
      {activeTab === "presensi" && !showTranskrip && (
        <div className="space-y-4 no-print text-xs">
          {sesiAktif && !sudahAbsenHariIni && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h4 className="font-bold text-amber-800 text-sm tracking-tight">{t.absenSesiTitle}</h4>
                <p className="text-[11px] text-amber-700 mt-0.5 font-semibold">{t.absenSesiDesc}</p>
              </div>
              <button 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded transition shadow-sm text-xs whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                disabled={absenLoading}
                onClick={handleQuickCheckIn}
              >
                {absenLoading ? <>⏳ Mencari GPS...</> : <>{t.absenBtn}</>}
              </button>
            </div>
          )}

          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.presensiTitle}</h3>
            
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto space-y-1.5 pr-1">
              {absensiMapel.length > 0 ? (
                absensiMapel.map((p, idx) => {
                  const statLabelClass = p.status === "Hadir" 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-250" 
                    : (p.status === "Sakit" ? "bg-amber-50 text-amber-700 border border-amber-250" : (p.status === "Izin" ? "bg-blue-50 text-blue-700 border border-blue-250" : "bg-rose-50 text-rose-700 border border-rose-250"));
                  return (
                    <div key={idx} className="p-2.5 bg-slate-50 hover:bg-slate-55 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-slate-700">{formatTanggalOnly(p.tanggal)}</span>
                        {p.jarakMeter && p.jarakMeter !== "-" && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-bold font-mono">📍 Terbaca {p.jarakMeter}m dari sekolah</p>
                        )}
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${statLabelClass}`}>{p.status}</span>
                        <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">🌟 {p.starKehadiran}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">{t.kosongPresensi}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. SILABUS PANEL */}
      {activeTab === "silabus" && !showTranskrip && (
        <div className="space-y-4 no-print text-xs">
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.silabusTitle}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto">
              {rencanaBelajar.length > 0 ? (
                rencanaBelajar.map((item, idx) => {
                  const statusCls = item.status === "Sudah Dipelajari" 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-250" 
                    : (item.status === "Sedang Dipelajari" ? "bg-amber-50 text-amber-700 border border-amber-250" : "bg-slate-100 text-slate-500 border border-slate-200");
                  
                  return (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-between gap-4 text-xs transition">
                      <div>
                        <span className="inline-block px-1.5 py-0.2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-[9px] font-bold mb-1">Unit {item.nomorUnit}</span>
                        <p className="font-bold text-slate-800 text-xs">{item.judulUnit}</p>
                        <p className="text-slate-400 mt-0.5 text-[10px] leading-tight font-semibold">{item.pokokBahasan}</p>
                      </div>
                      <span className={`px-2 py-0.5 inline-block whitespace-nowrap rounded font-bold ${statusCls} text-[9px]`}>
                        {item.status}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center md:col-span-2">Belum ada rencana materi silabus terdaftar.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. TRANSKRIP & STAR POINTS TAB (REKAP KHS DURABLE) */}
      {(activeTab === "transkrip" || showTranskrip) && (
        <div className="space-y-6 text-xs">
          <div className="flex justify-between items-center flex-wrap gap-4 no-print pb-2 border-b border-slate-150">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">📄 Transkrip &amp; Rekap Star Points</h2>
              <p className="text-[11px] text-slate-400">Silakan cetak atau unduh transkrip akumulatif belajar Ananda di bawah.</p>
            </div>
            <button 
              className="px-3.5 py-1.5 bg-slate-500 hover:bg-slate-600 text-white font-bold rounded-lg transition text-xs cursor-pointer"
              onClick={() => {
                setShowTranskrip(false);
                setActiveTab("beranda");
              }}
            >
              ◀ Kembali Ke Beranda
            </button>
          </div>
          
          <div id="printAreaTranscript" className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
              <h2 className="text-base font-extrabold text-slate-800 tracking-wider">SMAIT AL-ITTIHAD PEKANBARU</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">KARTU HASIL EVALUASI STUDI &amp; KAPITA SELEKTA STAR POINTS</p>
              <p className="text-[9px] font-mono text-indigo-600 font-bold">Smart Class LMS System — Email: info@smaitalittihad.sch.id</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-600 border-b border-slate-100 pb-4">
              <div><b>Nama Siswa:</b> <p className="text-slate-800 font-bold text-xs">{namaSiswaGsheet || user.nama}</p></div>
              <div><b>Nomor Induk / NISN:</b> <p className="text-slate-800 font-mono font-bold text-xs">{user.nis}</p></div>
              <div><b>Kelas Belajar:</b> <p className="text-slate-800 font-bold text-xs">Kelas {user.kelas}</p></div>
              <div><b>KKM Standar:</b> <p className="text-amber-700 font-mono font-bold text-xs">{getKKM(user.kelas)}</p></div>
            </div>

            {/* Attendance Projection Section */}
            <div className="bg-slate-50/70 border border-slate-200 p-4 rounded-xl space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#1e3a5f]">📊 Proyeksi Presensi &amp; Kehadiran Keseluruhan</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs pt-1">
                <div className="bg-white p-2 border border-slate-150 rounded">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Persentase</p>
                  <p className="text-sm font-mono font-extrabold text-indigo-700">{progressPercentHadir}%</p>
                </div>
                <div className="bg-white p-2 border border-slate-150 rounded">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Sesi Hadir</p>
                  <p className="text-sm font-mono font-extrabold text-emerald-600">{progressPresentCount}</p>
                </div>
                <div className="bg-white p-2 border border-slate-150 rounded">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Sesi Sakit</p>
                  <p className="text-sm font-mono font-extrabold text-amber-500">{progressSakitCount}</p>
                </div>
                <div className="bg-white p-2 border border-slate-150 rounded">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Sesi Izin</p>
                  <p className="text-sm font-mono font-extrabold text-blue-500">{progressIzinCount}</p>
                </div>
                <div className="bg-white p-2 border border-slate-150 rounded col-span-2 sm:col-span-1">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Absen / Alpa</p>
                  <p className="text-sm font-mono font-extrabold text-red-500">{progressAbsentCount}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold italic">
                * Keterangan Presensi: Kehadiran minimum adalah 80% dari total masa aktif belajar. Hasil kalkulasi: <b>{progressPercentHadir >= 80 ? "MEMENUHI SYARAT KELAS (TUNTAS)" : "BELUM MEMENUHI SYARAT (TUNTAS PARSIAL)"}</b>.
              </p>
            </div>

            {/* Subject summary table */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#1e3a5f]">📝 Rekapitulasi Rata-Rata Mata Pelajaran</h4>
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="p-2 border border-slate-250">Mata Pelajaran</th>
                    <th className="p-2 border border-slate-250 text-center">Semester</th>
                    <th className="p-2 border border-slate-250 text-center font-mono">KKM</th>
                    <th className="p-2 border border-slate-250 text-center">Rata-rata Nilai</th>
                    <th className="p-2 border border-slate-250 text-center">Keterangan</th>
                    <th className="p-2 border border-slate-250 text-center">Total Star Points</th>
                  </tr>
                </thead>
                <tbody>
                  {transkripList.length > 0 ? (
                    transkripList.map((g, idx) => {
                      const kkmVal = getKKM(user.kelas);
                      const isTuntas = (Number(g.rataRata) || 0) >= kkmVal || g.tuntas === true;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition border-b border-slate-200">
                          <td className="p-2 border border-slate-250 font-bold text-slate-800">{g.mapel}</td>
                          <td className="p-2 border border-slate-250 text-center text-slate-600">Semester {g.semester}</td>
                          <td className="p-2 border border-slate-250 text-center font-mono text-slate-500 font-bold">{kkmVal}</td>
                          <td className="p-2 border border-slate-250 text-center font-mono font-extrabold text-indigo-700">{g.rataRata}</td>
                          <td className="p-2 border border-slate-250 text-center">
                            {isTuntas ? (
                              <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 font-extrabold rounded text-[9px]">TUNTAS</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-extrabold rounded text-[9px]">BELUM TUNTAS</span>
                            )}
                          </td>
                          <td className="p-2 border border-slate-250 text-center font-bold">
                            🌟 {g.totalStar} / {g.maxStarPossible || 15}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border border-slate-250 font-bold text-slate-800">{lockedMapel}</td>
                      <td className="p-2 border border-slate-250 text-center text-slate-600">Semester {lockedSemester}</td>
                      <td className="p-2 border border-slate-250 text-center font-mono text-slate-500 font-bold">{getKKM(user.kelas)}</td>
                      <td className="p-2 border border-slate-250 text-center font-mono font-extrabold text-indigo-700">{progressAverageNilai}</td>
                      <td className="p-2 border border-slate-250 text-center">
                        {progressAverageNilai !== "-" && Number(progressAverageNilai) >= getKKM(user.kelas) ? (
                          <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 font-extrabold rounded text-[9px]">TUNTAS</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-extrabold rounded text-[9px]">BELUM TUNTAS</span>
                        )}
                      </td>
                      <td className="p-2 border border-slate-250 text-center font-bold">
                        🌟 {(studentProgress?.tugas?.dinilai || 0) * 10} / {(studentProgress?.tugas?.total || 0) * 15}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Granular evaluations list (seluruh rekap nilai tugas, proyek, kuis) */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#1e3a5f]">📝 Rincian Nilai Seluruh Penugasan, Proyek, &amp; Kuis</h4>
              <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="p-2 border border-slate-250 w-2/5">Nama Aktivitas Evaluasi</th>
                    <th className="p-2 border border-slate-250 text-center">Tipe Kategori</th>
                    <th className="p-2 border border-slate-250 text-center font-mono">KKM</th>
                    <th className="p-2 border border-slate-250 text-center">Nilai Angka</th>
                    <th className="p-2 border border-slate-250 text-center">Ketuntasan</th>
                    <th className="p-2 border border-slate-250 text-center">Star Points</th>
                  </tr>
                </thead>
                <tbody>
                  {tugas.length > 0 ? (
                    tugas.map((task, idx) => {
                      const grading = nilai.find(n => n.tugasId === task.id);
                      const isCompleted = !!grading;
                      const score = isCompleted ? Number(grading.nilai) || 0 : null;
                      const kkmVal = getKKM(user.kelas);
                      const isPassed = isCompleted && score !== null && score >= kkmVal;
                      const category = task.isQuiz === true || task.isQuiz === "TRUE" ? "Kuis" : (task.judul.toLowerCase().includes("proyek") ? "Proyek" : "Tugas");
                      const stars = isCompleted ? (Number(grading.starWaktu) || 0) + (Number(grading.starKualitas) || 0) : 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition border-b border-slate-200">
                          <td className="p-2 border border-slate-250">
                            <p className="font-bold text-slate-800">{task.judul}</p>
                            <p className="text-[9px] text-slate-400 font-semibold">{task.id} • Mapel: {task.mapel}</p>
                          </td>
                          <td className="p-2 border border-slate-250 text-center text-slate-600 font-semibold">{category}</td>
                          <td className="p-2 border border-slate-250 text-center font-mono text-slate-400 font-semibold">{kkmVal}</td>
                          <td className="p-2 border border-slate-250 text-center font-mono font-bold text-slate-800">{isCompleted ? score : <span className="text-slate-400 italic">Belum Mengisi</span>}</td>
                          <td className="p-2 border border-slate-250 text-center">
                            {isCompleted ? (
                              isPassed ? (
                                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-150 font-bold rounded text-[9px]">TUNTAS</span>
                              ) : (
                                <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 border border-rose-150 font-bold rounded text-[9px]">BELUM TUNTAS</span>
                              )
                            ) : (
                              <span className="text-slate-400 bg-slate-50 px-1.5 py-0.5 border border-slate-200 font-bold rounded text-[9px]">-</span>
                            )}
                          </td>
                          <td className="p-2 border border-slate-250 text-center font-bold text-slate-750">
                            {isCompleted ? `🌟 ${stars} Stars` : "-"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-400 p-4 italic">Tidak ditemukan data evaluasi mapel ini.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Block */}
            <div className="pt-8 flex justify-between text-center text-xs">
              <div>
                <p className="text-slate-400 font-bold">Guru Mata Pelajaran,</p>
                <div className="h-12" />
                <p className="font-bold text-slate-850 border-b border-slate-300 pb-0.5 uppercase">{teacherLabel && teacherLabel !== "-" ? teacherLabel : "Guru Pengampu"}</p>
                <p className="text-[10px] text-slate-400 font-mono">LMS SMART CLASS VERIFIED</p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 font-bold">Ditetapkan Pekanbaru,</p>
                <p className="font-semibold text-indigo-600 font-mono">{new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <div className="h-10" />
                <p className="font-extrabold text-slate-850 border-b border-slate-300 pb-0.5 uppercase">LMS SMART CLASS — SYSTEM VALID</p>
                <p className="text-[10px] text-green-600 font-mono font-bold">✔ DIGITAL VERIFIED SIGNATURE</p>
              </div>
            </div>
          </div>

          <button 
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition duration-200 shadow-sm cursor-pointer text-xs no-print"
            onClick={() => window.print()}
          >
            💾 Cetak / Unduh PDF Transkrip
          </button>
        </div>
      )}

      {/* Anti-Cheat Floating Panel / Interactive Quiz Playing Modal */}
      {activeQuizId && (() => {
        const questions = getQuizQuestions(activeTask);
        if (questions.length > 0) {
          const currentQuestion = questions[currentQuestionIndex];
          const isSelected = (choiceIdx: number) => selectedAnswers[currentQuestionIndex] === choiceIdx;

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
              <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
                
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50 rounded-t-xl">
                  <div>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-extrabold rounded text-[9px] uppercase tracking-wider block w-fit mb-1">
                      📝 LMS Interactive Quiz
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{activeTask?.judul}</h4>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-red-100 border border-red-200 text-red-700 font-bold font-mono text-[10px] rounded-full animate-pulse">
                      🛡️ Anti-Cheat Active
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-1">
                  <div 
                    className="bg-indigo-600 h-1 transition-all duration-150"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>

                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest"> Soal Nomor {currentQuestionIndex + 1} dari {questions.length}</span>
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded">🎯 {currentQuestion.poin || 10} Points</span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 leading-normal bg-slate-50 border border-slate-100 p-3.5 rounded-lg whitespace-pre-wrap">{currentQuestion.pertanyaan}</p>

                  <div className="space-y-2 mt-4">
                    {currentQuestion.pilihan.map((choice, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      return (
                        <button
                          key={oIdx}
                          onClick={() => setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: oIdx }))}
                          className={`w-full p-3 text-left rounded-lg text-xs font-semibold cursor-pointer border flex items-center gap-3 transition-colors ${
                            isSelected(oIdx)
                              ? "bg-indigo-50/70 border-indigo-500 text-indigo-900 shadow-sm"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-55"
                          }`}
                        >
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-extrabold ${
                            isSelected(oIdx) ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                          }`}>{letter}</span>
                          <span className="flex-1 leading-snug">{choice}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[10px] text-amber-800 block leading-relaxed font-semibold">
                    ⚠️ <span className="font-extrabold">Integritas Monitor</span>: {cheatsCount} kali terdeteksi keluar dari layar fokus kuis. Aktivitas screen-focus terekam otomatis di rekap nilai ustadz/ah.
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2 justify-between rounded-b-xl border-collapse">
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ⬅️ Kembali
                  </button>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs cursor-pointer"
                    >
                      Berikutnya ➡️
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitInternalQuiz}
                      disabled={loading}
                      className="px-5 py-1.5 bg-indigo-600 hover:bg-[#4338ca] text-white font-bold rounded text-xs cursor-pointer inline-flex items-center gap-1"
                    >
                      🚀 Kumpulkan Kuis
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        }

        return (
          <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[380px] bg-white border border-slate-300 rounded-xl p-4 shadow-xl z-[1000] space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base animate-pulse">📝</span>
              <p className="text-sm font-bold text-slate-900">Kuis sedang dikerjakan...</p>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">Setelah selesai mengisi dan mengklik "Kirim/Submit" di Google Form kuis, silakan kembali ke sini lalu klik konfirmasi di bawah ini.</p>
            <div className="p-2 bg-amber-50 rounded text-[10px] font-mono font-bold text-amber-800 text-center border border-amber-200">
              Log Pemantauan Layar: {cheatsCount} kali terdeteksi pindah fokus
            </div>
            <button 
              onClick={ handleFinishQuizSubmission } 
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs transition cursor-pointer shadow-sm"
            >
              ✅ Saya Sudah Selesai &amp; Submit
            </button>
          </div>
        );
      })()}
    </div>
  );
}
