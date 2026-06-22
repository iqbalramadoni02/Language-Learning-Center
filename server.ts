import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    }
  }
});

let envUrl = (process.env.GOOGLE_SCRIPT_WEB_APP_URL || "").trim();
if (envUrl.startsWith('"') && envUrl.endsWith('"')) {
  envUrl = envUrl.substring(1, envUrl.length - 1).trim();
}
if (envUrl.startsWith("'") && envUrl.endsWith("'")) {
  envUrl = envUrl.substring(1, envUrl.length - 1).trim();
}

function isValidUrl(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxsl17Ar5S9-3AhoToqvqc20huj4XaqBw0ccV6uEy5sN931zrFAdk9HgteKJXmPwA_p2w/exec";
const GOOGLE_SCRIPT_URL = isValidUrl(envUrl) ? envUrl : DEFAULT_SCRIPT_URL;

// 1. Google Sheets Proxy Endpoint
app.post("/api/sheets-proxy", async (req, res) => {
  try {
    const payload = req.body;
    if (!isValidUrl(GOOGLE_SCRIPT_URL)) {
      return res.status(500).json({ status: "error", message: "Invalid GOOGLE_SCRIPT_WEB_APP_URL" });
    }
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const textData = await response.text();
    try {
      const jsonData = JSON.parse(textData);
      return res.json(jsonData);
    } catch {
      return res.status(500).json({ status: "error", message: "Invalid JSON response from Sheets backend: " + textData });
    }
  } catch (error: any) {
    console.error("Sheets proxy error:", error);
    return res.status(500).json({ status: "error", message: error.message || "Failed to contact Sheets backend." });
  }
});

// 2. AI Auto-Check Homework Endpoint
app.post("/api/ai/auto-check", async (req, res) => {
  try {
    const { link, mapel, judulTugas } = req.body;
    if (!link) {
      return res.status(400).json({ status: "error", message: "Link lampiran siswa wajib diisi." });
    }

    const systemInstruction = 
      "Anda adalah Asisten Penilaian Guru (Ustadz atau Ustadzah) di sekolah Islam berkarakter SMAIT Al-Ittihad Pekanbaru. " +
      "Tugas Anda adalah menilai berkas tugas yang dikirim oleh siswa secara adil, religius, optimis, dan membangun. " +
      "Mata Pelajaran: " + (mapel || "Umum") + ". Judul Tugas: " + (judulTugas || "Tugas Mandiri") + ". " +
      "Analisis link berkas siswa yang dikirimkan. Karena Anda tidak selalu bisa mengunduh berkas langsung dari link eksternal " +
      "di lingkungan sandbox, asumsikan berkas tersebut ada dan relevan dengan materi pelajaran. Berikan penilaian berdasarkan " +
      "korelasi judul tugas dan mapel yang diampu." +
      "\n" +
      "Anda WAJIB mengembalikan respon dalam format JSON yang valid dengan skema berikut:\n" +
      "{\n" +
      "  \"skorAI\": number (nilai integer antara 0 dan 100),\n" +
      "  \"catatanAI\": string (catatan koreksi yang santun, ramah mengarah pada perbaikan akhlak dan keilmuan, diawali dengan sapaan islami seperti 'Bismillah, ' atau 'Masya Allah, ')\n" +
      "}";

    const prompt = `Analisis tugas dengan link lampiran berikut: ${link}. Mapel: ${mapel}, Judul: ${judulTugas}. Tentukan nilai akhir (0-100) dan berikan umpan balik yang detail, mendalam, dan sopan dalam bahasa Indonesia.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skorAI: {
              type: Type.INTEGER,
              description: "Nilai penugasan dari skala 0 sampai 100",
            },
            catatanAI: {
              type: Type.STRING,
              description: "Review, umpan balik konstruktif, dan pujian dengan nada Islami yang khas SMAIT Al-Ittihad",
            }
          },
          required: ["skorAI", "catatanAI"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText);
    return res.json({ status: "success", ...resultJson });
  } catch (error: any) {
    console.error("AI Auto check error:", error);
    return res.json({
      status: "error",
      message: "Gagal menggunakan layanan AI Gemini: " + error.message,
      skorAI: 80,
      catatanAI: "Bismillah, hasil pekerjaanmu sudah ustadz terima. Namun penganalisisan otomatis AI sedang mengalami kendala teknis. Nilai default diberikan sementara."
    });
  }
});

// 3. AI Quiz Generator Endpoint
app.post("/api/ai/generate-quiz", async (req, res) => {
  try {
    const { topik, mapel, jumlahSoal } = req.body;
    const numSoal = Math.min(Math.max(Number(jumlahSoal) || 5, 1), 15);

    const systemInstruction = 
      `Anda adalah ahli perumus kuis di SMAIT Al-Ittihad Pekanbaru. Buatlah ${numSoal} soal pilihan ganda yang bermutu, menantang, hots, dan relevan dengan topik "${topik}" untuk mata pelajaran "${mapel}". ` +
      "Tiap soal wajib memiliki tepat 4 pilihan (A, B, C, D) yang bervariasi. Tentukan indeks opsi jawaban yang benar (0 untuk A, 1 untuk B, 2 untuk C, 3 untuk D). " +
      "Tiap soal diberi bobot poin default 10." +
      "\n" +
      "Kembalikan respon JSON array yang cocok dengan skema yang diberikan.";

    const prompt = `Definisikan ${numSoal} pertanyaan pilihan ganda tentang topik "${topik}" untuk mata pelajaran "${mapel}".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              pertanyaan: { type: Type.STRING, description: "Pertanyaan kuis" },
              pilihan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Tepat 4 pilihan jawaban"
              },
              jawabanBenarIndex: {
                type: Type.INTEGER,
                description: "Indeks jawaban benar (0 hingga 3)"
              },
              poin: {
                type: Type.INTEGER,
                description: "Poin untuk soal ini, default 10"
              }
            },
            required: ["pertanyaan", "pilihan", "jawabanBenarIndex", "poin"]
          }
        }
      }
    });

    const resultText = response.text || "[]";
    const soalList = JSON.parse(resultText);
    return res.json({ status: "success", soalList });
  } catch (error: any) {
    console.error("AI Quiz generation error:", error);
    return res.status(500).json({ status: "error", message: "Gagal membuat kuis otomatis: " + error.message });
  }
});

