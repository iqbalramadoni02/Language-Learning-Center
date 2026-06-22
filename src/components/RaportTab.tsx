import React, { useState, useEffect } from "react";
import { RaportSiswa } from "../types";
import { fetchFromProxy, generateNarasiAI } from "../utils";
import * as XLSX from "xlsx";

interface RaportTabProps {
  mapelList: string[];
  globalSiswaList?: any[];
  tugasList?: any[];
  nilaiList?: any[];
}

export default function RaportTab({ mapelList, globalSiswaList = [], tugasList = [], nilaiList = [] }: RaportTabProps) {
  const [selectedKelas, setSelectedKelas] = useState<string>("XI 1");
  const [selectedMapel, setSelectedMapel] = useState<string>(mapelList[0] || "");
  const [selectedSemester, setSelectedSemester] = useState<string>("2");
  const [raportItems, setRaportItems] = useState<RaportSiswa[]>([]);
  const [silabusItems, setSilabusItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [metaInfo, setMetaInfo] = useState<any>({
    kkm: 83,
    waliKelas: "Ustadz Khairul Anwar, S.Pd",
  });

  // Override dialog state
  const [overrideState, setOverrideState] = useState<{ nisn: string; field: string; label: string; val: string } | null>(null);
  
  // Narrative dialog state
  const [narasiSiswa, setNarasiSiswa] = useState<{ nisn: string; nama: string; capaian: string; deskripsi: string } | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Local storage keys
  const remedialKey = `remedial_scores_${selectedKelas}_${selectedMapel}_${selectedSemester}`;
  const overrideKey = `raport_overrides_${selectedKelas}_${selectedMapel}_${selectedSemester}`;

  useEffect(() => {
    loadRaport();
  }, [selectedKelas, selectedMapel, selectedSemester]);

  const loadRaport = () => {
    if (!selectedKelas || !selectedMapel) return;
    setLoading(true);

    Promise.all([
      fetchFromProxy({
        action: "getRaportKelasLengkap",
        kelas: selectedKelas,
        mapel: selectedMapel,
        semester: selectedSemester,
      }),
      fetchFromProxy({
        action: "getSilabus",
        kelas: selectedKelas,
        mapel: selectedMapel,
        semester: selectedSemester,
      })
    ]).then(([resRaport, resSilabus]) => {
      let remoteRaport: RaportSiswa[] = [];

      if (resSilabus && (resSilabus.status === "success" || resSilabus.silabus)) {
        setSilabusItems(resSilabus.silabus || []);
      }

      if (resRaport && resRaport.status === "success") {
        remoteRaport = resRaport.raportList || [];
        setMetaInfo({
          kelas: resRaport.kelas || selectedKelas,
          mapel: resRaport.mapel || selectedMapel,
          semester: resRaport.semester || selectedSemester,
          kkm: resRaport.kkm || (selectedKelas.startsWith("XI") ? 83 : 80),
          waliKelas: resRaport.waliKelas || "Ustadzah Fatimah, M.Pd",
        });
      }

      // If remote list is empty, we fallback to filtering globalSiswaList for the selected class
      if (remoteRaport.length === 0 && globalSiswaList.length > 0) {
        const clsStudents = globalSiswaList.filter((s) => s.kelas === selectedKelas);
        remoteRaport = clsStudents.map((cs) => ({
          nisn: cs.nis || "N/A",
          nama: cs.nama,
          uh1: "",
          uh2: "",
          uh3: "",
          pts: "",
          pat: "",
          persenKehadiran: 100,
          nilaiRaport: "",
          tuntas: true,
          capaianPembelajaran: "",
          deskripsi: "",
        }));
      }

      // Merge local storage edits for remedial scores & manual overrides
      const storedRemedial = localStorage.getItem(remedialKey);
      const remedialMap = storedRemedial ? JSON.parse(storedRemedial) : {};

      const storedOverrides = localStorage.getItem(overrideKey);
      const overrideMap = storedOverrides ? JSON.parse(storedOverrides) : {};

      const merged = remoteRaport.map((item) => {
        const studentNis = item.nisn;
        const remedialData = remedialMap[studentNis] || {};
        const overrideData = overrideMap[studentNis] || {};

        return {
          ...item,
          uh1: overrideData.uh1 !== undefined ? overrideData.uh1 : item.uh1,
          uh2: overrideData.uh2 !== undefined ? overrideData.uh2 : item.uh2,
          uh3: overrideData.uh3 !== undefined ? overrideData.uh3 : item.uh3,
          pts: overrideData.pts !== undefined ? overrideData.pts : item.pts,
          pat: overrideData.pat !== undefined ? overrideData.pat : item.pat,
          remedialPts: remedialData.remedialPts || "",
          remedialPat: remedialData.remedialPat || "",
          capaianPembelajaran: overrideData.capaianPembelajaran !== undefined ? overrideData.capaianPembelajaran : item.capaianPembelajaran,
          deskripsi: overrideData.deskripsi !== undefined ? overrideData.deskripsi : item.deskripsi,
        };
      });

      setRaportItems(merged);
    })
    .catch((e) => {
      console.error("Error loading raport or silabus:", e);
      // Fallback fallback
      if (globalSiswaList.length > 0) {
        const clsStudents = globalSiswaList.filter((s) => s.kelas === selectedKelas);
        const fallbackList = clsStudents.map((cs) => ({
          nisn: cs.nis || "N/A",
          nama: cs.nama,
          uh1: "",
          uh2: "",
          uh3: "",
          pts: "",
          pat: "",
          persenKehadiran: 100,
          nilaiRaport: "",
          tuntas: true,
          capaianPembelajaran: "",
          deskripsi: "",
        }));
        setRaportItems(fallbackList);
      }
    })
    .finally(() => setLoading(false));
  };

  // Helper: Calculate average of student task grades associated with a Unit in the syllabus
  const getAverageTugasForUnit = (studentNis: string, studentEmail: string, unitIndexAsc: number) => {
    // Determine the target Unit title or unit number
    const targetUnit = silabusItems[unitIndexAsc];
    if (!targetUnit) return null;

    const unitTitle = (targetUnit.judulUnit || "").toLowerCase().trim();
    const unitNo = String(targetUnit.nomorUnit || (unitIndexAsc + 1));

    // Filter tasks belonging to selected mapel, kelas, semester, and matching this Unit
    const matchedTasks = tugasList.filter((t) => {
      if (t.kelas !== selectedKelas || t.mapel !== selectedMapel || t.semester !== selectedSemester) {
        return false;
      }
      const tUnit = (t.unitSilabus || "").toLowerCase().trim();
      if (!tUnit) return false;
      return tUnit === unitTitle || tUnit.includes(unitTitle) || unitTitle.includes(tUnit) || tUnit === unitNo;
    });

    if (matchedTasks.length === 0) return null;

    // Fetch grades for these tasks
    const scores = matchedTasks.map((t) => {
      const match = nilaiList.find(
        (n) => n.tugasId === t.id && (String(n.nisn) === String(studentNis) || String(n.nis) === String(studentNis) || n.siswaEmail === studentEmail)
      );
      if (!match) return null;
      const scoreVal = Number(match.nilaiFinal || match.nilai);
      return isNaN(scoreVal) ? null : scoreVal;
    }).filter((s) => s !== null) as number[];

    if (scores.length === 0) return 0;
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(avg);
  };

  // Main Raport calculator
  const calculateFinalRaportScore = (item: RaportSiswa, avgT1: number | null, avgT2: number | null, avgT3: number | null) => {
    // 1. Daily Test (Daily Exams / UH scores)
    const dailyTests = [Number(item.uh1), Number(item.uh2), Number(item.uh3)].filter((v) => !isNaN(v) && v > 0);
    const avgDailyExams = dailyTests.length ? (dailyTests.reduce((a, b) => a + b, 0) / dailyTests.length) : 80;

    // 2. Akumulasi Tugas
    const taskAverages = [avgT1, avgT2, avgT3].filter((v) => v !== null && v !== undefined) as number[];
    const avgTaskSubmissions = taskAverages.length ? (taskAverages.reduce((a, b) => a + b, 0) / taskAverages.length) : 80;

    // Unit block (average of Exams and assignments)
    const formativeScore = (avgDailyExams + avgTaskSubmissions) / 2;

    // 3. PTS (Mid Term) and remedial
    const basePts = Number(item.pts) || 0;
    const remedialPts = Number(item.remedialPts) || 0;
    const finalPts = Math.max(basePts, remedialPts);

    // 4. PAT (Final Term) and remedial
    const basePat = Number(item.pat) || 0;
    const remedialPat = Number(item.remedialPat) || 0;
    const finalPat = Math.max(basePat, remedialPat);

    // Weighted Formula: 50% Formative (Daily Test + Tasks), 20% Mid Test, 30% Final Test
    const scoreVal = Math.round((formativeScore * 0.5) + (finalPts * 0.2) + (finalPat * 0.3));
    return scoreVal;
  };

  const handleFieldChange = (nisn: string, field: "pts" | "pat" | "remedialPts" | "remedialPat", val: string) => {
    setRaportItems((prev) =>
      prev.map((item) => (item.nisn === nisn ? { ...item, [field]: val } : item))
    );
  };

  const handleSavePtsPat = (nisn: string) => {
    const s = raportItems.find((x) => x.nisn === nisn);
    if (!s) return;

    // Calculate actual formative units
    const studEmail = globalSiswaList.find(g => String(g.nis) === String(nisn))?.email || "";
    const avgT1 = getAverageTugasForUnit(nisn, studEmail, 0);
    const avgT2 = getAverageTugasForUnit(nisn, studEmail, 1);
    const avgT3 = getAverageTugasForUnit(nisn, studEmail, 2);
    const computedScore = calculateFinalRaportScore(s, avgT1, avgT2, avgT3);

    setLoading(true);

    // Save remedial values in localStorage
    const storedRem = localStorage.getItem(remedialKey);
    const remedialMap = storedRem ? JSON.parse(storedRem) : {};
    remedialMap[nisn] = {
      remedialPts: s.remedialPts || "",
      remedialPat: s.remedialPat || "",
    };
    localStorage.setItem(remedialKey, JSON.stringify(remedialMap));

    // Save general values also in local storage for local persistence
    const storedOvr = localStorage.getItem(overrideKey);
    const overrideMap = storedOvr ? JSON.parse(storedOvr) : {};
    overrideMap[nisn] = {
      ...overrideMap[nisn],
      pts: s.pts,
      pat: s.pat,
      nilaiRaport: computedScore,
    };
    localStorage.setItem(overrideKey, JSON.stringify(overrideMap));

    fetchFromProxy({
      action: "inputRaportNilai",
      nisn: s.nisn,
      nama: s.nama,
      kelas: selectedKelas,
      mapel: selectedMapel,
      semester: selectedSemester,
      pts: s.pts,
      pat: s.pat,
    })
      .then((res) => {
        // Redraw table rows with computed averages
        setRaportItems((prev) =>
          prev.map((item) => {
            if (item.nisn === nisn) {
              const kkmLimit = Number(metaInfo.kkm || 83);
              return {
                ...item,
                uh1: res.uh1 !== undefined ? res.uh1 : item.uh1,
                uh2: res.uh2 !== undefined ? res.uh2 : item.uh2,
                uh3: res.uh3 !== undefined ? res.uh3 : item.uh3,
                nilaiRaport: computedScore,
                tuntas: computedScore >= kkmLimit,
              };
            }
            return item;
          })
        );
        alert(`Bismillah, nilai evaluasi ${s.nama} berhasil tersimpan ke sistem pusat & cadangan lokal!`);
      })
      .catch((e) => {
        console.warn("Proxy save request failed, updating local layout only:", e);
        setRaportItems((prev) =>
          prev.map((item) => {
            if (item.nisn === nisn) {
              const kkmLimit = Number(metaInfo.kkm || 83);
              return {
                ...item,
                nilaiRaport: computedScore,
                tuntas: computedScore >= kkmLimit,
              };
            }
            return item;
          })
        );
        alert(`Bismillah, lapor disimpan di memori lokal peramban. Rapor Akhir: ${computedScore}`);
      })
      .finally(() => setLoading(false));
  };

  // Override click handles
  const handleOpenOverride = (nisn: string, field: string) => {
    const s = raportItems.find((x) => x.nisn === nisn);
    if (!s) return;
    setOverrideState({
      nisn,
      field,
      label: field.toUpperCase(),
      val: String((s as any)[field] || ""),
    });
  };

  const submitOverride = () => {
    if (!overrideState) return;
    const s = raportItems.find((x) => x.nisn === overrideState.nisn);
    if (!s) return;

    setLoading(true);

    // Store in local overrides
    const storedOvr = localStorage.getItem(overrideKey);
    const overrideMap = storedOvr ? JSON.parse(storedOvr) : {};
    overrideMap[overrideState.nisn] = {
      ...overrideMap[overrideState.nisn],
      [overrideState.field]: overrideState.val
    };
    localStorage.setItem(overrideKey, JSON.stringify(overrideMap));

    const payload: any = {
      action: "inputRaportNilai",
      nisn: overrideState.nisn,
      nama: s.nama,
      kelas: selectedKelas,
      mapel: selectedMapel,
      semester: selectedSemester,
      pts: s.pts,
      pat: s.pat,
    };
    payload[overrideState.field + "Manual"] = overrideState.val;

    fetchFromProxy(payload)
      .then((res) => {
        setRaportItems((prev) =>
          prev.map((item) => {
            if (item.nisn === overrideState.nisn) {
              const studEmail = globalSiswaList.find(g => String(g.nis) === String(overrideState.nisn))?.email || "";
              const avgT1 = getAverageTugasForUnit(overrideState.nisn, studEmail, 0);
              const avgT2 = getAverageTugasForUnit(overrideState.nisn, studEmail, 1);
              const avgT3 = getAverageTugasForUnit(overrideState.nisn, studEmail, 2);

              const patchedItem = {
                ...item,
                [overrideState.field]: overrideState.val,
                uh1: res.uh1 !== undefined ? res.uh1 : (overrideState.field === "uh1" ? overrideState.val : item.uh1),
                uh2: res.uh2 !== undefined ? res.uh2 : (overrideState.field === "uh2" ? overrideState.val : item.uh2),
                uh3: res.uh3 !== undefined ? res.uh3 : (overrideState.field === "uh3" ? overrideState.val : item.uh3),
              };
              const newScore = calculateFinalRaportScore(patchedItem, avgT1, avgT2, avgT3);
              return {
                ...patchedItem,
                nilaiRaport: newScore,
                tuntas: newScore >= Number(metaInfo.kkm || 83),
              };
            }
            return item;
          })
        );
        alert("Bismillah, nilai harian berhasil di-override.");
        setOverrideState(null);
      })
      .catch((e) => {
        console.warn("Override failed on server, applying local-first override:", e);
        setRaportItems((prev) =>
          prev.map((item) => {
            if (item.nisn === overrideState.nisn) {
              const studEmail = globalSiswaList.find(g => String(g.nis) === String(overrideState.nisn))?.email || "";
              const avgT1 = getAverageTugasForUnit(overrideState.nisn, studEmail, 0);
              const avgT2 = getAverageTugasForUnit(overrideState.nisn, studEmail, 1);
              const avgT3 = getAverageTugasForUnit(overrideState.nisn, studEmail, 2);

              const patchedItem = {
                ...item,
                [overrideState.field]: overrideState.val,
              };
              const newScore = calculateFinalRaportScore(patchedItem, avgT1, avgT2, avgT3);
              return {
                ...patchedItem,
                nilaiRaport: newScore,
                tuntas: newScore >= Number(metaInfo.kkm || 83),
              };
            }
            return item;
          })
        );
        setOverrideState(null);
      })
      .finally(() => setLoading(false));
  };

  // Narasi editorial handling
  const handleOpenNarasi = (nisn: string) => {
    const s = raportItems.find((x) => x.nisn === nisn);
    if (!s) return;
    setNarasiSiswa({
      nisn,
      nama: s.nama,
      capaian: s.capaianPembelajaran || "",
      deskripsi: s.deskripsi || "",
    });
  };

  const handleGenerateNarasiAI = () => {
    if (!narasiSiswa) return;
    const s = raportItems.find((x) => x.nisn === narasiSiswa.nisn);
    if (!s) return;

    setAiLoading(true);
    generateNarasiAI(
      narasiSiswa.nama,
      selectedMapel,
      selectedKelas,
      s.nilaiRaport || "85",
      s.persenKehadiran || "100"
    )
      .then((res) => {
        setNarasiSiswa((prev: any) => ({
          ...prev,
          capaian: res.capaianBelajar || prev.capaian,
          deskripsi: res.narasiPembinaan || prev.deskripsi,
        }));
        alert("Masya Allah, narasi pembinaan islami berhasil dirumuskan oleh AI!");
      })
      .catch((e) => alert("Gagal memanggil asisten AI: " + e.message))
      .finally(() => setAiLoading(false));
  };

  const handleSaveNarasiSiswa = () => {
    if (!narasiSiswa) return;
    setLoading(true);

    // Save in local overrides
    const storedOvr = localStorage.getItem(overrideKey);
    const overrideMap = storedOvr ? JSON.parse(storedOvr) : {};
    overrideMap[narasiSiswa.nisn] = {
      ...overrideMap[narasiSiswa.nisn],
      capaianPembelajaran: narasiSiswa.capaian,
      deskripsi: narasiSiswa.deskripsi,
    };
    localStorage.setItem(overrideKey, JSON.stringify(overrideMap));

    fetchFromProxy({
      action: "inputRaportNilai",
      nisn: narasiSiswa.nisn,
      nama: narasiSiswa.nama,
      kelas: selectedKelas,
      mapel: selectedMapel,
      semester: selectedSemester,
      capaianOverride: narasiSiswa.capaian,
      deskripsiOverride: narasiSiswa.deskripsi,
    })
      .then((res) => {
        setRaportItems((prev) =>
          prev.map((item) =>
            item.nisn === narasiSiswa.nisn
              ? { ...item, capaianPembelajaran: narasiSiswa.capaian, deskripsi: narasiSiswa.deskripsi }
              : item
          )
        );
        alert("Bismillah, catatan pencapaian kompetensi siswa berhasil dievaluasi!");
        setNarasiSiswa(null);
      })
      .catch((e) => {
        console.warn("Proxy save for narasi failed, local updated:", e);
        setRaportItems((prev) =>
          prev.map((item) =>
            item.nisn === narasiSiswa.nisn
              ? { ...item, capaianPembelajaran: narasiSiswa.capaian, deskripsi: narasiSiswa.deskripsi }
              : item
          )
        );
        setNarasiSiswa(null);
      })
      .finally(() => setLoading(false));
  };

  // SheetJS client XLSX compiler matching the requested structure perfectly!
  const handleExportExcel = () => {
    if (raportItems.length === 0) {
      alert("Data raport masih kosong. Silakan muat kelas terlebih dahulu.");
      return;
    }

    const smstrLabel = selectedSemester === "2" ? "GENAP" : "GANJIL";
    const headerRows = [
      ["", "REKAP PENILAIAN RAPORT KURIKULUM MERDEKA - SMAIT AL ITTIHAD"],
      ["", `TAHUN PELAJARAN 2025/2026 - SEMESTER ${smstrLabel}`],
      [],
      ["", "Mata Pelajaran", ":", selectedMapel],
      ["", "Kelas", ":", selectedKelas],
      ["", "Wali Kelas", ":", metaInfo.waliKelas || "Ustadz Khairul Anwar, S.Pd"],
      ["", "KKM (Tuntas)", ":", metaInfo.kkm || 83],
      [],
      [
        "No",
        "Nama Siswa",
        "Daily Test 1",
        "Nilai Akumulasi Tugas 1",
        "Daily Test 2",
        "Nilai Akumulasi Tugas 2",
        "Daily Test 3",
        "Nilai Akumulasi Tugas 3",
        "Mid Test",
        "Remedial Mid-Test",
        "Final Test",
        "Remedial Final Test",
        "% Kehadiran",
        "Nilai Raport Pengetahuan",
        "Capaian Pembelajaran",
        "Deskripsi"
      ]
    ];

    raportItems.forEach((s, idx) => {
      const studEmail = globalSiswaList.find(g => String(g.nis) === String(s.nisn))?.email || "";
      const avgT1 = getAverageTugasForUnit(s.nisn, studEmail, 0);
      const avgT2 = getAverageTugasForUnit(s.nisn, studEmail, 1);
      const avgT3 = getAverageTugasForUnit(s.nisn, studEmail, 2);
      const calculatedScore = calculateFinalRaportScore(s, avgT1, avgT2, avgT3);

      headerRows.push([
        String(idx + 1),
        s.nama,
        s.uh1 === "" ? "" : String(s.uh1),
        avgT1 !== null ? String(avgT1) : "-",
        s.uh2 === "" ? "" : String(s.uh2),
        avgT2 !== null ? String(avgT2) : "-",
        s.uh3 === "" ? "" : String(s.uh3),
        avgT3 !== null ? String(avgT3) : "-",
        s.pts === "" ? "" : String(s.pts),
        s.remedialPts ? String(s.remedialPts) : "",
        s.pat === "" ? "" : String(s.pat),
        s.remedialPat ? String(s.remedialPat) : "",
        String(s.persenKehadiran) + "%",
        String(calculatedScore),
        s.capaianPembelajaran || "-",
        s.deskripsi || "-"
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(headerRows);
    worksheet["!cols"] = [
      { wch: 5 },  // No
      { wch: 25 }, // Nama Siswa
      { wch: 14 }, // Daily Test 1
      { wch: 22 }, // Nilai Akumulasi Tugas 1
      { wch: 14 }, // Daily Test 2
      { wch: 22 }, // Nilai Akumulasi Tugas 2
      { wch: 14 }, // Daily Test 3
      { wch: 22 }, // Nilai Akumulasi Tugas 3
      { wch: 12 }, // Mid Test
      { wch: 18 }, // Remedial Mid-Test
      { wch: 12 }, // Final Test
      { wch: 18 }, // Remedial Final Test
      { wch: 12 }, // % Kehadiran
      { wch: 22 }, // Nilai Raport Pengetahuan
      { wch: 35 }, // Capaian Pembelajaran
      { wch: 45 }  // Deskripsi
    ];

    const workbook = XLSX.utils.book_new();
    const sheetNoSpace = selectedKelas.replace(/\s+/g, "");
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetNoSpace);

    const outName = `Ledger_Penilaian_${selectedKelas.replace(/\s+/g, "_")}_${selectedMapel.replace(/\s+/g, "_")}_Sem2.xlsx`;
    XLSX.writeFile(workbook, outName);
  };

  const CLASSES = ["X 1","X 2","X 3","X 4","XI 1","XI 2","XI 3","XI 4","XII 1","XII 2","XII 3","XII 4"];

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
      {/* Header Info */}
      <div className="flex justify-between items-center bg-slate-50/80 p-4 border border-slate-100 rounded-xl flex-wrap gap-4">
        <div className="space-y-1 text-slate-800 text-xs">
          <p>🏫 <span className="font-bold text-slate-500">Mata Pelajaran:</span> {selectedMapel}</p>
          <p>📋 <span className="font-bold text-slate-500">Wali Kelas:</span> {metaInfo.waliKelas || "Ustadz Khairul Anwar, S.Pd"}</p>
          <p>🎯 <span className="font-bold text-slate-500">KKM Kelulusan:</span> <span className="bg-[#b31b1b]/10 text-[#b31b1b] font-bold px-1.5 py-0.5 rounded">{metaInfo.kkm || 83}</span></p>
        </div>
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition inline-flex items-center gap-1.5"
            onClick={handleExportExcel}
          >
            📊 Unduh Rapor Excel Resmi (KEMDIKBUD)
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pilih Rombel / Kelas</label>
          <select 
            className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-semibold"
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
          >
            {CLASSES.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mata Pelajaran</label>
          <select 
            className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-semibold"
            value={selectedMapel}
            onChange={(e) => setSelectedMapel(e.target.value)}
          >
            {mapelList.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Periode Semester</label>
          <select 
            className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-semibold"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="1">Semester 1 (Ganjil)</option>
            <option value="2">Semester 2 (Genap)</option>
          </select>
        </div>
      </div>

      <div className="bg-indigo-50/50 p-3.5 border border-indigo-100 rounded-xl text-[11px] text-indigo-800 space-y-1">
        <p className="font-bold">📘 Petunjuk Penilaian Al-Ittihad TP. 2025/2026:</p>
        <p className="leading-relaxed">
          1. <strong>Exams / Daily Test [1-3]</strong> dapat diketik langsung (klik untuk override harian). <br />
          2. <strong>Nilai Akumulasi Tugas [1-3]</strong> dihitung secara langsung sebagai nilai rata-rata dari tugas mandiri & kuis harian yang Anda terbitkan dan tautkan dengan Unit silabus bersangkutan di tab Silabus. <br />
          3. Sesuai bobot sekolah: <strong>Nilai Rapor (50% Formative [Rata Daily Test + Rata Tugas]) + (20% PTS/Mid) + (30% PAT/Final)</strong>. Nilai Remedial akan otomatis menutupi ujian utama apabila lebih besar.
        </p>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs text-left border-collapse min-w-[1240px]">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] text-center border-b border-slate-200">
              <th className="p-3 border-r border-slate-200 w-[50px]" rowSpan={2}>No</th>
              <th className="p-3 border-r border-slate-200 min-w-[180px]" rowSpan={2}>Nama Siswa</th>
              <th className="p-2 border-r border-slate-200 text-blue-800 bg-blue-50/40" colSpan={2}>Unit Pembelajaran 1</th>
              <th className="p-2 border-r border-slate-200 text-emerald-800 bg-emerald-50/40" colSpan={2}>Unit Pembelajaran 2</th>
              <th className="p-2 border-r border-slate-200 text-purple-800 bg-purple-50/40" colSpan={2}>Unit Pembelajaran 3</th>
              <th className="p-2 border-r border-slate-200 bg-slate-50" colSpan={2}>Mid Test (UTS)</th>
              <th className="p-2 border-r border-slate-200 bg-slate-50" colSpan={2}>Final Test (UAS)</th>
              <th className="p-2 border-r border-slate-200 w-[75px]" rowSpan={2}>% Absen</th>
              <th className="p-3 border-r border-slate-200 w-[95px] text-indigo-700 bg-indigo-50/20 font-black" rowSpan={2}>Nilai Rapor</th>
              <th className="p-3 border-r border-slate-200 w-[45px]" rowSpan={2}>Ket</th>
              <th className="p-3 w-[150px]" rowSpan={2}>Evaluasi Narasi / Aksi</th>
            </tr>
            <tr className="bg-slate-50 text-[9px] text-slate-500 font-bold text-center border-b border-slate-200">
              {/* Unit 1 */}
              <th className="p-2 border-r border-slate-200 bg-blue-50/20 w-[80px]">Daily Test 1</th>
              <th className="p-2 border-r border-slate-200 bg-blue-50/20 w-[110px]">Akumulasi Tugas 1</th>
              {/* Unit 2 */}
              <th className="p-2 border-r border-slate-200 bg-emerald-50/20 w-[80px]">Daily Test 2</th>
              <th className="p-2 border-r border-slate-200 bg-emerald-50/20 w-[110px]">Akumulasi Tugas 2</th>
              {/* Unit 3 */}
              <th className="p-2 border-r border-slate-200 bg-purple-50/20 w-[80px]">Daily Test 3</th>
              <th className="p-2 border-r border-slate-200 bg-purple-50/20 w-[110px]">Akumulasi Tugas 3</th>
              {/* Mid Test */}
              <th className="p-1 border-r border-slate-200 w-[70px]">Utama</th>
              <th className="p-1 border-r border-slate-200 text-[#b31b1b] w-[70px]">Remedial</th>
              {/* Final Test */}
              <th className="p-1 border-r border-slate-200 w-[70px]">Utama</th>
              <th className="p-1 border-r border-slate-200 text-[#b31b1b] w-[70px]">Remedial</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={16} className="p-10 text-center text-slate-400 font-mono">⏳ Mengalkulasi database penilaian di awan Al-Ittihad...</td>
              </tr>
            ) : raportItems.length > 0 ? (
              raportItems.map((s, idx) => {
                const studEmail = globalSiswaList.find(g => String(g.nis) === String(s.nisn))?.email || "";
                
                // Calculate dynamic homework average averages
                const avgT1 = getAverageTugasForUnit(s.nisn, studEmail, 0);
                const avgT2 = getAverageTugasForUnit(s.nisn, studEmail, 1);
                const avgT3 = getAverageTugasForUnit(s.nisn, studEmail, 2);

                const finalScore = calculateFinalRaportScore(s, avgT1, avgT2, avgT3);
                const isTuntas = finalScore >= Number(metaInfo.kkm || 83);

                return (
                  <tr key={idx} className="hover:bg-slate-50/60 font-semibold text-center border-b border-slate-100 min-h-[44px]">
                    {/* No */}
                    <td className="p-2 border-r border-slate-200 font-mono text-slate-400">{idx + 1}</td>
                    
                    {/* Nama Siswa */}
                    <td className="p-2.5 border-r border-slate-200 text-left font-bold text-slate-800">
                      <div>{s.nama}</div>
                      <div className="text-[9px] text-slate-400 font-mono font-medium mt-0.5">NISN: {s.nisn}</div>
                    </td>

                    {/* Unit 1 */}
                    <td 
                      onClick={() => handleOpenOverride(s.nisn, "uh1")}
                      className="p-2 border-r border-slate-200 font-mono text-indigo-600 font-bold decoration-dashed underline cursor-pointer hover:bg-slate-50 transition"
                      title="Klik untuk meng-override Daily Test 1 secara manual"
                    >
                      {s.uh1 === "" ? "-" : s.uh1}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-mono text-slate-500 bg-slate-50/20">
                      {avgT1 !== null ? (
                        <span className="font-bold text-slate-700">{avgT1}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Unit 2 */}
                    <td 
                      onClick={() => handleOpenOverride(s.nisn, "uh2")}
                      className="p-2 border-r border-slate-200 font-mono text-indigo-600 font-bold decoration-dashed underline cursor-pointer hover:bg-slate-50 transition"
                      title="Klik untuk meng-override Daily Test 2 secara manual"
                    >
                      {s.uh2 === "" ? "-" : s.uh2}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-mono text-slate-500 bg-slate-50/20">
                      {avgT2 !== null ? (
                        <span className="font-bold text-slate-700">{avgT2}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Unit 3 */}
                    <td 
                      onClick={() => handleOpenOverride(s.nisn, "uh3")}
                      className="p-2 border-r border-slate-200 font-mono text-indigo-600 font-bold decoration-dashed underline cursor-pointer hover:bg-slate-50 transition"
                      title="Klik untuk meng-override Daily Test 3 secara manual"
                    >
                      {s.uh3 === "" ? "-" : s.uh3}
                    </td>
                    <td className="p-2 border-r border-slate-200 font-mono text-slate-500 bg-slate-50/20">
                      {avgT3 !== null ? (
                        <span className="font-bold text-slate-700">{avgT3}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* UTS / Mid Test */}
                    <td className="p-1 border-r border-slate-200">
                      <input 
                        type="number"
                        min={0}
                        max={100}
                        className="w-full p-1 border border-slate-150 rounded text-center text-xs font-semibold text-slate-800 bg-slate-50/45 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        value={s.pts || ""}
                        placeholder="-"
                        onChange={(e) => handleFieldChange(s.nisn, "pts", e.target.value)}
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input 
                        type="number"
                        min={0}
                        max={100}
                        className="w-full p-1 border border-[#b31b1b]/15 rounded text-center text-xs font-bold text-[#b31b1b] bg-[#b31b1b]/5 focus:bg-white focus:ring-1 focus:ring-[#b31b1b]"
                        value={s.remedialPts || ""}
                        placeholder="-"
                        onChange={(e) => handleFieldChange(s.nisn, "remedialPts", e.target.value)}
                      />
                    </td>

                    {/* UAS / Final Test */}
                    <td className="p-1 border-r border-slate-200">
                      <input 
                        type="number"
                        min={0}
                        max={100}
                        className="w-full p-1 border border-slate-150 rounded text-center text-xs font-semibold text-slate-800 bg-slate-50/45 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        value={s.pat || ""}
                        placeholder="-"
                        onChange={(e) => handleFieldChange(s.nisn, "pat", e.target.value)}
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input 
                        type="number"
                        min={0}
                        max={100}
                        className="w-full p-1 border border-[#b31b1b]/15 rounded text-center text-xs font-bold text-[#b31b1b] bg-[#b31b1b]/5 focus:bg-white focus:ring-1 focus:ring-[#b31b1b]"
                        value={s.remedialPat || ""}
                        placeholder="-"
                        onChange={(e) => handleFieldChange(s.nisn, "remedialPat", e.target.value)}
                      />
                    </td>

                    {/* Kehadiran */}
                    <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-650">{s.persenKehadiran}%</td>
                    
                    {/* Final calculated raport score */}
                    <td className="p-2 border-r border-slate-250 bg-indigo-50/10 font-mono font-extrabold text-indigo-700 text-sm">
                      {finalScore}
                    </td>

                    {/* Keterangan */}
                    <td className="p-2 border-r border-slate-200 font-bold">
                      {isTuntas ? (
                        <span className="text-emerald-600" title="Tuntas (Lulus)">T</span>
                      ) : (
                        <span className="text-[#b31b1b]" title="Belum Tuntas">TT</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-1 text-center">
                      <div className="flex gap-1 justify-center">
                        <button 
                          className="flex-1 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold border border-emerald-200 rounded text-[9px] cursor-pointer transition"
                          onClick={() => handleSavePtsPat(s.nisn)}
                        >
                          💾 Simpan
                        </button>
                        <button 
                          className="flex-1 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold border border-indigo-200 rounded text-[9px] cursor-pointer transition"
                          onClick={() => handleOpenNarasi(s.nisn)}
                        >
                          📝 Narasi Rapor
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={16} className="p-6 text-center text-slate-400">Pilih kelas di atas untuk memuat daftar laporan kualifikasi siswa Romadhon.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 1. Modal Dialog Override UH */}
      {overrideState && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[1100]">
          <div className="bg-white p-5 rounded-xl border border-slate-200 max-w-sm w-full space-y-3 shadow-2xl animate-in fade-in zoom-in duration-150">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">✏️ Koreksi Nilai Harian — {overrideState.label}</h3>
            <p className="text-[11px] text-slate-400 leading-normal">Penyuntingan harian ini akan menimpa penghitungan rata harian tugas materi silabus secara manual demi penyesuaian khusus.</p>
            <input 
              type="number"
              min={0}
              max={100}
              className="w-full p-2 border border-slate-200 rounded-xl text-slate-800 text-sm font-bold text-center bg-slate-50 focus:bg-white"
              value={overrideState.val}
              onChange={(e) => setOverrideState((prev: any) => ({ ...prev, val: e.target.value }))}
            />
            <div className="flex gap-2">
              <button 
                onClick={submitOverride}
                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm transition"
              >
                Terapkan
              </button>
              <button 
                onClick={() => setOverrideState(null)}
                className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Dialog Narasi Raport */}
      {narasiSiswa && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[1100]">
          <div className="bg-white p-5 rounded-xl border border-slate-250 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-150">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">📝 Catatan Narasi — {narasiSiswa.nama}</h3>
            
            <button 
              onClick={handleGenerateNarasiAI}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer transition flex items-center justify-center gap-1.5 shadow-sm"
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>⏳ AI sedang memikirkan narasi terbaik...</>
              ) : (
                <>✨ Hubungkan &amp; Generate Narasi via AI Gemini</>
              )}
            </button>

            <div>
              <label className="text-[9px] uppercase font-black tracking-wider text-slate-400 block mb-1">Capaian Kompetensi Terpilih</label>
              <textarea 
                className="w-full p-2 border border-slate-200 rounded-xl text-xs text-slate-850 bg-slate-50 focus:bg-white"
                rows={2}
                value={narasiSiswa.capaian}
                onChange={(e) => setNarasiSiswa((prev: any) => ({ ...prev, capaian: e.target.value }))}
                placeholder="Ex: Ananda menunjukkan keunggulan yang memuaskan dalam menyusun teks recount..."
              />
            </div>

            <div>
              <label className="text-[9px] uppercase font-black tracking-wider text-slate-400 block mb-1">Uraian Evaluasi Deskriptif</label>
              <textarea 
                className="w-full p-2 border border-slate-200 rounded-xl text-xs text-slate-850 bg-slate-50 focus:bg-white"
                rows={4}
                value={narasiSiswa.deskripsi}
                onChange={(e) => setNarasiSiswa((prev: any) => ({ ...prev, deskripsi: e.target.value }))}
                placeholder="Ex: Selalu aktif di kelas, pertahankan komitmen salat berjamaah..."
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleSaveNarasiSiswa}
                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-sm transition"
              >
                Simpan Review Narasi
              </button>
              <button 
                onClick={() => setNarasiSiswa(null)}
                className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
