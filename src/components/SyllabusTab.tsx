import React, { useState, useEffect } from "react";
import { SilabusUnit } from "../types";
import { fetchFromProxy } from "../utils";

interface SyllabusTabProps {
  mapelList: string[];
}

const CLASSES = ["X 1","X 2","X 3","X 4","XI 1","XI 2","XI 3","XI 4","XII 1","XII 2","XII 3","XII 4"];
const SEMESTERS = ["1", "2"];
const TAHUN_AJARANS = ["2026/2027", "2027/2028", "2028/2029", "2029/2030", "2030/2031"];

export default function SyllabusTab({ mapelList }: SyllabusTabProps) {
  // Source class for the interactive grid editor
  const [selectedKelasSource, setSelectedKelasSource] = useState<string>("XI 1");
  const [selectedMapel, setSelectedMapel] = useState<string>(mapelList[0] || "English Wajib");
  const [selectedSemester, setSelectedSemester] = useState<string>("1");
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>("2026/2027");

  // Selection state for target classes to receive this syllabus
  const [checkedClasses, setCheckedClasses] = useState<Record<string, boolean>>({
    "XI 1": true // default check the source class
  });

  const [silabusItems, setSilabusCache] = useState<SilabusUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [allSyllabi, setAllSyllabi] = useState<any[]>([]);

  // Recap Section Filters
  const [recapKelas, setRecapKelas] = useState<string>("Semua");
  const [recapMapel, setRecapMapel] = useState<string>("Semua");
  const [recapSemester, setRecapSemester] = useState<string>("Semua");
  const [recapTahun, setRecapTahun] = useState<string>("Semua");

  useEffect(() => {
    loadSilabus();
  }, [selectedKelasSource, selectedMapel, selectedSemester, selectedTahunAjaran]);

  useEffect(() => {
    // When source class changes, auto-check it in checkboxes to make sure it's the main target
    setCheckedClasses({
      [selectedKelasSource]: true
    });
  }, [selectedKelasSource]);

  const loadSilabus = () => {
    if (!selectedKelasSource || !selectedMapel) return;
    setLoading(true);
    
    const storageKey = `silabus_${selectedKelasSource}_${selectedMapel}_${selectedSemester}_${selectedTahunAjaran}`;
    const localData = localStorage.getItem(storageKey);
    
    fetchFromProxy({
      action: "getSilabus",
      kelas: selectedKelasSource,
      mapel: selectedMapel,
      semester: selectedSemester,
      tahunAjaran: selectedTahunAjaran,
    })
      .then((res) => {
        if (res.silabus && res.silabus.length > 0) {
          setSilabusCache(res.silabus);
          localStorage.setItem(storageKey, JSON.stringify(res.silabus));
        } else if (localData) {
          setSilabusCache(JSON.parse(localData));
        } else {
          // Fallback to default row if nothing is found
          setSilabusCache([
            { nomorUnit: 1, judulUnit: "", pokokBahasan: "", jenisPenilaian: "latihan", kelompokUH: "1" }
          ]);
        }
      })
      .catch((e) => {
        console.warn("Proxy loaded error, calling local fallback:", e);
        if (localData) {
          setSilabusCache(JSON.parse(localData));
        } else {
          setSilabusCache([
            { nomorUnit: 1, judulUnit: "", pokokBahasan: "", jenisPenilaian: "latihan", kelompokUH: "1" }
          ]);
        }
      })
      .finally(() => {
        setLoading(false);
        refreshAllSyllabi();
      });
  };

  const refreshAllSyllabi = () => {
    const items: any[] = [];
    
    // Seed initial syllabus data if nothing exists to make the recap screen look rich immediately
    const hasSyllabi = Object.keys(localStorage).some(key => key.startsWith("silabus_"));
    if (!hasSyllabi) {
      const seedMap: Record<string, any[]> = {
        "silabus_XI 1_English Wajib_1_2026/2027": [
          { nomorUnit: 1, judulUnit: "Mastering Analytical Exposition Text", pokokBahasan: "Adverbs, writing arguments, stating thesis", jenisPenilaian: "tugas" },
          { nomorUnit: 2, judulUnit: "Introduction to Formal Invitation Letters", pokokBahasan: "Formal greetings, layout body structures, rsvp card options", jenisPenilaian: "quiz" }
        ],
        "silabus_XI 1_English Lanjut_1_2026/2027": [
          { nomorUnit: 1, judulUnit: "Advanced Persuasive Public Speaking", pokokBahasan: "Ethos, Pathos, Logos framework, rhetorical question loops", jenisPenilaian: "proyek" }
        ],
        "silabus_XI 1_Bahasa Indonesia_2_2026/2027": [
          { nomorUnit: 1, judulUnit: "Mengembangkan Karya Ilmiah Populer", pokokBahasan: "Metode literatur, struktur argumentatif, penyusunan kuesioner", jenisPenilaian: "proyek" }
        ],
        "silabus_XII 1_Bahasa Arab_1_2026/2027": [
          { nomorUnit: 1, judulUnit: "Pola Percakapan (Hiwar) & Kaidah Balaghah", pokokBahasan: "Kosa kata harian, pola isim fiil huruf, keindahan majas", jenisPenilaian: "UH/daily test" }
        ]
      };
      
      Object.entries(seedMap).forEach(([k, v]) => {
        localStorage.setItem(k, JSON.stringify(v));
      });
    }

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("silabus_")) {
        const parts = key.split("_"); // ["silabus", "kelas", "mapel", "semester", "tahunAjaran"]
        if (parts.length >= 5) {
          try {
            const rows = JSON.parse(localStorage.getItem(key) || "[]");
            rows.forEach((r: any) => {
              items.push({
                kelas: parts[1],
                mapel: parts[2],
                semester: parts[3],
                tahunAjaran: parts[4],
                nomorUnit: r.nomorUnit || r.noUnit || "1",
                judulUnit: r.judulUnit || "Unit Baru",
                pokokBahasan: r.pokokBahasan || r.pokokMateri || "",
                jenisPenilaian: r.jenisPenilaian || "latihan"
              });
            });
          } catch (e) {
            console.error("Error parsing stored syllabus item:", e);
          }
        }
      }
    }
    setAllSyllabi(items);
  };

  const handleAddField = () => {
    const nextNum = silabusItems.length > 0 
      ? Math.max(...silabusItems.map((u) => Number(u.nomorUnit) || 0)) + 1 
      : 1;
    setSilabusCache((prev) => [
      ...prev,
      { nomorUnit: nextNum, judulUnit: "", pokokBahasan: "", jenisPenilaian: "latihan", kelompokUH: "1" },
    ]);
  };

  const handleRemoveField = (idx: number) => {
    setSilabusCache((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFieldChange = (idx: number, field: string, value: string) => {
    setSilabusCache((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleSilabusPaste = (e: React.ClipboardEvent, startIdx: number, startField: string) => {
    const textData = e.clipboardData.getData("text");
    if (!textData || (!textData.includes("\t") && !textData.includes("\n"))) {
      return;
    }
    e.preventDefault();

    const fieldsSchema = ["nomorUnit", "judulUnit", "pokokBahasan", "jenisPenilaian"];
    const startFieldIdx = fieldsSchema.indexOf(startField);
    const splitRows = textData.replace(/\r/g, "").split("\n").filter((r) => r.length > 0);

    setSilabusCache((prev) => {
      const copy = [...prev];
      splitRows.forEach((rowRawText, rowOffset) => {
        const rowCells = rowRawText.split("\t");
        const targetRowIdx = startIdx + rowOffset;

        if (!copy[targetRowIdx]) {
          copy[targetRowIdx] = { nomorUnit: "", judulUnit: "", pokokBahasan: "", jenisPenilaian: "latihan", kelompokUH: "1" };
        }

        rowCells.forEach((cellRaw, cellOffset) => {
          const targetFieldIdx = startFieldIdx + cellOffset;
          if (targetFieldIdx >= fieldsSchema.length) return;
          const fieldName = fieldsSchema[targetFieldIdx];
          let value = cellRaw.trim();
          
          if (fieldName === "jenisPenilaian") {
            const valLower = value.toLowerCase();
            if (valLower.includes("latihan")) value = "latihan";
            else if (valLower.includes("quiz") || valLower.includes("kuis")) value = "quiz";
            else if (valLower.includes("tugas")) value = "tugas";
            else if (valLower.includes("proyek") || valLower.includes("project")) value = "proyek";
            else if (valLower.includes("uh") || valLower.includes("daily") || valLower.includes("test")) value = "UH/daily test";
            else value = "latihan";
          }
          copy[targetRowIdx] = { ...copy[targetRowIdx], [fieldName]: value };
        });
      });
      return copy;
    });
  };

  const handleCheckboxToggle = (cls: string) => {
    setCheckedClasses((prev) => ({
      ...prev,
      [cls]: !prev[cls]
    }));
  };

  const handleSelectAllClasses = () => {
    const next: Record<string, boolean> = {};
    CLASSES.forEach(cls => {
      next[cls] = true;
    });
    setCheckedClasses(next);
  };

  const handleClearAllClasses = () => {
    setCheckedClasses({
      [selectedKelasSource]: true
    });
  };

  const handleSaveAll = async () => {
    const validRows = silabusItems.filter((u) => u.nomorUnit && u.judulUnit && u.judulUnit.trim());
    if (validRows.length === 0) {
      alert("Isi minimal 1 baris (Nomor Unit + Judul Unit) sebelum menyimpan silabus.");
      return;
    }

    const classesToReceive = Object.keys(checkedClasses).filter(cls => checkedClasses[cls]);
    if (classesToReceive.length === 0) {
      alert("Silakan pilih minimal 1 kelas target pengiriman melewati checkbox.");
      return;
    }

    setLoading(true);
    let successCount = 0;

    try {
      for (const cls of classesToReceive) {
        // Build the request payload
        await fetchFromProxy({
          action: "saveSilabusBatch",
          kelas: cls,
          mapel: selectedMapel,
          semester: selectedSemester,
          tahunAjaran: selectedTahunAjaran,
          rows: validRows,
        });

        // Save local persistent key
        const storageKey = `silabus_${cls}_${selectedMapel}_${selectedSemester}_${selectedTahunAjaran}`;
        localStorage.setItem(storageKey, JSON.stringify(validRows));
        successCount++;
      }

      alert(`Alhamdulillah, silabus berhasil didistribusikan ke ${successCount} kelas sekaligus!`);
      loadSilabus();
    } catch (e: any) {
      alert("Sebagian/seluruh silabus gagal tersimpan: " + e.message);
    } finally {
      setLoading(false);
      refreshAllSyllabi();
    }
  };

  // Filtered lists for the syllabus recap table
  const filteredRecap = allSyllabi.filter((item) => {
    if (recapKelas !== "Semua" && item.kelas !== recapKelas) return false;
    if (recapMapel !== "Semua" && item.mapel !== recapMapel) return false;
    if (recapSemester !== "Semua" && item.semester !== recapSemester) return false;
    if (recapTahun !== "Semua" && item.tahunAjaran !== recapTahun) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* SECTION 1: EDITOR SILABUS */}
      <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            📚 Kelola & Desentralisasi Silabus Kurikulum
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Unduh atau sunting silabus kelas terpilih. Anda dapat menyuntingnya baris-per-baris atau <b className="text-indigo-600">menyalin dari Excel/Google Sheets lalu paste (Ctrl+V) langsung</b> ke sel tabel mana saja.
          </p>
        </div>

        {/* Filters Top */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Kelas Sumber</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded bg-white text-xs mt-1 text-slate-800 font-semibold"
              value={selectedKelasSource}
              onChange={(e) => setSelectedKelasSource(e.target.value)}
            >
              {CLASSES.map((k) => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Mata Pelajaran (Kurikulum)</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded bg-white text-xs mt-1 text-slate-800 font-semibold"
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
            >
              {mapelList.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Semester</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded bg-white text-xs mt-1 text-slate-800 font-semibold"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
            >
              {SEMESTERS.map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Tahun Ajaran</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded bg-white text-xs mt-1 text-slate-800 font-semibold"
              value={selectedTahunAjaran}
              onChange={(e) => setSelectedTahunAjaran(e.target.value)}
            >
              {TAHUN_AJARANS.map((ta) => (
                <option key={ta} value={ta}>{ta}</option>
              ))}
            </select>
          </div>
        </div>

        {/* NEW: Multi-Class Target Distribution Checkboxes */}
        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 block">⚡ KIRIM SEKALIGUS KE KELAS BERIKUTNYA</span>
              <span className="text-[10px] text-slate-500">Centang kelas mana saja yang memiliki mata pelajaran, semester & tahun ajaran serupa untuk menayangkan silabus ini sekaligus.</span>
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={handleSelectAllClasses}
                className="text-[10px] bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold px-2 py-1 rounded transition"
              >
                Centang Semua
              </button>
              <button 
                type="button" 
                onClick={handleClearAllClasses}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-1 rounded transition"
              >
                Reset (Hanya Sumber)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2 pt-1">
            {CLASSES.map((cls) => {
              const isSource = cls === selectedKelasSource;
              const isChecked = checkedClasses[cls] || false;
              return (
                <label 
                  key={cls} 
                  className={`flex items-center justify-center gap-1.5 p-2 rounded border cursor-pointer select-none text-[11px] font-semibold transition ${
                    isSource 
                      ? "bg-amber-100 border-amber-300 text-amber-900" 
                      : isChecked 
                        ? "bg-indigo-600 border-indigo-700 text-white" 
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={isChecked} 
                    disabled={isSource} 
                    onChange={() => handleCheckboxToggle(cls)}
                    className="accent-indigo-600 cursor-pointer w-3.5 h-3.5"
                  />
                  <span>{cls}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Spreadsheet Editor Grid */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <th className="p-2.5 w-[90px] border-r border-slate-200 text-center">No. Unit</th>
                <th className="p-2.5 w-[250px] border-r border-slate-200 text-left">Judul Unit Pokok</th>
                <th className="p-2.5 border-r border-slate-200 text-left">Pokok Bahasan / Materi Penjabaran</th>
                <th className="p-2.5 w-[160px] border-r border-slate-200 text-center">Jenis Penilaian</th>
                <th className="p-2.5 w-[60px] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-mono animate-pulse">⏳ Menghubungi Cloud & Sinkronisasi Silabus...</td>
                </tr>
              ) : silabusItems.length > 0 ? (
                silabusItems.map((u, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200">
                    <td className="p-1 border-r border-slate-200 text-center">
                      <input 
                        type="number" 
                        className="w-full p-1.5 border border-slate-200 rounded text-center text-slate-800 font-semibold"
                        value={u.nomorUnit || ""}
                        onChange={(e) => handleFieldChange(idx, "nomorUnit", e.target.value)}
                        onPaste={(e) => handleSilabusPaste(e, idx, "nomorUnit")}
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input 
                        type="text" 
                        className="w-full p-1.5 border border-slate-200 rounded font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                        value={u.judulUnit || ""}
                        placeholder="Contoh: Analytical Exposition"
                        onChange={(e) => handleFieldChange(idx, "judulUnit", e.target.value)}
                        onPaste={(e) => handleSilabusPaste(e, idx, "judulUnit")}
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input 
                        type="text" 
                        className="w-full p-1.5 border border-slate-200 rounded text-slate-800 focus:ring-1 focus:ring-indigo-500"
                        value={u.pokokBahasan || ""}
                        placeholder="Materi inti, sub-topik penulisan, adverbs..."
                        onChange={(e) => handleFieldChange(idx, "pokokBahasan", e.target.value)}
                        onPaste={(e) => handleSilabusPaste(e, idx, "pokokBahasan")}
                      />
                    </td>
                    <td className="p-1 border-r border-slate-200 text-center">
                      <select 
                        className="w-full p-1.5 border border-slate-200 bg-white rounded font-medium text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                        value={u.jenisPenilaian || "latihan"}
                        onChange={(e) => handleFieldChange(idx, "jenisPenilaian", e.target.value)}
                      >
                        <option value="latihan">Latihan Mandiri</option>
                        <option value="quiz">Interactive Quiz</option>
                        <option value="tugas">E-Tugas Uraian</option>
                        <option value="proyek">Proyek Kelompok</option>
                        <option value="UH/daily test">UH / Daily Test</option>
                      </select>
                    </td>
                    <td className="p-1 text-center">
                      <button 
                        type="button"
                        className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded cursor-pointer transition"
                        onClick={() => handleRemoveField(idx)}
                        title="Hapus baris ini"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-400">Belum ada baris silabus. Klik "+ Tambah Baris" untuk menyusun kurikulum.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2.5 pt-1">
          <button 
            type="button"
            className="flex-1 py-2 bg-slate-50 border border-dashed border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-bold rounded-lg text-xs transition duration-200 cursor-pointer"
            onClick={handleAddField}
          >
            ➕ Tambah Baris Silabus Baru
          </button>
          <button 
            type="button"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition duration-200 cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-55"
            onClick={handleSaveAll}
          >
            💾 Distribusikan & Simpan Semua
          </button>
        </div>
      </div>

      {/* SECTION 2: REKAPAN SILABUS PERKELAS/PERMAPEL/SEMESTER/TAHUN AJARAN */}
      <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              📊 Rekapitulasi & Arsip Kurikulum Silabus
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Tinjauan kurikulum global berdasarkan pengelompokan filter di bawah ini.
            </p>
          </div>
          <div className="text-[11px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 font-bold rounded">
            Total Tercatat: {allSyllabi.length} Baris Kurikulum
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400">Saring Kelas</label>
            <select
              value={recapKelas}
              onChange={(e) => setRecapKelas(e.target.value)}
              className="w-full mt-1 p-1.5 border border-slate-200 bg-white rounded text-xs font-semibold text-slate-700"
            >
              <option value="Semua">Semua Kelas</option>
              {CLASSES.map(c => <option key={c} value={c}>Kelas {c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400">Saring Mapel</label>
            <select
              value={recapMapel}
              onChange={(e) => setRecapMapel(e.target.value)}
              className="w-full mt-1 p-1.5 border border-slate-200 bg-white rounded text-xs font-semibold text-slate-700"
            >
              <option value="Semua">Semua Mapel</option>
              {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400">Saring Semester</label>
            <select
              value={recapSemester}
              onChange={(e) => setRecapSemester(e.target.value)}
              className="w-full mt-1 p-1.5 border border-slate-200 bg-white rounded text-xs font-semibold text-slate-700"
            >
              <option value="Semua">Semua Semester</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400">Saring Tahun Ajaran</label>
            <select
              value={recapTahun}
              onChange={(e) => setRecapTahun(e.target.value)}
              className="w-full mt-1 p-1.5 border border-slate-200 bg-white rounded text-xs font-semibold text-slate-700"
            >
              <option value="Semua">Semua Tahun</option>
              {TAHUN_AJARANS.map(ta => <option key={ta} value={ta}>{ta}</option>)}
            </select>
          </div>
        </div>

        {/* Results list grouped and displayed */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-2.5">Tahun Ajaran</th>
                <th className="p-2.5">Kelas</th>
                <th className="p-2.5">Mapel</th>
                <th className="p-2.5 text-center">Smt</th>
                <th className="p-2.5 text-center">No</th>
                <th className="p-2.5">Judul Pokok Pembelajaran</th>
                <th className="p-2.5">Syllabus Pokok Bahasan</th>
                <th className="p-2.5 text-center">Evaluasi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecap.length > 0 ? (
                filteredRecap.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 border-b border-slate-100 transition text-slate-700">
                    <td className="p-2 font-mono font-bold text-slate-600">{item.tahunAjaran}</td>
                    <td className="p-2"><span className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[10px]">{item.kelas}</span></td>
                    <td className="p-2 font-semibold text-indigo-900">{item.mapel}</td>
                    <td className="p-2 text-center text-slate-500 font-bold">{item.semester}</td>
                    <td className="p-2 text-center font-mono font-semibold text-slate-500">{item.nomorUnit}</td>
                    <td className="p-2 font-semibold">{item.judulUnit}</td>
                    <td className="p-2 text-slate-600 italic whitespace-normal max-w-xs truncate" title={item.pokokBahasan}>{item.pokokBahasan}</td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.jenisPenilaian === "UH/daily test" 
                          ? "bg-rose-50 border border-rose-200 text-rose-700" 
                          : item.jenisPenilaian === "quiz" 
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                            : item.jenisPenilaian === "tugas"
                              ? "bg-indigo-50 border border-indigo-200 text-indigo-750"
                              : item.jenisPenilaian === "proyek"
                                ? "bg-purple-50 border border-purple-200 text-purple-700"
                                : "bg-slate-100 text-slate-600"
                      }`}>
                        {item.jenisPenilaian}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Tidak ada rekapan silabus yang cocok dengan filter yang Anda gunakan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