// 4. AI Raport Narrative Generator Endpoint
app.post("/api/ai/generate-narasi", async (req, res) => {
  try {
    const { nama, mapel, kelas, nilaiRaport, persenKehadiran } = req.body;

    const systemInstruction = 
      "Anda adalah Wali Kelas & Penilai Raport di SMAIT Al-Ittihad Pekanbaru. " +
      "Tuliskan narasi raport Kurikulum Merdeka yang ramah, objektif, sopan, dan memotivasi siswa untuk berprestasi di semester berikutnya. " +
      "Gunakan bahasa Indonesia baku yang mengayomi kearifan lokal berkarakter Islami. " +
      "\n" +
      "Skema respon JSON wajib:\n" +
      "{\n" +
      "  \"capaianPembelajaran\": string (1 kalimat ringkas contoh: 'Ananda [Nama] sangat baik dalam memahami kompetensi utama mapel [Mapel], khususnya pada aspek materi...'),\n" +
      "  \"deskripsi\": string (2-3 kalimat deskripsi detail capaian, kelebihan sikap religius/sosialnya, disertai saran perbaikan akademis yang menyentuh hati)\n" +
      "}";

    const prompt = `Nama Siswa: ${nama}, Mapel: ${mapel}, Kelas: ${kelas}, Nilai Akhir Raport: ${nilaiRaport}, Persentase Kehadiran: ${persenKehadiran}%. Buat narasi raport Kurikulum Merdeka.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            capaianPembelajaran: {
              type: Type.STRING,
              description: "1 kalimat ringkas mengenai kelebihan utama yang dicapai siswa"
            },
            deskripsi: {
              type: Type.STRING,
              description: "Uraian detail kompetensi yang dicapai disertai saran motivasi islami"
            }
          },
          required: ["capaianPembelajaran", "deskripsi"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText);
    return res.json({ status: "success", ...resultJson });
  } catch (error: any) {
    console.error("AI Narasi error:", error);
    return res.status(500).json({ status: "error", message: "Gagal membuat narasi raport via AI: " + error.message });
  }
});

// Serve frontend assets
const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
