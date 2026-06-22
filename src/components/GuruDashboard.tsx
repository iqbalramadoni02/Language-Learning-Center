import React, { useState, useEffect } from "react";
import { Guru, Materi, Tugas, Presensi, PresensiUmum, Jadwal, QuizQuestion } from "../types";
import { 
  fetchFromProxy, 
  formatDate, 
  formatTanggalOnly, 
  getKKM, 
  runAiCheck, 
  generateQuizAI,
  formatJam,
  formatJamSelesai,
  getMinutesFromTime,
  DAY_WEIGHTS
} from "../utils";

import SyllabusTab from "./SyllabusTab";
import RaportTab from "./RaportTab";
import MassGradingModal from "./MassGradingModal";

interface GuruDashboardProps {
  user: Guru;
  onLogout: () => void;
}

const CLASSES = ["X 1","X 2","X 3","X 4","XI 1","XI 2","XI 3","XI 4","XII 1","XII 2","XII 3","XII 4"];

export default function GuruDashboard({ user, onLogout }: GuruDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("beranda");
  const [loading, setLoading] = useState<boolean>(false);
  const [globalSiswaList, setGlobalSiswaList] = useState<any[]>([]);

  // Cache lists
  const [materiList, setMateriList] = useState<Materi[]>([]);
  const [tugasList, setTugasList] = useState<Tugas[]>([]);
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [nilaiList, setNilaiList] = useState<any[]>([]);
  const [presensiMapelList, setPresensiMapelList] = useState<Presensi[]>([]);
  const [presensiGeneralList, setPresensiGeneralList] = useState<PresensiUmum[]>([]);

  // 1. Beranda home items
  const [pendingTugas, setPendingTugas] = useState<any[]>([]);
  const [incompleteAbesn, setIncompleteAbsen] = useState<any[]>([]);
  const [suspiciousQuizzes, setSuspiciousQuizzes] = useState<any[]>([]);

  // Filters for lists
  const [filterMapel, setFilterMapel] = useState<string>(user.mapelList[0] || "");
  const [filterKelas, setFilterKelas] = useState<string>("X 1");
  const [ledgerSemester, setLedgerSemester] = useState<string>("1");
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [ledgerSilabus, setLedgerSilabus] = useState<any[]>([]);
  const [ledgerTampil, setLedgerTampil] = useState<boolean>(false);

  // Organization Filters for active materials and tasks list
  const [materiFilterKelas, setMateriFilterKelas] = useState<string>("Semua");
  const [materiFilterMapel, setMateriFilterMapel] = useState<string>("Semua");
  const [tugasFilterKelas, setTugasFilterKelas] = useState<string>("Semua");
  const [tugasFilterMapel, setTugasFilterMapel] = useState<string>("Semua");

  // Active modal mass grading
  const [activeMassGradingTugasId, setActiveMassGradingTugasId] = useState<string | null>(null);

  // Form states - Publish Materi
  const [pmKelas, setPmKelas] = useState<Record<string, boolean>>({});
  const [pmMapel, setPmMapel] = useState<string>(user.mapelList[0] || "");
  const [pmSemester, setPmSemester] = useState<string>("1");
  const [pmJudul, setPmJudul] = useState<string>("Materi 1");
  const [pmTipe, setPmTipe] = useState<string>("Instruction");
  const [pmDesc, setPmDesc] = useState<string>("");
  const [pmLink, setPmLink] = useState<string>("");

  // Form states - Publish Tugas / Kuis
  const [ptKelas, setPtKelas] = useState<Record<string, boolean>>({});
  const [ptMapel, setPtMapel] = useState<string>(user.mapelList[0] || "");
  const [ptSemester, setPtSemester] = useState<string>("1");
  const [ptUnitSilabus, setPtUnitSilabus] = useState<string>("");
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [ptJudul, setPtJudul] = useState<string>("");
  const [ptDeadline, setPtDeadline] = useState<string>("");
  const [ptIsQuiz, setPtIsQuiz] = useState<boolean>(false);
  const [ptTipe, setPtTipe] = useState<string>("Instruction");
  const [ptDesc, setPtDesc] = useState<string>("");
  const [ptLink, setPtLink] = useState<string>("");

  // AI Quiz Creator Sub-Form
  const [quizCreatorMode, setQuizCreatorMode] = useState<"manual" | "ai">("manual");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    { pertanyaan: "", pilihan: ["", "", "", ""], jawabanBenarIndex: 0, poin: 10 }
  ]);
  const [aiQuizTopik, setAiQuizTopik] = useState<string>("");
  const [aiQuizJumlah, setAiQuizJumlah] = useState<number>(5);
  const [aiQuizLoading, setAiQuizLoading] = useState<boolean>(false);

  // Form states - Jadwal
  const [pjHari, setPjHari] = useState<string>("Senin");
  const [pjJamMulai, setPjJamMulai] = useState<string>("07:30");
  const [pjJamSelesai, setPjJamSelesai] = useState<string>("09:00");
  const [pjKelas, setPjKelas] = useState<string>("X 1");
  const [pjMapel, setPjMapel] = useState<string>(user.mapelList[0] || "");
  const [editingJadwalId, setEditingJadwalId] = useState<string | null>(null);
  const [editingMateriId, setEditingMateriId] = useState<string | null>(null);
  const [editingTugasId, setEditingTugasId] = useState<string | null>(null);

  // Form states - Quick Attendance Check-in
  const [pacKelas, setPacKelas] = useState<string>("X 1");
  const [pacMapel, setPacMapel] = useState<string>(user.mapelList[0] || "");
  const [pacSemester, setPacSemester] = useState<string>("1");
  const [pacTanggal, setPacTanggal] = useState<string>(new Date().toISOString().substring(0, 10));
  const [pacSiswaCheckboxes, setPacSiswaCheckboxes] = useState<Record<string, boolean>>({});
  const [pacLoaded, setPacLoaded] = useState<boolean>(false);

  // Form states - Single Attendance edit
  const [paKelas, setPaKelas] = useState<string>("X 1");
  const [paSiswa, setPaSiswa] = useState<string>("");
  const [paMapel, setPaMapel] = useState<string>(user.mapelList[0] || "");
  const [paSemester, setPaSemester] = useState<string>("1");
  const [paTanggal, setPaTanggal] = useState<string>(new Date().toISOString().substring(0, 10));
  const [paStatus, setPaStatus] = useState<string>("Hadir");
  const [paStarKehadiran, setPaStarKehadiran] = useState<string>("3");

  // Form states - Evaluasi Nilai harian & AI Checker
  const [neKelas, setNeKelas] = useState<string>("X 1");
  const [neSiswa, setNeSiswa] = useState<string>("");
  const [neMapel, setNeMapel] = useState<string>(user.mapelList[0] || "");
  const [neSemester, setNeSemester] = useState<string>("1");
  const [neTugasId, setNeTugasId] = useState<string>("");
  const [neLink, setNeLink] = useState<string>("");
  const [neNilaiManual, setNeNilaiManual] = useState<string>("");
  const [neStarWaktu, setNeStarWaktu] = useState<string>("5");
  const [neStarKualitas, setNeStarKualitas] = useState<string>("0");
  const [neNotesReview, setNeNotesReview] = useState<string>("");
  const [aeLinkInput, setAeLinkInput] = useState<string>("");
  const [aeTugasInput, setAeTugasInput] = useState<string>("");
  const [aeResult, setAeResult] = useState<any>(null);
  const [aeLoading, setAeLoading] = useState<boolean>(false);

  // Integrity query logs
  const [integritySiswaNisn, setIntegritySiswaNisn] = useState<string>("");
  const [integrityTugasId, setIntegrityTugasId] = useState<string>("");
  const [integrityLogData, setIntegrityLogData] = useState<string>("");

  useEffect(() => {
    loadLMSData();
  }, []);

  const loadLMSData = () => {
    setLoading(true);
    // getGuruDashboard
    fetchFromProxy({ action: "getGuruDashboard", email: user.email })
      .then((res) => {
        setGlobalSiswaList(res.daftarSiswa || []);
        
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
        setMateriList(finalMateri);

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
        setTugasList(finalTugas);
        
        let rawJadwal = res.jadwal || [];
        // Apply local storage overrides for schedules (jadwal)
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
        setJadwalList(formattedJadwal);

        setNilaiList(res.nilai || []);
        setPresensiMapelList(res.presensiMapel || []);
        setPresensiGeneralList(res.absensiHariIni || []);
      })
      .catch((err) => console.error("Error loaded core dashboard database data:", err))
      .finally(() => setLoading(false));

    // getDashboardRingkasGuru
    loadBerandaInfo();
  };

  const loadBerandaInfo = () => {
    fetchFromProxy({ action: "getDashboardRingkasGuru", mapelList: user.mapelList })
      .then((res) => {
        if (res.status === "success") {
          setPendingTugas(res.tugasBelumDinilai || []);
          setIncompleteAbsen(res.kelasBelumAbsenHariIni || []);
          setSuspiciousQuizzes(res.kuisPerluDitinjau || []);
        }
      })
      .catch((e) => console.error("Error loaded summaries beranda info:", e));
  };

  const handleStartEditMateri = (m: Materi) => {
    const item = m as any;
    setEditingMateriId(item.id || null);
    setPmJudul(item.judul || "");
    setPmDesc(item.desc || item.deskripsi || "");
    setPmLink(item.link || item.fileName || "");
    setPmMapel(item.mapel || user.mapelList[0] || "");
    setPmSemester(item.semester || "1");
    setPmTipe(item.tipe || item.fileType || "Instruction");
    const kChecked: Record<string, boolean> = {};
    if (item.kelas) {
      kChecked[item.kelas] = true;
    }
    setPmKelas(kChecked);
  };

  const handleCancelEditMateri = () => {
    setEditingMateriId(null);
    setPmJudul("");
    setPmDesc("");
    setPmLink("");
    setPmMapel(user.mapelList[0] || "");
    setPmSemester("1");
    setPmTipe("Instruction");
    setPmKelas({});
  };

  const handleDeleteMateri = (id: string | undefined) => {
    if (!id) return;
    if (!confirm("Bismillah, hapus materi ini secara permanen?")) return;
    setLoading(true);
    fetchFromProxy({ action: "deleteMateri", id })
      .then(() => {
        try {
          const deletedMateri = JSON.parse(localStorage.getItem("deleted_materi") || "[]");
          if (!deletedMateri.includes(id)) {
            deletedMateri.push(id);
            localStorage.setItem("deleted_materi", JSON.stringify(deletedMateri));
          }
        } catch (e) {
          console.error(e);
        }
        loadLMSData();
      })
      .catch((e) => alert("Failed to delete material: " + e.message))
      .finally(() => setLoading(false));
  };

  // 1. Publish & Update Materi multi classes
  const handlePublishMateri = () => {
    const listKelasInput = Object.keys(pmKelas).filter((k) => pmKelas[k]);
    if (listKelasInput.length === 0) {
      alert("Centang minimal 1 Kelas tujuan publishing, Ustadz/ah.");
      return;
    }
    if (!pmJudul) {
      alert("Tuliskan judul materi pembelajaran.");
      return;
    }

    setLoading(true);
    const actionPayload = editingMateriId ? {
      action: "updateMateri",
      id: editingMateriId,
      judul: pmJudul,
      kelas: listKelasInput[0],
      mapel: pmMapel,
      semester: pmSemester,
      fileType: pmTipe,
      deskripsi: pmDesc,
      fileName: pmLink,
    } : {
      action: "publishMateriMultiKelas",
      judul: pmJudul,
      kelasList: listKelasInput,
      mapel: pmMapel,
      semester: pmSemester,
      fileType: pmTipe,
      deskripsi: pmDesc,
      fileData: "",
      fileName: pmLink,
    };

    fetchFromProxy(actionPayload)
      .then((res) => {
        if (editingMateriId) {
          try {
            const editedMateri = JSON.parse(localStorage.getItem("edited_materi") || "[]");
            const updatedItem = {
              id: editingMateriId,
              judul: pmJudul,
              kelas: listKelasInput[0],
              mapel: pmMapel,
              semester: pmSemester,
              tipe: pmTipe,
              fileType: pmTipe,
              desc: pmDesc,
              deskripsi: pmDesc,
              link: pmLink,
              fileName: pmLink,
            };
            const index = editedMateri.findIndex((em: any) => em.id === editingMateriId);
            if (index > -1) {
              editedMateri[index] = updatedItem;
            } else {
              editedMateri.push(updatedItem);
            }
            localStorage.setItem("edited_materi", JSON.stringify(editedMateri));
          } catch (e) {
            console.error(e);
          }
          alert("Bismillah, perubahan materi berhasil disimpan!");
        } else {
          alert(res.message || "Bismillah, materi berhasil terpublikasikan!");
        }
        handleCancelEditMateri();
        loadLMSData();
      })
      .catch((e) => alert("Publish / Update error: " + e.message))
      .finally(() => setLoading(false));
  };

  const handleStartEditTugas = (t: Tugas) => {
    const item = t as any;
    setEditingTugasId(item.id || null);
    setPtJudul(item.judul || "");
    setPtDesc(item.desc || item.deskripsi || "");
    setPtLink(item.link || item.fileName || "");
    setPtMapel(item.mapel || user.mapelList[0] || "");
    setPtSemester(item.semester || "1");
    setPtUnitSilabus(item.unitSilabus || "");
    setPtDeadline(item.deadline || "");
    const boolIsQuiz = item.isQuiz === true || item.isQuiz === "TRUE";
    setPtIsQuiz(boolIsQuiz);
    setPtTipe(item.tipe || item.fileType || "Instruction");
    const kChecked: Record<string, boolean> = {};
    if (item.kelas) {
      kChecked[item.kelas] = true;
    }
    setPtKelas(kChecked);

    if (boolIsQuiz) {
      let questionsArr: any[] = [];
      if (Array.isArray(item.soalList)) {
        questionsArr = item.soalList;
      } else if (typeof item.soalList === "string") {
        try {
          questionsArr = JSON.parse(item.soalList);
        } catch {
          questionsArr = [];
        }
      }
      if (questionsArr.length > 0) {
        setQuizQuestions(questionsArr);
      } else {
        setQuizQuestions([{ pertanyaan: "", pilihan: ["", "", "", ""], jawabanBenarIndex: 0, poin: 10 }]);
      }
    } else {
      setQuizQuestions([{ pertanyaan: "", pilihan: ["", "", "", ""], jawabanBenarIndex: 0, poin: 10 }]);
    }
  };

  const handleCancelEditTugas = () => {
    setEditingTugasId(null);
    setPtJudul("");
    setPtDesc("");
    setPtLink("");
    setPtMapel(user.mapelList[0] || "");
    setPtSemester("1");
    setPtUnitSilabus("");
    setPtDeadline("");
    setPtIsQuiz(false);
    setPtTipe("Instruction");
    setPtKelas({});
    setQuizQuestions([{ pertanyaan: "", pilihan: ["", "", "", ""], jawabanBenarIndex: 0, poin: 10 }]);
  };

  const handleDeleteTugas = (id: string | undefined) => {
    if (!id) return;
    if (!confirm("Bismillah, hapus tugas/kuis ini secara permanen?")) return;
    setLoading(true);
    fetchFromProxy({ action: "deleteTugas", id })
      .then(() => {
        try {
          const deletedTugas = JSON.parse(localStorage.getItem("deleted_tugas") || "[]");
          if (!deletedTugas.includes(id)) {
            deletedTugas.push(id);
            localStorage.setItem("deleted_tugas", JSON.stringify(deletedTugas));
          }
        } catch (e) {
          console.error(e);
        }
        loadLMSData();
      })
      .catch((e) => alert("Failed to delete tasks: " + e.message))
      .finally(() => setLoading(false));
  };

  // 2. Publish & Update Tugas / Quiz multi-class
  const handlePublishTugas = () => {
    const listKelasInput = Object.keys(ptKelas).filter((k) => ptKelas[k]);
    if (listKelasInput.length === 0) {
      alert("Centang minimal 1 Kelas tujuan publishing.");
      return;
    }
    if (!ptJudul) {
      alert("Tuliskan nama/judul penugasan.");
      return;
    }
    if (!ptDeadline) {
      alert("Tentukan batas tenggat waktu (deadline).");
      return;
    }

    setLoading(true);
    const payload: any = editingTugasId ? {
      action: "updateTugas",
      id: editingTugasId,
      judul: ptJudul,
      kelas: listKelasInput[0],
      mapel: ptMapel,
      semester: ptSemester,
      unitSilabus: ptUnitSilabus,
      deadline: ptDeadline,
      fileType: ptTipe,
      deskripsi: ptDesc,
      isQuiz: ptIsQuiz,
    } : {
      action: "publishTugasMultiKelas",
      judul: ptJudul,
      kelasList: listKelasInput,
      mapel: ptMapel,
      semester: ptSemester,
      unitSilabus: ptUnitSilabus,
      deadline: ptDeadline,
      fileType: ptTipe,
      deskripsi: ptDesc,
      isQuiz: ptIsQuiz,
    };

    if (ptIsQuiz) {
      payload.soalList = quizQuestions.filter((q) => q.pertanyaan && q.pilihan.every(p => p.trim()));
      payload.fileType = "Instruction";
    } else {
      payload.fileName = ptLink;
    }

    fetchFromProxy(payload)
      .then((res) => {
        if (editingTugasId) {
          try {
            const editedTugas = JSON.parse(localStorage.getItem("edited_tugas") || "[]");
            const updatedItem = {
              id: editingTugasId,
              judul: ptJudul,
              kelas: listKelasInput[0],
              mapel: ptMapel,
              semester: ptSemester,
              unitSilabus: ptUnitSilabus,
              deadline: ptDeadline,
              isQuiz: ptIsQuiz,
              tipe: ptTipe,
              fileType: ptTipe,
              desc: ptDesc,
              deskripsi: ptDesc,
              link: ptLink,
              fileName: ptLink,
              soalList: ptIsQuiz ? quizQuestions.filter((q) => q.pertanyaan && q.pilihan.every(p => p.trim())) : undefined,
            };
            const index = editedTugas.findIndex((et: any) => et.id === editingTugasId);
            if (index > -1) {
              editedTugas[index] = updatedItem;
            } else {
              editedTugas.push(updatedItem);
            }
            localStorage.setItem("edited_tugas", JSON.stringify(editedTugas));
          } catch (e) {
            console.error(e);
          }
          alert("Bismillah, perubahan tugas berhasil disimpan!");
        } else {
          alert(res.message || "Bismillah, tugas baru berhasil terbit dan terintegrasi!");
        }
        handleCancelEditTugas();
        loadLMSData();
      })
      .catch((e) => alert("Publish / Update error: " + e.message))
      .finally(() => setLoading(false));
  };

  const handleTriggerQuizAi = () => {
    if (!aiQuizTopik) {
      alert("Tentukan topik kuis terlebih dahulu.");
      return;
    }
    setAiQuizLoading(true);
    generateQuizAI(aiQuizTopik, ptMapel, aiQuizJumlah)
      .then((res) => {
        if (res.status === "success" && res.soalList) {
          setQuizQuestions(res.soalList);
          alert(`Bismillah, AI berhasil merumuskan ${res.soalList.length} butir kuis soal!`);
        } else {
          alert("Layanan AI gagal: " + res.message);
        }
      })
      .catch((e) => alert("Layanan AI Gemini error: " + e.message))
      .finally(() => setAiQuizLoading(false));
  };

  const addManualSoal = () => {
    setQuizQuestions((prev) => [
      ...prev,
      { pertanyaan: "", pilihan: ["", "", "", ""], jawabanBenarIndex: 0, poin: 10 },
    ]);
  };

  const updateManualSoalField = (idx: number, field: string, val: any) => {
    setQuizQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const updateManualSoalOption = (soalIdx: number, optIdx: number, val: string) => {
    setQuizQuestions((prev) => {
      const copy = [...prev];
      const optCopy = [...copy[soalIdx].pilihan];
      optCopy[optIdx] = val;
      copy[soalIdx] = { ...copy[soalIdx], pilihan: optCopy };
      return copy;
    });
  };

  const customTimetableSlots = (): string[] => {
    const slotsMap = new Set<string>();
    jadwalList.forEach(j => {
      if (j.jamMulai && j.jamSelesai) {
        const start = formatJam(j.jamMulai);
        const end = formatJamSelesai(j.jamSelesai);
        slotsMap.add(`${start} - ${end}`);
      }
    });
    // Ensure standard slots are present if there are none yet
    if (slotsMap.size === 0) {
      slotsMap.add("08:00 - 09:30");
      slotsMap.add("10:00 - 11:30");
    }
    return Array.from(slotsMap).sort((a, b) => {
      const startA = a.split(" - ")[0];
      const startB = b.split(" - ")[0];
      return getMinutesFromTime(startA) - getMinutesFromTime(startB);
    });
  };

  // 3. Save schedules
  const handleStartEditJadwal = (j: Jadwal) => {
    setEditingJadwalId(j.id);
    setPjHari(j.hari || "Senin");
    setPjJamMulai(j.jamMulai || "07:30");
    setPjJamSelesai(j.jamSelesai || "09:00");
    setPjKelas(j.kelas || "X 1");
    setPjMapel(j.mapel || user.mapelList[0] || "");
  };

  const handleCancelEditJadwal = () => {
    setEditingJadwalId(null);
    setPjHari("Senin");
    setPjJamMulai("07:30");
    setPjJamSelesai("09:00");
    setPjKelas("X 1");
    setPjMapel(user.mapelList[0] || "");
  };

  const handleSaveJadwal = () => {
    if (!pjHari || !pjJamMulai || !pjJamSelesai) return;
    setLoading(true);
    fetchFromProxy({
      action: "updateJadwal",
      id: editingJadwalId || undefined,
      hari: pjHari,
      jamMulai: pjJamMulai,
      jamSelesai: pjJamSelesai,
      kelas: pjKelas,
      mapel: pjMapel,
      guru: user.nama,
    })
      .then((res) => {
        if (editingJadwalId) {
          try {
            const editedJadwal = JSON.parse(localStorage.getItem("edited_jadwal") || "[]");
            const updatedItem = {
              id: editingJadwalId,
              hari: pjHari,
              jamMulai: pjJamMulai,
              jamSelesai: pjJamSelesai,
              kelas: pjKelas,
              mapel: pjMapel,
              guru: user.nama
            };
            const index = editedJadwal.findIndex((ej: any) => ej.id === editingJadwalId);
            if (index > -1) {
              editedJadwal[index] = updatedItem;
            } else {
              editedJadwal.push(updatedItem);
            }
            localStorage.setItem("edited_jadwal", JSON.stringify(editedJadwal));
          } catch (e) {
            console.error(e);
          }
          alert("Bismillah, perubahan jadwal berhasil disimpan!");
        } else {
          alert("Bismillah, jadwal belajar berhasil terdaftar!");
        }
        handleCancelEditJadwal();
        loadLMSData();
      })
      .catch((e) => alert("Error saving schedules: " + e.message))
      .finally(() => setLoading(false));
  };

  const handleDeleteJadwal = (id: string) => {
    if (!confirm("Bismillah, hapus jadwal ini secara permanen?")) return;
    setLoading(true);
    fetchFromProxy({ action: "deleteJadwal", id })
      .then(() => {
        try {
          const deletedJadwal = JSON.parse(localStorage.getItem("deleted_jadwal") || "[]");
          if (!deletedJadwal.includes(id)) {
            deletedJadwal.push(id);
            localStorage.setItem("deleted_jadwal", JSON.stringify(deletedJadwal));
          }
        } catch (e) {
          console.error(e);
        }
        loadLMSData();
      })
      .catch((e) => alert("Failed to delete schedules: " + e.message))
      .finally(() => setLoading(false));
  };

  // Load subject-syllabus units dynamically for prompt link selection
  useEffect(() => {
    if (activeTab === "tugas" && ptKelas) {
      const activeK = Object.keys(ptKelas).find(k => ptKelas[k]) || "X 1";
      fetchFromProxy({
        action: "getSilabus",
        kelas: activeK,
        mapel: ptMapel,
        semester: ptSemester,
      })
        .then((res) => {
          setAvailableUnits(res.silabus || []);
        })
        .catch((e) => console.error("Error loaded helper units: ", e));
    }
  }, [ptKelas, ptMapel, ptSemester, activeTab]);

  // Load pupil options dynamically for evaluate harian dropdowns
  useEffect(() => {
    const listSiswaKelas = globalSiswaList.filter((s) => s.kelas === neKelas || s.kelas === paKelas);
    if (listSiswaKelas.length > 0) {
      setNeSiswa(`${listSiswaKelas[0].nis}|${listSiswaKelas[0].nama}`);
      setPaSiswa(`${listSiswaKelas[0].nis}|${listSiswaKelas[0].nama}`);
    } else {
      setNeSiswa("");
      setPaSiswa("");
    }
  }, [neKelas, paKelas, globalSiswaList]);

  // Form states - Attendances
  const handleLoadPresensiCepatSiswa = () => {
    const l = globalSiswaList.filter((s) => s.kelas === pacKelas);
    const checks: Record<string, boolean> = {};
    l.forEach((s) => {
      checks[s.nis] = true;
    });
    setPacSiswaCheckboxes(checks);
    setPacLoaded(true);
  };

  const handleSubmitPresensiCepat = () => {
    if (!pacKelas || !pacMapel || !pacTanggal) {
      alert("Lengkapi Kelas, Mapel, dan Tanggal terlebih dahulu.");
      return;
    }

    const pupils = globalSiswaList.filter((s) => s.kelas === pacKelas);
    if (pupils.length === 0) return;

    // Students with UNCHECKED boxes are registered as ABSENT, Sakit, or Izin (the rest auto Marked and Given 3-Star PRESENCE)
    const kecualikanNisn = pupils.filter((p) => !pacSiswaCheckboxes[p.nis]).map((p) => p.nis);

    setLoading(true);
    fetchFromProxy({
      action: "inputPresensiCepat",
      kelas: pacKelas,
      mapel: pacMapel,
      semester: pacSemester,
      tanggal: pacTanggal,
      status: "Hadir",
      starKehadiran: 3,
      kecualikanNisn: kecualikanNisn,
    })
      .then((res) => {
        alert(res.message || "Bismillah, presensi massal kelas berhasil tercatat cepat!");
        loadLMSData();
        setPacLoaded(false);
      })
      .catch((e) => alert("Koneksi gagal: " + e.message))
      .finally(() => setLoading(false));
  };

  const handleInputPresensiManual = () => {
    if (!paSiswa) return;
    const [nisn, nama] = paSiswa.split("|");
    
    setLoading(true);
    fetchFromProxy({
      action: "inputPresensiMapel",
      nisn: nisn,
      nama: nama,
      kelas: paKelas,
      mapel: paMapel,
      semester: paSemester,
      tanggal: paTanggal,
      status: paStatus,
      starKehadiran: paStatus === "Hadir" ? 3 : 1,
    })
      .then((res) => {
        alert(res.message || "Persensi manual berhasil terekam!");
        loadLMSData();
      })
      .catch((e) => alert("Koneksi gagal: " + e.message))
      .finally(() => setLoading(false));
  };

  // 4. File Analyzer AI
  const handleTriggerFileAiAnalyzer = () => {
    if (!aeLinkInput) {
      alert("Masukkan tautan lampiran siswa.");
      return;
    }

    setAeLoading(true);
    setAeResult(null);
    runAiCheck(aeLinkInput, neMapel, aeTugasInput || "Berkas Penugasan")
      .then((res) => {
        if (res.status === "success") {
          setAeResult(res);
          // Fill main form
          setNeNilaiManual(res.skorAI);
          setNeStarKualitas(res.skorAI >= 90 ? "10" : (res.skorAI >= 80 ? "8" : "6"));
          setNeNotesReview(res.catatanAI || "");
          setNeLink(aeLinkInput);
        } else {
          alert("Gagal menganalisis berkas: " + res.message);
        }
      })
      .catch((e) => alert("Koneksi error: " + e.message))
      .finally(() => setAeLoading(false));
  };

  const handleInputEvaluasiPenilaian = () => {
    if (!neSiswa || neNilaiManual === "") {
      alert("Lengkapi identitas siswa dan skor evaluasi.");
      return;
    }
    const [nisn, nama] = neSiswa.split("|");

    setLoading(true);
    fetchFromProxy({
      action: "inputNilai",
      nisn: nisn,
      nama: nama,
      kelas: neKelas,
      mapel: neMapel,
      semester: neSemester,
      tugasId: neTugasId,
      link: neLink,
      nilaiFinal: neNilaiManual,
      nilaiAI: aeResult ? aeResult.skorAI : "",
      reviewAI: neNotesReview,
      starWaktu: neStarWaktu,
      starKualitas: neStarKualitas,
    })
      .then((res) => {
        alert(res.message || "Bismillah, nilai evaluasi tugas tersimpan!");
        loadLMSData();
        // Reset
        setNeNilaiManual("");
        setNeNotesReview("");
        setNeLink("");
        setNeTugasId("");
        setAeResult(null);
        setAeLinkInput("");
        setAeTugasInput("");
      })
      .catch((e) => alert("Koneksi gagal: " + e.message))
      .finally(() => setLoading(false));
  };

  // Check integrity kuis log
  const handleCheckIntegrityLogs = () => {
    if (!integritySiswaNisn || !integrityTugasId) {
      alert("Isi NISN siswa dan ID Tugas Penilaian terlebih dahulu.");
      return;
    }
    setIntegrityLogData("⏳ Menarik log pemantauan dari database...");
    fetchFromProxy({
      action: "getLogIntegritasTugas",
      tugasId: integrityTugasId,
      nisn: integritySiswaNisn,
    })
      .then((res) => {
        const logs = res.logs || [];
        if (logs.length === 0) {
          setIntegrityLogData("✅ Bersih! Siswa mengerjakan dalam status fokus penuh tanpa terdeteksi keluar layar.");
          return;
        }
        let str = "";
        logs.forEach((l: any, i: number) => {
          str += `Log #${i+1}: Terjadi ${l.jumlahPelanggaran} kali pindah layar selama ${l.durasiMenit} menit pengerjaan.\nUraian: ${l.detailLog || "Tidak terperinci"}\n\n`;
        });
        setIntegrityLogData(str);
      })
      .catch((e) => setIntegrityLogData("Gagal load: " + e.message));
  };

  // 5. Ledger class loads
  const handleLoadClassLedger = () => {
    if (!filterKelas || !filterMapel) return;
    setLoading(true);
    Promise.all([
      fetchFromProxy({
        action: "getLedgerKelas",
        kelas: filterKelas,
        mapel: filterMapel,
        semester: ledgerSemester,
      }),
      fetchFromProxy({
        action: "getSilabus",
        kelas: filterKelas,
        mapel: filterMapel,
        semester: ledgerSemester,
      })
    ])
      .then(([resLedger, resSilabus]) => {
        if (resLedger.status === "success") {
          setLedgerData(resLedger.ledger || []);
        }
        if (resSilabus.status === "success" || resSilabus.silabus) {
          setLedgerSilabus(resSilabus.silabus || []);
        }
        setLedgerTampil(true);
      })
      .catch((e) => console.error("Error loaded ledger/silabus: ", e))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      
      {/* Role Profile Info */}
      <div className="welcome-card rounded-2xl p-5 relative overflow-hidden bg-gradient-to-r from-[#02629e] to-[#1e3a5f] text-white">
        <div className="relative z-10 flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xl uppercase">
              U
            </div>
            <div>
              <h3 className="text-lg font-bold">Ustadz/ah {user.nama}</h3>
              <p className="text-xs opacity-90">Pendidik Bidang Bahasa &amp; Sastra • {user.email}</p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {user.mapelList.map((m) => (
              <span key={m} className="px-2.5 py-1 bg-white/15 border border-white/20 rounded-lg text-[10px] font-bold font-mono">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex bg-white p-1 border border-gray-100 rounded-2xl shadow-sm text-xs gap-1 flex-wrap">
        <button 
          className={`px-4 py-2 font-bold rounded-xl transition duration-200 cursor-pointer ${activeTab === "beranda" ? "bg-[#02629e] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setActiveTab("beranda")}
        >
          🏠 Beranda
        </button>
        <button 
          className={`px-4 py-2 font-bold rounded-xl transition duration-200 cursor-pointer ${activeTab === "materi" ? "bg-[#02629e] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setActiveTab("materi")}
        >
          📁 Publish Materi
        </button>
        <button 
          className={`px-4 py-2 font-bold rounded-xl transition duration-200 cursor-pointer ${activeTab === "tugas" ? "bg-[#02629e] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setActiveTab("tugas")}
        >
          📝 Publish Tugas/Kuis
        </button>
        <button 
          className={`px-4 py-2 font-bold rounded-xl transition duration-200 cursor-pointer ${activeTab === "jadwal" ? "bg-[#02629e] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setActiveTab("jadwal")}
        >
          📅 Jadwal Mengajar
        </button>
        <button 
          className={`px-4 py-2 font-bold rounded-xl transition duration-200 cursor-pointer ${activeTab === "nilai" ? "bg-[#02629e] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setActiveTab("nilai")}
        >
          ⭐ Nilai &amp; AI Check
        </button>
        <button 
          className={`px-4 py-2 font-bold rounded-xl transition duration-200 cursor-pointer ${activeTab === "presensi" ? "bg-[#02629e] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setActiveTab("presensi")}
        >
          🗓️ Presensi Quick
        </button>
        <button 
          className={`px-4 py-2 font-bold rounded-xl transition duration-200 cursor-pointer ${activeTab === "ledger" ? "bg-[#02629e] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setActiveTab("ledger")}
        >
          📊 Ledger Kelas
        </button>
        <button 
          className={`px-4 py-2 font-bold rounded-xl transition duration-200 cursor-pointer ${activeTab === "raport" ? "bg-[#02629e] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setActiveTab("raport")}
        >
          📋 Raport Kemdikbud
        </button>
        <button 
          className={`px-4 py-2 font-bold rounded-xl transition duration-200 cursor-pointer ${activeTab === "silabus" ? "bg-[#02629e] text-white" : "text-gray-500 hover:bg-gray-50"}`}
          onClick={() => setActiveTab("silabus")}
        >
          📚 Silabus S-Sheet
        </button>
        <button 
          className="px-4 py-2 font-bold rounded-xl text-red-600 hover:bg-red-50 cursor-pointer transition ml-auto"
          onClick={onLogout}
        >
          Keluar
        </button>
      </div>

      {loading && (
        <div className="p-3 bg-[#e9f5fe] border border-blue-200 text-blue-700 text-xs font-mono text-center rounded-xl animate-pulse">
          ⏳ Sinkronisasi data ke server Google Sheets, mohon tunggu...
        </div>
      )}

      {/* --- TAB CONTENT BLOCKS --- */}

      {/* 1. TAB BERANDA */}
      {activeTab === "beranda" && (
        <div className="space-y-6">
          <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <h3 className="font-bold text-[#1e3a5f] text-sm">Assalamu'alaikum Warahmatullahi Wabarakatuh, Ustadz/ah! Representative Overview</h3>
            <p className="text-xs text-gray-400 mt-1">Ringkasan ini mendeteksi semua indikator pekerjaan harian lintas seluruh kelas yang Anda ampu—sehingga pekerjaan Anda jauh lebih efisien.</p>
          </div>

          {/* Core LMS Activity Progress Graph */}
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-1.5">
                  📈 Grafik Progres Kegiatan Anda di LMS
                </h3>
                <p className="text-xs text-slate-400">Statistik aktivitas pendeployan konten dan penyelesaian nilai ustadz/ah minggu ini.</p>
              </div>
              <div className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 font-extrabold px-2.5 py-1 rounded inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                Sistem LMS Aktif
              </div>
            </div>

            {/* Stats Summary Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center text-xs">
              <div>
                <div className="text-[#02629e] font-black text-lg">{materiList.length}</div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Materi Aktif</p>
              </div>
              <div>
                <div className="text-[#e28743] font-black text-lg">{tugasList.length}</div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Tugas Terbit</p>
              </div>
              <div>
                <div className="text-emerald-600 font-black text-lg">{jadwalList.length}</div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Jadwal Jam</p>
              </div>
              <div>
                <div className="text-indigo-600 font-black text-lg">{nilaiList.length || 15}</div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Ledger Nilai</p>
              </div>
            </div>

            {/* SVG Visual Stacked Progress Curve */}
            <div className="space-y-3 pt-1">
              {[
                { day: "Senin", materi: 4, tugas: 6, absen: 12, nilai: 8, total: 30 },
                { day: "Selasa", materi: 5, tugas: 8, absen: 14, nilai: 10, total: 37 },
                { day: "Rabu", materi: 3, tugas: 5, absen: 12, nilai: 15, total: 35 },
                { day: "Kamis", materi: 6, tugas: 9, absen: 16, nilai: 12, total: 43 },
                { day: "Jumat", materi: 7, tugas: 10, absen: 15, nilai: 18, total: 50 },
                { day: "Sabtu", materi: 2, tugas: 3, absen: 5, nilai: 14, total: 24 }
              ].map((d) => {
                const maxTotal = 60;
                const pctMateri = (d.materi / maxTotal) * 100;
                const pctTugas = (d.tugas / maxTotal) * 100;
                const pctAbsen = (d.absen / maxTotal) * 100;
                const pctNilai = (d.nilai / maxTotal) * 100;
                const pctTotal = (d.total / maxTotal) * 100;

                return (
                  <div key={d.day} className="grid grid-cols-12 gap-2.5 items-center">
                    <div className="col-span-2 text-xs font-bold text-slate-600 font-sans">{d.day}</div>
                    <div className="col-span-8 bg-slate-100 h-5.5 rounded-full overflow-hidden flex items-center relative border border-slate-150 shadow-inner">
                      <div style={{ width: `${pctMateri}%` }} className="bg-[#02629e] h-full" title={`Materi: ${d.materi}`} />
                      <div style={{ width: `${pctTugas}%` }} className="bg-[#e28743] h-full" title={`Tugas: ${d.tugas}`} />
                      <div style={{ width: `${pctAbsen}%` }} className="bg-emerald-500 h-full" title={`Absen: ${d.absen}`} />
                      <div style={{ width: `${pctNilai}%` }} className="bg-indigo-50 h-full bg-indigo-500" title={`Nilai: ${d.nilai}`} />
                      <span className="absolute right-3.5 text-[9px] font-mono font-bold text-slate-800 bg-white/70 px-1 py-0.2 rounded">
                        {d.total} aksi
                      </span>
                    </div>
                    <div className="col-span-2 text-right text-[10px] font-mono font-bold text-indigo-700">
                      {Math.round(pctTotal)}% Aktif
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart Legend */}
            <div className="flex gap-4 flex-wrap justify-center text-[10px] uppercase font-bold tracking-wider pt-2.5 border-t border-slate-100 text-slate-500">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#02629e]"></span> Buku Materi</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#e28743]"></span> Penugasan</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Presensi Sesi</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Ledger Nilai</span>
            </div>
          </div>

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#1e3a5f]">📝 Evaluasi Tugas Menunggu Rating Nilai</h3>
            <div className="divide-y divide-gray-50 space-y-2">
              {pendingTugas.length > 0 ? (
                pendingTugas.map((t, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold text-[9px] rounded mb-1">{t.kelas} • {t.mapel}</span>
                      <p className="font-bold text-gray-800 text-sm">{t.judul}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-red-600 font-bold">{t.jumlahBelumDinilai} Siswa pending</span>
                      <button 
                        className="px-3.5 py-1.5 bg-indigo-600 hover:brightness-105 text-white font-bold rounded-lg cursor-pointer"
                        onClick={() => setActiveMassGradingTugasId(t.id)}
                      >
                        Nilai Sekarang
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">😊 Mashallah! Semua penugasan selesai dinilai secara tuntas.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#1e3a5f]">🗓️ Sesi Jam Kelas Belum Lengkap Rekap Presensi</h3>
            <div className="divide-y divide-gray-50 space-y-2">
              {incompleteAbesn.length > 0 ? (
                incompleteAbesn.map((ka, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-[9px] rounded mb-1">{ka.kelas} • {ka.mapel}</span>
                      <p className="font-bold text-gray-800 text-sm">Sesi mengajar: {ka.jamMulai} - {ka.jamSelesai}</p>
                    </div>
                    <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 font-extrabold rounded-lg">
                      {ka.sudahAbsen} / {ka.totalSiswa} Hadir
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">😊 Alhamdulillah semua kelas mengajar hari ini presensinya lengkap.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#1e3a5f]">🛡️ Kuis Perlu Ditinjau (Indikator Infraction ≥ 2)</h3>
            <div className="divide-y divide-gray-50 space-y-2">
              {suspiciousQuizzes.length > 0 ? (
                suspiciousQuizzes.map((sq, idx) => (
                  <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-gray-800 text-sm">{sq.nama}</span>
                      <p className="text-gray-400 mt-0.5">NISN: {sq.nisn} | Kuis ID/Nama: <span className="font-semibold text-gray-600">{sq.judulKuis}</span></p>
                    </div>
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 font-extrabold rounded-lg font-mono">
                      {sq.jumlahPelanggaran}x Infract
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">😊 Tidak ada siswa terdeteksi melakukan pelanggaran layar kuis berlebih.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB PUBLISH MATERI */}
      {activeTab === "materi" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 border border-amber-100 rounded-2xl shadow-sm space-y-3 relative">
            {editingMateriId && (
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] uppercase font-black tracking-widest rounded-md animate-pulse">
                EDIT MODE
              </div>
            )}
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-sm font-bold text-[#1e3a5f]">
                {editingMateriId ? "✏️ Edit Materi Pembelajaran" : "Publish Materi Baru"}
              </h3>
              <a 
                href="https://drive.google.com/drive/folders/1v8AYYCtJoFQRNYtDHd16HMF30C1k5o8p" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-2.5 py-1 bg-[#02629e] hover:bg-blue-800 text-white font-black rounded-lg text-[9px] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Buka Drive Penyimpanan Rekap Materi Utama"
              >
                📁 Rekap Berkas Materi (Drive) ➔
              </a>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500">Kelas Sasar / Penerima (Multi-Kelas)</label>
              <div className="grid grid-cols-4 gap-1.5 pt-1.5 pb-2">
                {CLASSES.map((k) => (
                  <label key={k} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={!!pmKelas[k]}
                      onChange={(e) => setPmKelas(prev => ({ ...prev, [k]: e.target.checked }))}
                    />
                    {k}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">Mata Pelajaran</label>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl" value={pmMapel} onChange={(e) => setPmMapel(e.target.value)}>
                {user.mapelList.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Semester</label>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl" value={pmSemester} onChange={(e) => setPmSemester(e.target.value)}>
                <option value="1">Semester 1 (Ganjil)</option>
                <option value="2">Semester 2 (Genap)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Nama / Judul Materi</label>
              <input type="text" className="w-full p-2.5 border border-gray-200 rounded-xl" value={pmJudul} onChange={(e) => setPmJudul(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Tipe Media Dokumen</label>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl" value={pmTipe} onChange={(e) => setPmTipe(e.target.value)}>
                <option value="Instruction">Instruksi Pembelajaran Saja</option>
                <option value="PDF">Media PDF</option>
                <option value="Docs">Ketik/Dokumen Google Docs</option>
                <option value="Slides">Modul Google Slides</option>
              </select>
            </div>
            {pmTipe !== "Instruction" && (
              <div>
                <label className="text-xs font-bold text-gray-500">Tautan Lampiran Dokumen Drive</label>
                <input type="text" className="w-full p-2.5 border border-gray-200 rounded-xl" value={pmLink} onChange={(e) => setPmLink(e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-gray-500">Uraian / Deskripsi Pembelajaran</label>
              <textarea className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" rows={3} value={pmDesc} onChange={(e) => setPmDesc(e.target.value)} />
            </div>
            <div className="flex gap-2">
              {editingMateriId && (
                <button 
                  className="w-1/3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded text-xs cursor-pointer shadow-sm transition-colors" 
                  onClick={handleCancelEditMateri}
                >
                  Batal
                </button>
              )}
              <button 
                className={`flex-1 py-1.5 text-white font-bold rounded text-xs cursor-pointer shadow-sm transition-colors ${
                  editingMateriId ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`} 
                onClick={handlePublishMateri}
              >
                {editingMateriId ? "💾 Simpan Perubahan" : "🚀 Publikasikan Materi"}
              </button>
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Daftar Materi Aktif</h3>
              <div className="flex gap-1.5 flex-wrap">
                <select 
                  className="p-1 border border-slate-200 rounded bg-slate-50 text-[10px] font-semibold text-slate-700"
                  value={materiFilterKelas}
                  onChange={(e) => setMateriFilterKelas(e.target.value)}
                >
                  <option value="Semua">Semua Kelas</option>
                  {CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
                <select 
                  className="p-1 border border-slate-200 rounded bg-slate-50 text-[10px] font-semibold text-slate-700"
                  value={materiFilterMapel}
                  onChange={(e) => setMateriFilterMapel(e.target.value)}
                >
                  <option value="Semua">Semua Mapel</option>
                  {user.mapelList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {materiList
                .filter(m => (materiFilterKelas === "Semua" || m.kelas === materiFilterKelas))
                .filter(m => (materiFilterMapel === "Semua" || m.mapel === materiFilterMapel))
                .map((m, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[9px] mb-1 inline-block">{m.kelas} • {m.mapel} • Sem {m.semester}</span>
                    <p className="font-bold text-gray-800 text-sm mt-0.5">{m.judul}</p>
                    <p className="text-gray-400 mt-1 font-semibold">{m.desc || m.deskripsi}</p>
                    {(m.link || m.fileName) && (
                      <a href={m.link || m.fileName} target="_blank" referrerPolicy="no-referrer" className="text-blue-500 hover:underline mt-1 block text-[10px]">
                        🔗 Lampiran Pembelajaran ➔
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 src-edit-materi">
                    <button 
                      onClick={() => handleStartEditMateri(m)}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteMateri(m.id)}
                      className="px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      ✕ Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB PUBLISH TUGAS */}
      {activeTab === "tugas" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 border border-amber-100 rounded-2xl shadow-sm space-y-3 max-h-[82vh] overflow-y-auto pr-1 relative">
            {editingTugasId && (
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] uppercase font-black tracking-widest rounded-md animate-pulse">
                EDIT MODE
              </div>
            )}
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {editingTugasId ? "✏️ Edit Format Penugasan/Kuis" : "Format Penugasan Baru"}
              </h3>
              <a 
                href="https://drive.google.com/drive/folders/1ePjPlRMtXcy2d7TNzhwN8Y1kTQY5XgPK" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-2.5 py-1 bg-[#e28743] hover:bg-amber-600 text-white font-black rounded-lg text-[9px] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Buka Drive Penyimpanan Rekap Tugas Utama"
              >
                📝 Rekap Berkas Tugas (Drive) ➔
              </a>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500">Kelas Sasar / Penerima (Multi-Kelas)</label>
              <div className="grid grid-cols-4 gap-1.5 pt-1.5 pb-2">
                {CLASSES.map((k) => (
                  <label key={k} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={!!ptKelas[k]}
                      onChange={(e) => setPtKelas(prev => ({ ...prev, [k]: e.target.checked }))}
                    />
                    {k}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Mata Pelajaran</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl" value={ptMapel} onChange={(e) => setPtMapel(e.target.value)}>
                  {user.mapelList.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Semester</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl" value={ptSemester} onChange={(e) => setPtSemester(e.target.value)}>
                  <option value="1">1 (Ganjil)</option>
                  <option value="2">2 (Genap)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">Kaitkan dengan Unit Silabus Kurikulum</label>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-semibold" value={ptUnitSilabus} onChange={(e) => setPtUnitSilabus(e.target.value)}>
                <option value="">-- Lewati / Buat tugas harian lepas --</option>
                {availableUnits.map((u, i) => (
                  <option key={i} value={u.judulUnit}>Unit {u.nomorUnit} — {u.judulUnit} (UH{u.kelompokUH})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">Batas Tenggat Waktu (Deadline)</label>
              <input type="datetime-local" className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-red-600 font-bold" value={ptDeadline} onChange={(e) => setPtDeadline(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">Nama / Judul Tugas</label>
              <input type="text" className="w-full p-2.5 border border-gray-200 rounded-xl" value={ptJudul} onChange={(e) => setPtJudul(e.target.value)} />
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-red-50 border border-red-100 p-2.5 rounded-xl cursor-pointer">
              <input type="checkbox" checked={ptIsQuiz} onChange={(e) => { setPtIsQuiz(e.target.checked); if(e.target.checked) setPtTipe("Instruction"); }} />
              KUIS ONLINE (Integrasikan Soal Latihan Instan dengan Pemantauan Integritas)
            </label>

            {!ptIsQuiz ? (
              <>
                <div>
                  <label className="text-xs font-bold text-gray-400">Media Pelampiran</label>
                  <select className="w-full p-2.5 border border-gray-200 rounded-xl" value={ptTipe} onChange={(e) => setPtTipe(e.target.value)}>
                    <option value="Instruction">Instruksi Pembelajaran</option>
                    <option value="PDF">Unduh dokumen PDF</option>
                    <option value="Docs">Lampiran Google Docs</option>
                    <option value="Slides">Modul Google Slides</option>
                  </select>
                </div>
                {ptTipe !== "Instruction" && (
                  <div>
                    <label className="text-xs font-bold text-gray-500">Tautan Berkas Tugas Pendukung</label>
                    <input type="text" className="w-full p-2.5 border border-gray-200 rounded-xl" value={ptLink} onChange={(e) => setPtLink(e.target.value)} placeholder="https://drive.google.com/..." />
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500">Detail Petunjuk Instruksi</label>
                  <textarea className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" rows={3} value={ptDesc} onChange={(e) => setPtDesc(e.target.value)} />
                </div>
              </>
            ) : (
              <div className="space-y-4 p-3 border border-red-200 rounded-2xl bg-red-50/20">
                <div className="flex bg-white p-1 border border-gray-200 rounded-xl text-xs gap-1">
                  <button type="button" className={`flex-1 py-1.5 rounded-lg font-bold transition duration-150 ${quizCreatorMode === "manual" ? "bg-red-500 text-white" : "text-gray-500"}`} onClick={() => setQuizCreatorMode("manual")}>✍️ Susun Manual</button>
                  <button type="button" className={`flex-1 py-1.5 rounded-lg font-bold transition duration-150 ${quizCreatorMode === "ai" ? "bg-indigo-600 text-white" : "text-gray-500"}`} onClick={() => setQuizCreatorMode("ai")}>🤖 AI Generator</button>
                </div>

                {quizCreatorMode === "manual" ? (
                  <div className="space-y-4">
                    {quizQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span>Butir Soal #{qIdx + 1}</span>
                          <button type="button" className="text-red-500" onClick={() => setQuizQuestions(prev => prev.filter((_, i) => i !== qIdx))}>Hapus</button>
                        </div>
                        <input type="text" className="w-full p-1.5 border border-gray-200 rounded text-xs" placeholder="Ketik butir soal..." value={q.pertanyaan} onChange={(e) => updateManualSoalField(qIdx, "pertanyaan", e.target.value)} />
                        
                        <div className="space-y-1.5 pl-2 leading-none">
                          {q.pilihan.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-2 text-xs">
                              <input type="radio" checked={q.jawabanBenarIndex === oIdx} onChange={() => updateManualSoalField(qIdx, "jawabanBenarIndex", oIdx)} />
                              <input type="text" className="flex-1 p-1 border border-gray-200 rounded text-[11px]" placeholder={`Opsi ${String.fromCharCode(65 + oIdx)}`} value={opt} onChange={(e) => updateManualSoalOption(qIdx, oIdx, e.target.value)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button type="button" className="w-full py-1.5 border border-dashed border-gray-300 rounded text-gray-500 font-bold text-xs" onClick={addManualSoal}>
                      ➕ Tambah Butir Soal Baru
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-0.5">Topik Diskusi Kurikulum (Pemicu AI)</label>
                      <input type="text" className="w-full p-2 border border-gray-200 rounded-xl text-xs" placeholder="Ex: Past Tense, Adverbs, Nahwu Shorof..." value={aiQuizTopik} onChange={(e) => setAiQuizTopik(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 block mb-0.5">Jumlah Butir Soal (Maks 15)</label>
                      <input type="number" className="w-full p-2 border border-gray-200 rounded-xl text-xs" min={1} max={15} value={aiQuizJumlah} onChange={(e) => setAiQuizJumlah(Number(e.target.value))} />
                    </div>
                    <button type="button" className="w-full py-2 bg-indigo-600 hover:bg-[#4f46e5] text-white font-bold rounded-xl text-xs cursor-pointer transition flex items-center justify-center gap-1.5" onClick={handleTriggerQuizAi} disabled={aiQuizLoading}>
                      {aiQuizLoading ? "⏳ Merancang Soal Evaluasi..." : "✨ Generate Kuis via AI Gemini"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              {editingTugasId && (
                <button 
                  type="button"
                  className="w-1/3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded text-xs cursor-pointer shadow-sm transition-colors" 
                  onClick={handleCancelEditTugas}
                >
                  Batal
                </button>
              )}
              <button 
                type="button"
                className={`flex-1 py-1.5 text-white font-bold rounded text-xs cursor-pointer shadow-sm transition-colors ${
                  editingTugasId ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`} 
                onClick={handlePublishTugas}
              >
                {editingTugasId ? "💾 Simpan Perubahan" : "🚀 Publikasikan Tugas Baru"}
              </button>
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Daftar Tugas &amp; Kuis Terpublikasi</h3>
              <div className="flex gap-1.5 flex-wrap">
                <select 
                  className="p-1 border border-slate-200 rounded bg-slate-50 text-[10px] font-semibold text-slate-700"
                  value={tugasFilterKelas}
                  onChange={(e) => setTugasFilterKelas(e.target.value)}
                >
                  <option value="Semua">Semua Kelas</option>
                  {CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                </select>
                <select 
                  className="p-1 border border-slate-200 rounded bg-slate-50 text-[10px] font-semibold text-slate-700"
                  value={tugasFilterMapel}
                  onChange={(e) => setTugasFilterMapel(e.target.value)}
                >
                  <option value="Semua">Semua Mapel</option>
                  {user.mapelList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {tugasList
                .filter(t => (tugasFilterKelas === "Semua" || t.kelas === tugasFilterKelas))
                .filter(t => (tugasFilterMapel === "Semua" || t.mapel === tugasFilterMapel))
                .map((t, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold text-[9px] rounded mb-1">{t.kelas} • {t.mapel}</span>
                    <span className="text-[10px] font-mono text-gray-400">({t.id})</span>
                  </div>
                  <p className="font-extrabold text-gray-800 text-sm mt-0.5 inline-flex items-center gap-1.5">
                    {t.judul}
                    {(t.isQuiz === true || t.isQuiz === "TRUE") && <span className="bg-red-50 text-red-600 text-[9px] px-1 py-0.5 rounded font-bold">KUIS</span>}
                  </p>
                  <p className="text-[10px] text-red-500 font-bold">⏰ Deadline: {formatDate(t.deadline)}</p>
                  
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    <button 
                      className="px-3 py-1.5 bg-indigo-600 hover:brightness-110 text-white font-bold rounded-lg cursor-pointer text-[11px]"
                      onClick={() => setActiveMassGradingTugasId(t.id)}
                    >
                      👥 Pengumpul &amp; Nilai
                    </button>
                    <button 
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold rounded-lg cursor-pointer text-[11px] transition-all"
                      onClick={() => handleStartEditTugas(t)}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded-lg cursor-pointer text-[11px] transition-all"
                      onClick={() => handleDeleteTugas(t.id)}
                    >
                      ✕ Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB JADWAL MENGAJAR */}
      {activeTab === "jadwal" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>{editingJadwalId ? "✏️ Edit Jadwal Belajar" : "Daftar Jadwal Baru"}</span>
              {editingJadwalId && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[8px] font-bold rounded">EDIT MODE</span>
              )}
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-500">Hari Belajar</label>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={pjHari} onChange={(e) => setPjHari(e.target.value)}>
                <option value="Senin">Senin</option>
                <option value="Selasa">Selasa</option>
                <option value="Rabu">Rabu</option>
                <option value="Kamis">Kamis</option>
                <option value="Jumat">Jumat</option>
                <option value="Sabtu">Sabtu</option>
                <option value="Minggu">Minggu</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Jam Mulai</label>
                <input type="text" className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-bold text-center" value={pjJamMulai} onChange={(e) => setPjJamMulai(e.target.value)} placeholder="07:30" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Jam Selesai</label>
                <input type="text" className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-bold text-center" value={pjJamSelesai} onChange={(e) => setPjJamSelesai(e.target.value)} placeholder="09:00" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Kelas Sasar</label>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={pjKelas} onChange={(e) => setPjKelas(e.target.value)}>
                {CLASSES.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500">Mata Pelajaran</label>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={pjMapel} onChange={(e) => setPjMapel(e.target.value)}>
                {user.mapelList.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button 
                className={`flex-1 py-2 text-white font-bold rounded text-xs cursor-pointer shadow-sm transition-colors ${
                  editingJadwalId ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
                onClick={handleSaveJadwal}
              >
                {editingJadwalId ? "💾 Simpan Perubahan" : "💾 Daftarkan Jadwal Belajar"}
              </button>
              {editingJadwalId && (
                <button 
                  className="px-3 py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold rounded text-xs cursor-pointer transition-colors"
                  onClick={handleCancelEditJadwal}
                >
                  Batal
                </button>
              )}
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Jadwal Mengajar Anda (Time Table Format)</h3>
            
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-[10px] text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-center">
                    <th className="p-2 border border-slate-200 w-[110px]">⏰ Jam</th>
                    {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map(d => (
                      <th key={d} className="p-2 border border-slate-200">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(customTimetableSlots().length > 0 ? customTimetableSlots() : ["08:00 - 09:30", "10:00 - 11:30"]).map((slot) => (
                    <tr key={slot} className="hover:bg-slate-50 border-b border-slate-100 text-center">
                      <td className="p-2 border border-slate-200 bg-slate-50/50 font-mono font-bold text-[#1e3a5f]">{slot}</td>
                      {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((day) => {
                        const matches = jadwalList.filter(j => {
                          const currentSlot = `${j.jamMulai} - ${j.jamSelesai}`;
                          return j.hari === day && currentSlot === slot && user.mapelList.includes(j.mapel);
                        });
                        return (
                          <td key={day} className="p-2 border border-slate-200 align-top min-h-[50px] bg-white text-left">
                            {matches.length > 0 ? (
                              <div className="space-y-1">
                                {matches.map((j) => (
                                  <div key={j.id} className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-lg text-[9px] relative group leading-normal">
                                    <div className="font-extrabold">{j.kelas}</div>
                                    <div className="text-slate-600 truncate font-semibold" title={j.mapel}>{j.mapel}</div>
                                    {j.ruangan && <div className="text-slate-400 font-mono text-[8px]">{j.ruangan}</div>}
                                    <div className="absolute right-1 top-1 flex items-center gap-1 opacity-85 group-hover:opacity-100 transition">
                                      <button 
                                        className="w-3.5 h-3.5 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-full flex items-center justify-center font-black text-[7px] cursor-pointer shadow-2xs"
                                        onClick={() => handleStartEditJadwal(j)}
                                        title="Edit jadwal"
                                      >
                                        ✎
                                      </button>
                                      <button 
                                        className="w-3.5 h-3.5 bg-rose-100 text-rose-750 hover:bg-rose-200 rounded-full flex items-center justify-center font-bold text-[7px] cursor-pointer shadow-2xs"
                                        onClick={() => handleDeleteJadwal(j.id)}
                                        title="Hapus jadwal"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-300 block text-center font-mono">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB EVALUASI NILAI & AI AUTO-CHECK */}
      {activeTab === "nilai" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 text-white p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
              <span className="absolute -right-4 -bottom-4 text-6xl opacity-15">🤖</span>
              <h4 className="text-sm font-bold">🤖 Asisten AI Auto-Check Homeworks (Gemini)</h4>
              <p className="text-xs opacity-90 leading-relaxed block">
                LMS mendownload dan merinci file hasil submit kerja siswa secara real-time dari link Drive lampiran. AI kemudian membagikan penilaian skor rasional berserta saran pengoreksiannya.
              </p>
              <input type="text" className="w-full p-2.5 border border-indigo-400/50 bg-white/10 placeholder-white/60 text-white rounded-xl text-xs font-semibold outline-none" placeholder="Masukkan Tautan Drive Hasil Kerja Siswa..." value={aeLinkInput} onChange={(e) => setAeLinkInput(e.target.value)} />
              <input type="text" className="w-full p-2.5 border border-indigo-400/50 bg-white/10 placeholder-white/60 text-white rounded-xl text-xs mt-2 outline-none" placeholder="Judul / Pokok Bahasan (Membantu AI)..." value={aeTugasInput} onChange={(e) => setAeTugasInput(e.target.value)} />
              
              <button 
                onClick={handleTriggerFileAiAnalyzer}
                className="w-full py-2.5 bg-white text-indigo-700 font-extrabold rounded-xl text-xs hover:bg-indigo-50 transition cursor-pointer"
                disabled={aeLoading}
              >
                {aeLoading ? "⏳ Menganalisis file dokumen..." : "🤖 JALANKAN ASISTEN AI KOREKTOR"}
              </button>

              {aeResult && (
                <div className="p-4 bg-white text-slate-800 rounded-xl text-xs space-y-2.5 shadow mt-3 border border-indigo-100">
                  <p className="font-extrabold text-indigo-600">Skor AI yang direkomendasikan: <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-indigo-700 text-[10px]">{aeResult.skorAI} / 100</span></p>
                  <p className="font-semibold text-gray-500 italic block mt-2 border-t border-gray-50 pt-2 leading-relaxed">
                    Review AI: "{aeResult.catatanAI}"
                  </p>
                  <p className="text-[10px] text-gray-400 leading-snug">⬇️ Data AI di atas otomatis disisipkan ke formulir penilaian harian di samping kanan secara langsung.</p>
                </div>
              )}
            </div>

            <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">🛡️ Cek Log Integritas Kuis Latihan</h3>
              <div>
                <input type="number" className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" placeholder="Ketik NISN Siswa..." value={integritySiswaNisn} onChange={(e) => setIntegritySiswaNisn(e.target.value)} />
                <input type="text" className="w-full p-2.5 border border-gray-200 rounded-xl text-xs mt-2" placeholder="ID Tugas (Contoh: TGS-XXXX)..." value={integrityTugasId} onChange={(e) => setIntegrityTugasId(e.target.value)} />
              </div>
              <button onClick={handleCheckIntegrityLogs} className="w-full py-2 bg-amber-500 hover:brightness-105 text-white font-bold rounded-xl text-xs cursor-pointer transition">
                🔎 Periksa Aktivitas Layar Kuis
              </button>
              {integrityLogData && (
                <pre className="p-3 bg-gray-50 text-[10.5px] rounded-xl border border-gray-100 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                  {integrityLogData}
                </pre>
              )}
            </div>
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Form Evaluasi Nilai Tugas Harian</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Mata Pelajaran</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={neMapel} onChange={(e) => setNeMapel(e.target.value)}>
                  {user.mapelList.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Semester</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={neSemester} onChange={(e) => setNeSemester(e.target.value)}>
                  <option value="1">1 (Ganjil)</option>
                  <option value="2">2 (Genap)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Pilih Kelas</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={neKelas} onChange={(e) => setNeKelas(e.target.value)}>
                  {CLASSES.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Pilih Siswa</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={neSiswa} onChange={(e) => setNeSiswa(e.target.value)}>
                  {!neSiswa && <option value="">-- Tidak ada siswa dideteksi --</option>}
                  {globalSiswaList.filter((s) => s.kelas === neKelas).map((s) => (
                    <option key={s.nis} value={`${s.nis}|${s.nama}`}>{s.nama} ({s.nis})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">Korelasikan ID Tugas (Contoh: TGS-XXXX)</label>
              <input type="text" className="w-full p-2.5 border border-gray-200 rounded-xl text-xs uppercase" placeholder="TGS-XXXX" value={neTugasId} onChange={(e) => setNeTugasId(e.target.value)} />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">Tautan Berkas Homework Siswa</label>
              <input type="text" className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" placeholder="Tautan Drive yang dicek" value={neLink} onChange={(e) => setNeLink(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Nilai Akhir Evaluasi (0-100)</label>
                <input type="number" className="w-full p-2 border border-slate-200 rounded text-xs font-extrabold text-indigo-600 text-center" value={neNilaiManual} onChange={(e) => setNeNilaiManual(e.target.value)} placeholder="0-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Bintang Kualitas Hasil (Maks 10)</label>
                <input type="number" className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center font-bold" min={0} max={10} value={neStarKualitas} onChange={(e) => setNeStarKualitas(e.target.value)} placeholder="0-10" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500">Bintang Ketepatan Waktu Penyerahan</label>
              <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={neStarWaktu} onChange={(e) => setNeStarWaktu(e.target.value)}>
                <option value="5">⭐⭐⭐⭐⭐ Sangat tepat / lebih awal (5)</option>
                <option value="3">⭐⭐⭐ Terlambat &lt; 24 jam (3)</option>
                <option value="1">⭐ Terlambat &gt; 24 jam (1)</option>
                <option value="0">❌ Alpa / Tidak kumpul (0)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 font-serif">Catatan review (Opsional)</label>
              <textarea className="w-full p-2.5 border border-gray-200 rounded-xl text-xs leading-relaxed" rows={2} value={neNotesReview} onChange={(e) => setNeNotesReview(e.target.value)} placeholder="Kritik & saran guru..." />
            </div>

            <button className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs cursor-pointer shadow-sm transition-colors" onClick={handleInputEvaluasiPenilaian}>
              💾 Rekam Rekomendasi Penilaian
            </button>
          </div>
        </div>
      )}

      {/* 6. TAB PRESENSI MASAL & CEPAT */}
      {activeTab === "presensi" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">⚡ Presensi Cepat (Sesi Kelas Harian)</h3>
            <p className="text-xs text-gray-400">Pilih mapel &amp; kelas untuk memuat daftar absensi. Ananda yang tidak dicentang terhitung Alpa/Izin/Sakit.</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Pilih Kelas</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={pacKelas} onChange={(e) => { setPacKelas(e.target.value); setPacLoaded(false); }}>
                  {CLASSES.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Mata Pelajaran</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={pacMapel} onChange={(e) => setPacMapel(e.target.value)}>
                  {user.mapelList.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Semester</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={pacSemester} onChange={(e) => setPacSemester(e.target.value)}>
                  <option value="1">1 (Ganjil)</option>
                  <option value="2">2 (Genap)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Tanggal Sesi</label>
                <input type="date" className="w-full p-2 border border-gray-200 rounded-xl text-xs" value={pacTanggal} onChange={(e) => setPacTanggal(e.target.value)} />
              </div>
            </div>

            <button className="w-full py-2.5 bg-indigo-600 hover:brightness-105 text-white font-bold rounded-xl text-xs cursor-pointer" onClick={handleLoadPresensiCepatSiswa}>
              👥 Tampilkan Daftar Absensi Kelas
            </button>

            {pacLoaded && (
              <div className="p-3 border border-gray-100 rounded-2xl space-y-3 bg-gray-50/50">
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" className="py-1 border border-gray-200 rounded bg-white font-bold text-[10px]" onClick={() => {
                    const c: Record<string, boolean> = {};
                    globalSiswaList.filter(s => s.kelas === pacKelas).forEach(s => c[s.nis] = true);
                    setPacSiswaCheckboxes(c);
                  }}>Patuhi Hadir</button>
                  <button type="button" className="py-1 border border-gray-200 rounded bg-white font-bold text-[10px]" onClick={() => setPacSiswaCheckboxes({})}>Kosongkan</button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 max-h-[250px] overflow-y-auto pt-2 pl-1">
                  {globalSiswaList.filter(s => s.kelas === pacKelas).map((s) => (
                    <label key={s.nis} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={!!pacSiswaCheckboxes[s.nis]}
                        onChange={(e) => setPacSiswaCheckboxes(prev => ({ ...prev, [s.nis]: e.target.checked }))}
                      />
                      {s.nama}
                    </label>
                  ))}
                </div>
                <button className="w-full py-2.5 bg-[#2ecc71] hover:brightness-105 text-white font-bold rounded-xl text-xs cursor-pointer" onClick={handleSubmitPresensiCepat}>
                  ⚡ Kirim Presensi Massal Hadir
                </button>
              </div>
            )}
          </div>

          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">🗓️ Koreksi Presensi Khusus / Izin-Sakit</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Pilih Kelas</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={paKelas} onChange={(e) => setPaKelas(e.target.value)}>
                  {CLASSES.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Pilih Siswa</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={paSiswa} onChange={(e) => setPaSiswa(e.target.value)}>
                  {!paSiswa && <option value="">-- Tidak ada siswa --</option>}
                  {globalSiswaList.filter((s) => s.kelas === paKelas).map((s) => (
                    <option key={s.nis} value={`${s.nis}|${s.nama}`}>{s.nama} ({s.nis})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Mata Pelajaran</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={paMapel} onChange={(e) => setPaMapel(e.target.value)}>
                  {user.mapelList.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Semester</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={paSemester} onChange={(e) => setPaSemester(e.target.value)}>
                  <option value="1">1 (Ganjil)</option>
                  <option value="2">2 (Genap)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500">Tanggal Sesi</label>
                <input type="date" className="w-full p-2 border border-gray-200 rounded-xl text-xs" value={paTanggal} onChange={(e) => setPaTanggal(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Status Kehadiran</label>
                <select className="w-full p-2.5 border border-gray-200 rounded-xl text-xs" value={paStatus} onChange={(e) => setPaStatus(e.target.value)}>
                  <option value="Hadir">Hadir</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Izin">Izin</option>
                  <option value="Alpa">Alpa</option>
                </select>
              </div>
            </div>

            <button className="w-full py-3 bg-[#f4a623] hover:brightness-105 text-white font-bold rounded-xl text-xs cursor-pointer shadow shadow-amber-100" onClick={handleInputPresensiManual}>
              💾 Simpan Koreksi Presensi
            </button>
          </div>
        </div>
      )}

      {/* 7. TAB CLASS LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filter Ledger Kelas</h3>
            <div className="grid grid-cols-3 gap-3">
              <select 
                className="p-2.5 border border-gray-200 rounded-xl text-xs bg-white" 
                value={filterKelas} 
                onChange={(e) => setFilterKelas(e.target.value)}
              >
                {CLASSES.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
              </select>
              <select 
                className="p-2.5 border border-gray-200 rounded-xl text-xs bg-white" 
                value={filterMapel} 
                onChange={(e) => setFilterMapel(e.target.value)}
              >
                {user.mapelList.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select 
                className="p-2.5 border border-gray-200 rounded-xl text-xs bg-white" 
                value={ledgerSemester} 
                onChange={(e) => setLedgerSemester(e.target.value)}
              >
                <option value="1">Semester 1 (Ganjil)</option>
                <option value="2">Semester 2 (Genap)</option>
              </select>
            </div>
            <button className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs cursor-pointer" onClick={handleLoadClassLedger}>
              TAMPILKAN REKAP LEDGER KELAS
            </button>
          </div>

          {ledgerTampil && (
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">📋 Rekap Nilai Harian &amp; Ledger Tugas Kompetensi</h3>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                  Semester {ledgerSemester === "2" ? "Genap" : "Ganjil"} • {filterMapel}
                </span>
              </div>
              
              <p className="text-[11px] text-slate-500 leading-relaxed bg-[#02629e]/5 p-3 rounded-xl border border-[#02629e]/10 text-[#02629e] mb-2 font-medium">
                💡 <strong>Rata-rata Tugas</strong> dari masing-masing Unit dihitung secara live dari seluruh kuis dan tugas harian yang dikaitkan dengan unit tersebut. Rata-rata ini secara otomatis diimpor sebagai <strong>Nilai Akumulasi Tugas</strong> di Buku Raport Kemdikbud.
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                {(() => {
                  const currentTasks = (tugasList || []).filter(
                    (t) => t.kelas === filterKelas && t.mapel === filterMapel && t.semester === ledgerSemester
                  );

                  const tasksByUnit = (ledgerSilabus || []).map((unit) => {
                    const unitTitle = (unit.judulUnit || "").toLowerCase().trim();
                    const unitNo = String(unit.nomorUnit);
                    const matched = currentTasks.filter((t) => {
                      const tUnit = (t.unitSilabus || "").toLowerCase().trim();
                      if (!tUnit) return false;
                      return tUnit === unitTitle || tUnit.includes(unitTitle) || unitTitle.includes(tUnit) || tUnit === unitNo;
                    });
                    return {
                      unit,
                      tasks: matched,
                    };
                  });

                  return (
                    <table className="w-full border-collapse text-xs min-w-[900px]">
                      <thead>
                        {/* Row 1 Headers */}
                        <tr className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] text-center border-b border-slate-200">
                          <th className="p-3 border-r border-slate-200 w-[70px]" rowSpan={2}>NIS</th>
                          <th className="p-3 border-r border-slate-200 text-left min-w-[160px]" rowSpan={2}>Nama Siswa</th>
                          {tasksByUnit.map((g, gi) => (
                            <th key={gi} className="p-2 border-r border-slate-200 bg-sky-50/70 text-sky-850 text-center" colSpan={g.tasks.length + 1}>
                              Unit {g.unit.nomorUnit}: {g.unit.judulUnit}
                            </th>
                          ))}
                          <th className="p-2 border-r border-slate-200 bg-emerald-50/50" colSpan={4}>Absensi Kelas</th>
                          <th className="p-3 text-center" rowSpan={2}>Bintang</th>
                        </tr>
                        {/* Row 2 Headers */}
                        <tr className="bg-slate-50 text-[9px] text-slate-500 font-bold text-center border-b border-slate-200">
                          {tasksByUnit.map((g, gi) => (
                            <React.Fragment key={gi}>
                              {g.tasks.map((t) => (
                                <th key={t.id} className="p-2 border-r border-slate-200 max-w-[110px] truncate" title={t.judul}>
                                  {t.judul}
                                </th>
                              ))}
                              <th className="p-2 border-r border-slate-200 bg-blue-50/80 font-black text-blue-900 w-[100px]" title="Rata-rata akumulasi nilai tugas">
                                Rerata Tugas {g.unit.nomorUnit}
                              </th>
                            </React.Fragment>
                          ))}
                          <th className="p-1 px-2 border-r border-slate-200 bg-green-50/50 text-green-700 text-[9px]">Had</th>
                          <th className="p-1 px-2 border-r border-slate-200 bg-amber-50/50 text-amber-700 text-[9px]">Sak</th>
                          <th className="p-1 px-2 border-r border-slate-200 bg-blue-50/50 text-blue-700 text-[9px]">Izi</th>
                          <th className="p-1 px-2 border-r border-slate-200 bg-red-50/50 text-red-650 text-[9px]">Alp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerData.length > 0 ? (
                          ledgerData.map((s, idx) => {
                            return (
                              <tr key={idx} className="hover:bg-slate-50/65 font-semibold text-center text-xs border-b border-slate-100 h-10">
                                <td className="p-2 border-r border-slate-200 font-mono text-slate-450">{s.nis}</td>
                                <td className="p-2.5 border-r border-slate-200 text-left font-bold text-slate-800">{s.nama}</td>
                                
                                {/* Averages and individual tasks */}
                                {tasksByUnit.map((g, gi) => {
                                  let sum = 0;
                                  let count = 0;
                                  return (
                                    <React.Fragment key={gi}>
                                      {g.tasks.map((t) => {
                                        const match = (nilaiList || []).find(
                                          (n) => n.tugasId === t.id && (String(n.nisn) === String(s.nis) || String(n.nis) === String(s.nis) || n.siswaEmail === s.email)
                                        );
                                        const score = match ? Number(match.nilaiFinal || match.nilai) : null;
                                        const hasScore = score !== null && !isNaN(score);
                                        if (hasScore) {
                                          sum += score;
                                          count++;
                                        }
                                        return (
                                          <td key={t.id} className="p-2 border-r border-slate-200 font-mono">
                                            {hasScore ? (
                                              <span className="text-slate-700 font-medium">{score}</span>
                                            ) : (
                                              <span className="text-slate-300 font-light">-</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      {/* Calculated Average column */}
                                      <td className="p-2 border-r border-slate-250 font-mono bg-blue-50/20 text-blue-700 font-bold text-xs">
                                        {count > 0 ? (
                                          <span className="bg-blue-100/55 text-blue-800 px-1.5 py-0.5 rounded font-extrabold">{Math.round(sum / count)}</span>
                                        ) : (
                                          <span className="text-slate-350">-</span>
                                        )}
                                      </td>
                                    </React.Fragment>
                                  );
                                })}

                                {/* attendance parameters */}
                                <td className="p-2 border-r border-slate-200 text-green-700 font-bold font-mono bg-green-50/10">{s.hadir}</td>
                                <td className="p-2 border-r border-slate-200 text-amber-700 font-bold font-mono bg-amber-50/10">{s.sakit}</td>
                                <td className="p-2 border-r border-slate-200 text-blue-700 font-bold font-mono bg-blue-50/10">{s.izin}</td>
                                <td className="p-2 border-r border-slate-200 text-red-655 font-bold font-mono bg-red-50/10">{s.alpa}</td>

                                {/* Star credits accumulated */}
                                <td className="p-2 text-center">
                                  <span className="inline-block bg-yellow-50 text-amber-800 text-[10px] border border-amber-200 font-bold px-2 py-0.5 rounded-full">
                                    🌟 {s.totalStar || 0}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={100} className="p-8 text-center text-slate-400 font-medium">Belum ada data siswa di kelas rombel ini.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. TAB RAPORT KEMDIKBUD MATRICES */}
      {activeTab === "raport" && (
        <RaportTab 
          mapelList={user.mapelList} 
          globalSiswaList={globalSiswaList}
          tugasList={tugasList}
          nilaiList={nilaiList}
        />
      )}

      {/* 9. TAB SILABUS SPREADSHEETS */}
      {activeTab === "silabus" && (
        <SyllabusTab mapelList={user.mapelList} />
      )}

      {/* --- FLOATING MASS GRADING OVERLAY MODAL --- */}
      {activeMassGradingTugasId && (
        <MassGradingModal 
          tugasId={activeMassGradingTugasId} 
          onClose={() => setActiveMassGradingTugasId(null)}
          onSavedSuccess={loadLMSData}
        />
      )}

    </div>
  );

  function filteredMapelLanguageMode() {
    return filterMapel.includes("Arab") ? "ar" : (filterMapel.includes("English") ? "en" : "id");
  }
}
