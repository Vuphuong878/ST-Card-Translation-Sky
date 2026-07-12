"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Translate,
  FileCode,
  FolderUser,
  Cpu,
  Key,
  Quotes,
  TerminalWindow,
  DownloadSimple,
  Trash,
  CheckCircle,
  WarningCircle,
  Spinner,
  ArrowRight,
  Plus,
  X,
  FileArrowUp,
  FolderOpen,
  BookOpen,
  Copy,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Funnel,
  FileText,
} from "@phosphor-icons/react";

interface QueueItem {
  id: string;
  name: string;
  relativePath?: string; // If loaded from local folder
  content: string;
  type: string; // txt, json, md, html
  status: "pending" | "translating" | "completed" | "failed";
  translated?: string;
  savedPath?: string;
  error?: string;
}

const PRESET_PROMPTS = [
  {
    name: "Dịch Tu Tiên (Xianxia)",
    prompt:
      "Dịch theo văn phong truyện tiên hiệp, kiếm hiệp Trung Quốc. Hóa dịch chuẩn xác các thuật ngữ như 'khí hải', 'trúc cơ', 'độ kiếp', 'đan điền', 'pháp bảo', 'linh thạch'. Ngôn từ trang trọng, mượt mà, đậm chất kiếm hiệp cổ trang.",
  },
  {
    name: "Dịch Hội Thoại (Natural)",
    prompt:
      "Dịch hội thoại nhân vật tự nhiên, sinh động, phù hợp với văn phong nói. Giữ nguyên ngữ điệu thân mật hoặc trang trọng tùy thuộc vào đại từ nhân xưng phù hợp ngữ cảnh.",
  },
  {
    name: "Dịch Tối Giản (Minimalist)",
    prompt:
      "Dịch ngắn gọn, súc tích, lược bỏ các từ hoa mỹ không cần thiết. Tập trung diễn đạt đúng nghĩa cốt lõi của câu để tối ưu không gian hiển thị UI.",
  },
];

interface ApiPoolItem {
  provider: string;
  model: string;
  url: string;
  key: string;
}

const isQuotaError = (status: number, errorMsg: string) => {
  if (status === 429) return true;
  const msg = (errorMsg || "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("limit") ||
    msg.includes("exhausted") ||
    msg.includes("billing") ||
    msg.includes("credits") ||
    msg.includes("rate") ||
    msg.includes("overloaded")
  );
};



export default function TemplateTranslatorPage() {
  // File Queue States
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [workspaceSession, setWorkspaceSession] = useState<string>("");

  // Scan Local Directory States
  const [scannedFiles, setScannedFiles] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState<boolean>(false);

  // Settings States
  const [apiKey, setApiKey] = useState<string>("");
  const [provider, setProvider] = useState<string>("google");
  const [apiUrl, setApiUrl] = useState<string>("https://generativelanguage.googleapis.com/v1beta");
  const [model, setModel] = useState<string>("gemini-1.5-pro");
  const [availableModels, setAvailableModels] = useState<string[]>([
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash-exp",
  ]);
  const [isScanningModels, setIsScanningModels] = useState<boolean>(false);
  const [modelScanError, setModelScanError] = useState<string>("");
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  const [sourceLang, setSourceLang] = useState<string>("Tiếng Trung (Chinese)");
  const [targetLang, setTargetLang] = useState<string>("Tiếng Việt (Vietnamese)");
  const [customPrompt, setCustomPrompt] = useState<string>(PRESET_PROMPTS[0].prompt);

  // Variables preservation states
  const [variables, setVariables] = useState<string[]>([]);
  const [newVarInput, setNewVarInput] = useState<string>("");

  // System States
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);

  // Key Pool States
  const [apiPool, setApiPool] = useState<ApiPoolItem[]>([
    {
      provider: "google",
      model: "gemini-1.5-pro",
      url: "https://generativelanguage.googleapis.com/v1beta",
      key: "",
    },
  ]);
  const [activeApiIndex, setActiveApiIndex] = useState<number>(0);


  // Load Settings from storage on mount
  useEffect(() => {
    try {
      const savedKey = sessionStorage.getItem("translator-api-key") || "";
      const savedProvider = localStorage.getItem("translator-provider") || "google";
      const savedUrl =
        localStorage.getItem("translator-api-url") ||
        "https://generativelanguage.googleapis.com/v1beta";
      const savedModel = localStorage.getItem("translator-model") || "gemini-1.5-pro";
      const savedModelsJson = localStorage.getItem("translator-available-models");

      if (savedKey) setApiKey(savedKey);
      setProvider(savedProvider);
      setApiUrl(savedUrl);
      setModel(savedModel);
      if (savedModelsJson) {
        setAvailableModels(JSON.parse(savedModelsJson));
      }

      // Load API Pool from localStorage
      const savedPool = localStorage.getItem("translator-api-pool");
      const savedActiveIndex = localStorage.getItem("translator-active-api-index");
      if (savedPool) {
        const parsed = JSON.parse(savedPool);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setApiPool(parsed);
          if (savedActiveIndex) {
            const idx = parseInt(savedActiveIndex);
            if (idx >= 0 && idx < parsed.length) {
              setActiveApiIndex(idx);
              setProvider(parsed[idx].provider);
              setModel(parsed[idx].model);
              setApiUrl(parsed[idx].url);
              setApiKey(parsed[idx].key);
            }
          }
        }
      } else {
        // Initialize pool with whatever was in standalone storage
        setApiPool([
          {
            provider: savedProvider,
            model: savedModel,
            url: savedUrl,
            key: savedKey,
          }
        ]);
        setActiveApiIndex(0);
      }
    } catch (e) {}

    // Generate workspace session name (e.g. translations_20260711_0237)
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    setWorkspaceSession(`translations_${yyyy}${mm}${dd}_${hh}${min}`);
  }, []);

  // Save API Pool to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem("translator-api-pool", JSON.stringify(apiPool));
      localStorage.setItem("translator-active-api-index", String(activeApiIndex));
    } catch (e) {}
  }, [apiPool, activeApiIndex]);

  // Save Settings when changed
  const handleSaveApiKey = (val: string) => {
    setApiKey(val);
    try {
      sessionStorage.setItem("translator-api-key", val);
    } catch (e) {}
    setApiPool((prev) => {
      const next = [...prev];
      if (next[activeApiIndex]) {
        next[activeApiIndex] = { ...next[activeApiIndex], key: val };
      }
      return next;
    });
  };

  const updateDefaultModelsAndUrl = (prov: string) => {
    let defaultUrl = "https://generativelanguage.googleapis.com/v1beta";
    let defaultModels = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash-exp"];
    let defaultModel = "gemini-1.5-pro";

    if (prov === "openai") {
      defaultUrl = "https://api.openai.com/v1";
      defaultModels = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
      defaultModel = "gpt-4o";
    } else if (prov === "anthropic") {
      defaultUrl = "https://api.anthropic.com/v1";
      defaultModels = [
        "claude-3-5-sonnet-20241022",
        "claude-3-5-haiku-20241022",
        "claude-3-opus-20240229",
      ];
      defaultModel = "claude-3-5-sonnet-20241022";
    } else if (prov === "custom") {
      defaultUrl = "http://localhost:8080/v1";
      defaultModels = [];
      defaultModel = "";
    }

    setApiUrl(defaultUrl);
    setAvailableModels(defaultModels);
    setModel(defaultModel);

    try {
      localStorage.setItem("translator-api-url", defaultUrl);
      localStorage.setItem("translator-available-models", JSON.stringify(defaultModels));
      localStorage.setItem("translator-model", defaultModel);
    } catch (e) {}
  };

  const handleProviderChange = (val: string) => {
    setProvider(val);
    try {
      localStorage.setItem("translator-provider", val);
    } catch (e) {}
    updateDefaultModelsAndUrl(val);
    setApiPool((prev) => {
      const next = [...prev];
      if (next[activeApiIndex]) {
        let defaultUrl = "https://generativelanguage.googleapis.com/v1beta";
        let defaultModel = "gemini-1.5-pro";
        if (val === "openai") {
          defaultUrl = "https://api.openai.com/v1";
          defaultModel = "gpt-4o";
        } else if (val === "anthropic") {
          defaultUrl = "https://api.anthropic.com/v1";
          defaultModel = "claude-3-5-sonnet-20241022";
        } else if (val === "custom") {
          defaultUrl = "http://localhost:8080/v1";
          defaultModel = "";
        }
        next[activeApiIndex] = {
          ...next[activeApiIndex],
          provider: val,
          url: defaultUrl,
          model: defaultModel,
        };
      }
      return next;
    });
  };

  const handleApiUrlChange = (val: string) => {
    setApiUrl(val);
    try {
      localStorage.setItem("translator-api-url", val);
    } catch (e) {}
    setApiPool((prev) => {
      const next = [...prev];
      if (next[activeApiIndex]) {
        next[activeApiIndex] = { ...next[activeApiIndex], url: val };
      }
      return next;
    });
  };

  const handleModelChange = (val: string) => {
    setModel(val);
    try {
      localStorage.setItem("translator-model", val);
    } catch (e) {}
    setApiPool((prev) => {
      const next = [...prev];
      if (next[activeApiIndex]) {
        next[activeApiIndex] = { ...next[activeApiIndex], model: val };
      }
      return next;
    });
  };

  const handleAddPoolItem = () => {
    const newItem: ApiPoolItem = {
      provider: "google",
      model: "gemini-1.5-pro",
      url: "https://generativelanguage.googleapis.com/v1beta",
      key: "",
    };
    setApiPool((prev) => {
      const updated = [...prev, newItem];
      setActiveApiIndex(updated.length - 1);
      setProvider("google");
      setModel("gemini-1.5-pro");
      setApiUrl("https://generativelanguage.googleapis.com/v1beta");
      setApiKey("");
      return updated;
    });
  };

  const selectPoolItem = (idx: number) => {
    if (idx < 0 || idx >= apiPool.length) return;
    setActiveApiIndex(idx);
    const item = apiPool[idx];
    if (item) {
      setProvider(item.provider);
      setModel(item.model);
      setApiUrl(item.url);
      setApiKey(item.key);
    }
  };

  const handleDeletePoolItem = (idx: number) => {
    if (apiPool.length <= 1) return;
    setApiPool((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      let nextActive = activeApiIndex;
      if (activeApiIndex === idx) {
        nextActive = 0;
      } else if (activeApiIndex > idx) {
        nextActive = activeApiIndex - 1;
      }
      setActiveApiIndex(nextActive);
      const item = next[nextActive];
      if (item) {
        setProvider(item.provider);
        setModel(item.model);
        setApiUrl(item.url);
        setApiKey(item.key);
      }
      return next;
    });
  };

  // Scan models using API key and URL
  const handleScanModels = async () => {
    if (!apiKey) return;
    setIsScanningModels(true);
    setModelScanError("");
    try {
      // Normalize relative proxy URL paths to target port 5173
      let normalizedUrl = apiUrl;
      if (apiUrl.startsWith("/")) {
        normalizedUrl = `http://localhost:5173${apiUrl}`;
      }

      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, apiUrl: normalizedUrl }),
      });
      const data = await res.json();
      
      if (data.error) {
        setModelScanError(data.error);
      }

      if (data.models) {
        setAvailableModels(data.models);
        try {
          localStorage.setItem("translator-available-models", JSON.stringify(data.models));
        } catch (e) {}
        if (data.models.length > 0 && !data.error) {
          setModel(data.models[0]);
          try {
            localStorage.setItem("translator-model", data.models[0]);
          } catch (e) {}
        }
      }
    } catch (e: any) {
      console.error("Failed to scan models", e);
      setModelScanError(e.message || "Lỗi kết nối mạng.");
    } finally {
      setIsScanningModels(false);
    }
  };

  // Drag & Drop File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);

    filesArray.forEach((file) => {
      const reader = new FileReader();
      const ext = file.name.split(".").pop()?.toLowerCase() || "txt";

      reader.onload = (event) => {
        const text = event.target?.result as string;
        const newItem: QueueItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          content: text,
          type: ext,
          status: "pending",
        };
        setQueue((prev) => {
          const updated = [...prev, newItem];
          if (updated.length === 1) setActiveIndex(0);
          return updated;
        });
      };
      reader.readAsText(file);
    });
  };

  // Scan Local Workspace
  const handleScanWorkspace = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      if (data.files) {
        setScannedFiles(data.files);
        setShowWorkspaceModal(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportLocalFile = async (relPath: string) => {
    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relativePath: relPath }),
      });
      const data = await res.json();
      if (data.content) {
        const ext = relPath.split(".").pop()?.toLowerCase() || "txt";
        const filename = relPath.split("/").pop() || relPath;

        // Check if file is already in queue
        if (queue.some((q) => q.relativePath === relPath)) return;

        const newItem: QueueItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: filename,
          relativePath: relPath,
          content: data.content,
          type: ext,
          status: "pending",
        };

        setQueue((prev) => {
          const updated = [...prev, newItem];
          if (updated.length === 1) setActiveIndex(0);
          return updated;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Automatic Variables Scanning using regex
  const handleScanVariables = () => {
    if (activeIndex === -1 || !queue[activeIndex]) return;
    const content = queue[activeIndex].content;

    const foundVars = new Set<string>();

    // Pattern 1: JS template string ${variable}
    const jsPattern = /\$\{[a-zA-Z0-9_.-]+\}/g;
    let match;
    while ((match = jsPattern.exec(content)) !== null) {
      foundVars.add(match[0]);
    }

    // Pattern 2: Single brace {variable} (excluding normal JSON tags)
    // We only collect it if it doesn't look like general block braces
    const singleBracePattern = /\{[a-zA-Z0-9_.-]+\}/g;
    while ((match = singleBracePattern.exec(content)) !== null) {
      foundVars.add(match[0]);
    }

    // Pattern 3: Double brace {{variable}}
    const doubleBracePattern = /\{\{[a-zA-Z0-9_.-]+\}\}/g;
    while ((match = doubleBracePattern.exec(content)) !== null) {
      foundVars.add(match[0]);
    }

    // Pattern 4: XML tag tags <ui_sys>, </ui_sys> etc.
    const xmlPattern = /<[a-zA-Z0-9_.-]+[^>]*>|<\/[a-zA-Z0-9_.-]+>/g;
    while ((match = xmlPattern.exec(content)) !== null) {
      foundVars.add(match[0]);
    }

    // Update list with found items
    const combined = Array.from(new Set([...variables, ...Array.from(foundVars)]));
    setVariables(combined);
  };

  // Add variable manually
  const handleAddVariable = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newVarInput.trim();
    if (val && !variables.includes(val)) {
      setVariables([...variables, val]);
      setNewVarInput("");
    }
  };

  const handleRemoveVariable = (val: string) => {
    setVariables(variables.filter((v) => v !== val));
  };

  // Fetch translation with automatic Key Pool rotation
  const fetchWithRotation = async (payload: any): Promise<{ ok: boolean; status: number; data: any }> => {
    let attemptIndex = activeApiIndex;
    let attemptsCount = 0;
    const maxAttempts = apiPool.length || 1;

    while (attemptsCount < maxAttempts) {
      const currentConfig = apiPool[attemptIndex];
      const activePayload = {
        ...payload,
        apiKey: currentConfig?.key || payload.apiKey,
        apiUrl: currentConfig?.url || payload.apiUrl,
        provider: currentConfig?.provider || payload.provider,
        model: currentConfig?.model || payload.model,
      };

      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activePayload),
        });

        const data = await res.json();
        const isQuota = res.status === 429 || (data.error && isQuotaError(res.status, data.error));

        if (isQuota && apiPool.length > 1) {
          const nextIndex = (attemptIndex + 1) % apiPool.length;
          console.warn(`Cấu hình API #${attemptIndex + 1} cạn hạn mức. Đang chuyển sang cấu hình #${nextIndex + 1}...`);
          
          setActiveApiIndex(nextIndex);
          const nextConfig = apiPool[nextIndex];
          if (nextConfig) {
            setProvider(nextConfig.provider);
            setModel(nextConfig.model);
            setApiUrl(nextConfig.url);
            setApiKey(nextConfig.key);
          }

          attemptIndex = nextIndex;
          attemptsCount++;
          continue;
        }

        return { ok: res.ok, status: res.status, data };
      } catch (err: any) {
        if (attemptsCount < maxAttempts - 1 && apiPool.length > 1) {
          const nextIndex = (attemptIndex + 1) % apiPool.length;
          console.warn(`Cấu hình API #${attemptIndex + 1} gặp lỗi mạng. Đang chuyển sang cấu hình #${nextIndex + 1}...`);
          
          setActiveApiIndex(nextIndex);
          const nextConfig = apiPool[nextIndex];
          if (nextConfig) {
            setProvider(nextConfig.provider);
            setModel(nextConfig.model);
            setApiUrl(nextConfig.url);
            setApiKey(nextConfig.key);
          }

          attemptIndex = nextIndex;
          attemptsCount++;
          continue;
        }
        throw err;
      }
    }
    throw new Error("Tất cả các API Key/URL trong Pool đều đã cạn hạn mức hoặc gặp sự cố.");
  };

  // Translate a single item in the queue
  const translateItem = async (index: number): Promise<boolean> => {
    if (!queue[index]) return false;
    const item = queue[index];

    // Mark as translating
    setQueue((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status: "translating", error: undefined };
      return next;
    });

    try {
      const { ok, data } = await fetchWithRotation({
        fileName: item.name,
        content: item.content,
        fileType: item.type,
        sourceLang,
        targetLang,
        variables,
        customPrompt,
        apiKey,
        provider,
        model,
        apiUrl,
        saveToWorkspace: true,
        workspaceSessionName: workspaceSession,
      });

      if (!ok || data.error) {
        setQueue((prev) => {
          const next = [...prev];
          next[index] = {
            ...next[index],
            status: "failed",
            error: data.error || "Translation API Call Failed",
          };
          return next;
        });
        return false;
      }

      // Completed translation
      setQueue((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: "completed",
          translated: data.translated,
          savedPath: data.savedPath,
        };
        return next;
      });
      return true;
    } catch (e: any) {
      setQueue((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: "failed",
          error: e.message || String(e),
        };
        return next;
      });
      return false;
    }
  };

  // Translate all items sequentially
  const handleTranslateAll = async () => {
    if (queue.length === 0 || !apiKey) return;
    setIsProcessingBulk(true);

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== "completed") {
        await translateItem(i);
      }
    }

    setIsProcessingBulk(false);
  };

  const handleRemoveFromQueue = (id: string, idx: number) => {
    setQueue(queue.filter((q) => q.id !== id));
    if (activeIndex === idx) {
      setActiveIndex(queue.length > 1 ? 0 : -1);
    } else if (activeIndex > idx) {
      setActiveIndex((prev) => prev - 1);
    }
  };

  const handleClearQueue = () => {
    setQueue([]);
    setActiveIndex(-1);
  };

  const activeItem = activeIndex !== -1 ? queue[activeIndex] : null;



  const filteredModels = model
    ? availableModels.filter((m) => m.toLowerCase().includes(model.toLowerCase()))
    : availableModels;

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 flex flex-col p-6 md:p-8 lg:p-12 select-none">
      {/* Header */}
      <header className="max-w-7xl w-full mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-zinc-400 text-sm font-mono tracking-wider uppercase mb-2">
              <Translate className="w-4 h-4 text-indigo-400" />
              <span>Translation Panel</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white leading-tight">
              Template Translator
            </h1>
          </div>
          <p className="text-sm text-zinc-400 max-w-sm font-light leading-relaxed">
            Dịch văn bản, tài liệu, file cấu hình (JSON, Markdown, HTML, Text) và giữ nguyên biến số.
          </p>
        </div>
      </header>

      {/* Main split dashboard layout for File Translation */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch flex-1 mt-8">
          {/* Left Side: Controls & Setup */}
          <section className="lg:col-span-5 flex flex-col gap-6">
            {/* Card 1: Load Files */}
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md">
              <h2 className="text-md font-light text-zinc-200 mb-4 tracking-wide flex items-center gap-2">
                Tải tệp tin cần dịch
              </h2>

              <div className="flex flex-col gap-4">
                {/* Drag-drop area */}
                <div className="relative border border-dashed border-zinc-800 hover:border-indigo-500/50 rounded-lg p-5 flex flex-col items-center justify-center gap-2 bg-zinc-950/40 transition-colors group">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileArrowUp className="w-8 h-8 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-xs text-zinc-300 font-light">Kéo thả tệp tin hoặc click để tải lên</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Chấp nhận: JSON, MD, HTML, TXT</span>
                </div>

                {/* Local workspace path scanner */}
                <button
                  onClick={handleScanWorkspace}
                  disabled={isScanning}
                  className="py-2.5 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-semibold tracking-wider rounded-lg transition-all tactile-btn flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <Spinner className="w-4 h-4 animate-spin text-zinc-400" />
                      <span>ĐANG QUÉT MÔI TRƯỜNG LOCAL...</span>
                    </>
                  ) : (
                    <>
                      <FolderOpen className="w-4 h-4" />
                      <span>QUÉT TẬP TIN DỰ ÁN LOCAL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2: Model & Keys Settings */}
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md">
              <h2 className="text-md font-light text-zinc-200 mb-4 tracking-wide flex items-center gap-2">
                Cấu hình Trí tuệ Nhân tạo (AI)
              </h2>

              <div className="flex flex-col gap-4">
                {/* Provider Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">Nhà cung cấp</label>
                  <select
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/80"
                  >
                    <option value="google">Google Gemini (Thông qua proxy)</option>
                    <option value="openai">OpenAI (Thông qua proxy)</option>
                    <option value="anthropic">Anthropic Claude (Thông qua proxy)</option>
                    <option value="custom">Custom (Tương thích OpenAI)</option>
                  </select>
                </div>

                {/* API URL (Base URL) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">Địa chỉ API (Base URL)</label>
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => handleApiUrlChange(e.target.value)}
                    placeholder="https://..."
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/80"
                  />
                </div>

                {/* Model Choice */}
                <div className="flex flex-col gap-1.5 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">Model dịch thuật</label>
                    <button
                      onClick={handleScanModels}
                      disabled={!apiKey || isScanningModels}
                      className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {isScanningModels ? (
                        <>
                          <Spinner className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          <span>Đang quét...</span>
                        </>
                      ) : (
                        <span>Quét Models</span>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={model}
                      onFocus={() => setShowModelDropdown(true)}
                      onBlur={() => {
                        // Timeout to let clicks register
                        setTimeout(() => setShowModelDropdown(false), 200);
                      }}
                      onChange={(e) => handleModelChange(e.target.value)}
                      placeholder="Chọn hoặc nhập tên model..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/80"
                    />
                    {showModelDropdown && filteredModels.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl z-50 py-1">
                        {filteredModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onMouseDown={() => {
                              handleModelChange(m);
                              setShowModelDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer block truncate"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {modelScanError && (
                    <span className="text-[10px] text-rose-400 font-mono mt-1 break-all">
                      Lỗi quét: {modelScanError}
                    </span>
                  )}
                </div>

                {/* API Key */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">Khóa API (API Key)</label>
                  <div className="relative flex items-center">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => handleSaveApiKey(e.target.value)}
                      placeholder="Nhập khóa API Key..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/80"
                    />
                    <Key className="absolute left-3 w-4 h-4 text-zinc-500" />
                  </div>
                </div>




                {/* API Key Pool Manager */}
                <div className="border-t border-zinc-800/50 pt-4 mt-2 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">
                      API Key Pool (Hạn mức &amp; Đảo Key)
                    </label>
                    <button
                      onClick={handleAddPoolItem}
                      className="text-[10px] font-semibold text-zinc-300 hover:text-zinc-100 flex items-center gap-1 cursor-pointer bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm Key</span>
                    </button>
                  </div>

                  {/* List of keys in pool */}
                  <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {apiPool.map((item, idx) => {
                      const isActive = activeApiIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => selectPoolItem(idx)}
                          className={`flex flex-col gap-1 p-2 border rounded-lg cursor-pointer transition-all ${
                            isActive
                              ? "bg-zinc-100 border-zinc-200 text-zinc-950"
                              : "bg-zinc-950/40 border-zinc-905 border-zinc-900 text-zinc-400 hover:border-zinc-800 hover:text-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-semibold uppercase">
                              #{idx + 1} - {item.provider} ({item.model || "no model"})
                            </span>
                            {apiPool.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePoolItem(idx);
                                }}
                                className={`p-0.5 rounded transition-colors ${
                                  isActive
                                    ? "hover:bg-zinc-300 text-zinc-850 hover:text-rose-600"
                                    : "hover:bg-zinc-900 text-zinc-500 hover:text-rose-400"
                                }`}
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="text-[9px] font-mono truncate opacity-80">
                            URL: {item.url || "(Mặc định)"}
                          </div>
                          <div className="text-[9px] font-mono truncate opacity-80">
                            Key: {item.key ? `${item.key.slice(0, 8)}...${item.key.slice(-4)}` : "(Chưa cấu hình)"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-zinc-500 italic leading-relaxed">
                    *Khi dịch AI gặp lỗi cạn hạn mức (Quota limit), hệ thống sẽ tự động xoay tua sang Key tiếp theo trong Pool.
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Prompt & Variables Setup */}
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md flex-1 flex flex-col min-h-[300px]">
              <h2 className="text-md font-light text-zinc-200 mb-4 tracking-wide flex items-center gap-2">
                Quy tắc Dịch &amp; Biến số
              </h2>

              {/* Presets */}
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCustomPrompt(preset.prompt)}
                    className={`px-3 py-1.5 text-[10px] font-medium tracking-wide rounded-md transition-all cursor-pointer ${
                      customPrompt === preset.prompt
                        ? "bg-indigo-600 border border-indigo-500 text-white"
                        : "bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-400"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* Custom Prompt Text Box */}
              <div className="flex flex-col gap-1.5 mb-4">
                <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">
                  Chỉ dẫn Prompt tùy chỉnh
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Nhập prompt điều hướng văn phong dịch thuật tại đây..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/80 resize-none font-light leading-relaxed"
                />
              </div>

              {/* Scanned & Protected variables */}
              <div className="border-t border-zinc-800/50 pt-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3.5">
                  <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">
                    Biến số khóa bảo vệ ({variables.length})
                  </label>
                  <button
                    onClick={handleScanVariables}
                    disabled={activeIndex === -1}
                    className="px-2.5 py-1 text-[10px] font-semibold bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 rounded text-zinc-300 hover:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    QUÉT BIẾN TỆP TIN
                  </button>
                </div>

                {/* Tag Editor List */}
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 min-h-[80px] max-h-[140px] overflow-y-auto flex flex-wrap gap-2 items-start mb-3">
                  {variables.length === 0 ? (
                    <span className="text-[11px] text-zinc-600 italic">
                      Chưa quét biến. Bấm "Quét biến tệp tin" hoặc tự nhập thủ công bên dưới.
                    </span>
                  ) : (
                    variables.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 font-mono text-[10px]"
                      >
                        {v}
                        <button
                          onClick={() => handleRemoveVariable(v)}
                          className="text-indigo-400 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Add tag form */}
                <form onSubmit={handleAddVariable} className="flex gap-2">
                  <input
                    type="text"
                    value={newVarInput}
                    onChange={(e) => setNewVarInput(e.target.value)}
                    placeholder="Thêm biến thủ công (ví dụ: ${my_var} hoặc {location})..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-indigo-500/80"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </section>

          {/* Right Side: Translation queue & Editor side-by-side */}
          <section className="lg:col-span-7 flex flex-col gap-6 items-stretch">
            {/* Dashboard Stats / Queue Area */}
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-md font-light text-zinc-200 tracking-wide flex items-center gap-2">
                  Danh sách Tệp chờ dịch ({queue.length})
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleClearQueue}
                    disabled={queue.length === 0}
                    className="px-3 py-1.5 text-[10px] font-semibold bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 rounded text-rose-400 hover:text-rose-300 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    XÓA HẾT HÀNG ĐỢI
                  </button>
                  <button
                    onClick={handleTranslateAll}
                    disabled={queue.length === 0 || !apiKey || isProcessingBulk}
                    className="px-3.5 py-1.5 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 border border-indigo-500/20 disabled:border-zinc-800 disabled:opacity-50 rounded text-white transition-all cursor-pointer disabled:cursor-not-allowed shadow-[0_1px_10px_rgba(99,102,241,0.15)] flex items-center gap-1.5"
                  >
                    {isProcessingBulk ? (
                      <>
                        <Spinner className="w-3 h-3 animate-spin text-white" />
                        <span>ĐANG BATCH DỊCH...</span>
                      </>
                    ) : (
                      <>
                        <Translate className="w-3.5 h-3.5" />
                        <span>DỊCH TẤT CẢ TỆP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Save target session info */}
              {queue.length > 0 && (
                <div className="bg-zinc-950/40 border border-zinc-800/30 rounded-lg px-3 py-2 text-[10.5px] font-mono text-zinc-400 mb-3 flex justify-between items-center">
                  <span>Thư mục đích lưu trữ:</span>
                  <span className="text-indigo-400 font-semibold">/workspace/{workspaceSession}/</span>
                </div>
              )}

              {/* Queue Item Scroller */}
              <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto">
                {queue.length === 0 ? (
                  <div className="border border-zinc-800/30 rounded-lg p-6 flex flex-col items-center justify-center text-zinc-500 text-xs italic bg-zinc-950/20">
                    Hàng đợi trống. Kéo thả file hoặc quét thư mục local để thêm tệp tin cần dịch.
                  </div>
                ) : (
                  queue.map((item, idx) => {
                    const isActive = activeIndex === idx;
                    let borderStyle = isActive ? "border-indigo-500/40 bg-indigo-950/15" : "border-zinc-800/40 hover:border-zinc-700/40 bg-zinc-950/20";
                    let statusIcon = <div className="w-2 h-2 rounded-full bg-zinc-600" />;

                    if (item.status === "translating") {
                      statusIcon = <Spinner className="w-3.5 h-3.5 text-indigo-400 animate-spin" />;
                    } else if (item.status === "completed") {
                      statusIcon = <CheckCircle className="w-4 h-4 text-green-400" />;
                    } else if (item.status === "failed") {
                      statusIcon = <WarningCircle className="w-4 h-4 text-rose-400" />;
                    }

                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveIndex(idx)}
                        className={`border rounded-lg p-3 flex items-center justify-between cursor-pointer transition-all ${borderStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <FileCode className="w-5 h-5 text-zinc-400" />
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-zinc-200 font-light font-mono truncate max-w-[260px]">
                              {item.name}
                            </span>
                            {item.relativePath && (
                              <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[260px]">
                                {item.relativePath}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Translation status */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10.5px] font-mono text-zinc-400 capitalize">{item.status}</span>
                            {statusIcon}
                          </div>

                          {/* Direct run button */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await translateItem(idx);
                            }}
                            disabled={item.status === "translating" || !apiKey}
                            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-medium rounded text-zinc-300 disabled:opacity-40 transition-all cursor-pointer"
                          >
                            Dịch lẻ
                          </button>

                          {/* Delete from queue */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFromQueue(item.id, idx);
                            }}
                            className="p-1 hover:bg-rose-950/20 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Card 2: Side-by-Side Comparison Editor */}
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md flex-1 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-4">
                <h2 className="text-md font-light text-zinc-200 tracking-wide flex items-center gap-2">
                  So sánh Song song (Original vs Translated)
                </h2>
                {activeItem && activeItem.status === "completed" && activeItem.savedPath && (
                  <div className="text-[10.5px] font-mono text-zinc-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    <span>Lưu tại: <code className="text-green-400 font-semibold">{activeItem.savedPath}</code></span>
                  </div>
                )}
              </div>

              {activeItem ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left pane: Original content */}
                  <div className="flex flex-col gap-1.5 h-full">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Văn bản gốc</span>
                      <span className="text-[10px] bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400 font-mono uppercase">
                        {activeItem.type}
                      </span>
                    </div>
                    <textarea
                      value={activeItem.content}
                      readOnly
                      className="flex-1 w-full bg-zinc-950 border border-zinc-800/40 rounded-lg p-3 text-xs text-zinc-300 font-mono focus:outline-none resize-none min-h-[280px]"
                    />
                  </div>

                  {/* Right pane: Translated content */}
                  <div className="flex flex-col gap-1.5 h-full">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Kết quả dịch</span>
                      {activeItem.status === "translating" && (
                        <span className="text-[10px] text-indigo-400 font-mono animate-pulse">Đang dịch...</span>
                      )}
                    </div>
                    <textarea
                      value={activeItem.translated || ""}
                      onChange={(e) => {
                        // Allow manual corrections to translated text
                        setQueue((prev) => {
                          const next = [...prev];
                          next[activeIndex] = { ...next[activeIndex], translated: e.target.value };
                          return next;
                        });
                      }}
                      placeholder={
                        activeItem.status === "translating"
                          ? "Đang chạy tiến trình dịch bằng AI..."
                          : activeItem.status === "failed"
                          ? `LỖI: ${activeItem.error}`
                          : "Kết quả dịch sẽ xuất hiện ở đây sau khi hoàn tất..."
                      }
                      className="flex-1 w-full bg-zinc-950 border border-zinc-800/40 rounded-lg p-3 text-xs text-zinc-100 font-mono focus:outline-none focus:border-indigo-500/80 resize-none min-h-[280px]"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs italic">
                  Chưa chọn tệp tin. Vui lòng tải file và click chọn một file trong hàng đợi phía trên để hiển thị so sánh.
                </div>
              )}
            </div>
          </section>
        </main>



      {/* Local Workspace Files Selector Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/30">
              <div className="flex items-center gap-2">
                <FolderUser className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-100">Chọn tệp tin từ Local Workspace</h3>
              </div>
              <button
                onClick={() => setShowWorkspaceModal(false)}
                className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal List Body */}
            <div className="p-4 overflow-y-auto max-h-[60vh] flex flex-col gap-1.5">
              {scannedFiles.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs italic">
                  Không tìm thấy tệp tin văn bản tương thích (.txt, .json, .md, .html) trong thư mục dự án.
                </div>
              ) : (
                scannedFiles.map((file) => {
                  const isInQueue = queue.some((q) => q.relativePath === file);
                  return (
                    <div
                      key={file}
                      onClick={() => {
                        if (!isInQueue) {
                          handleImportLocalFile(file);
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded border border-zinc-800/40 font-mono text-[11px] transition-colors ${
                        isInQueue
                          ? "bg-indigo-950/20 border-indigo-900/30 text-indigo-400 cursor-default"
                          : "bg-zinc-950/20 hover:bg-zinc-850 hover:border-zinc-700/60 text-zinc-300 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate max-w-[360px]">
                        <FileCode className="w-4.5 h-4.5 text-zinc-500 flex-shrink-0" />
                        <span className="truncate">{file}</span>
                      </div>
                      {isInQueue ? (
                        <span className="text-[10px] text-indigo-400 font-semibold px-2 py-0.5 bg-indigo-950/40 rounded">
                          Đã thêm
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 hover:text-zinc-300">Nhấp để thêm</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/20 flex justify-end">
              <button
                onClick={() => setShowWorkspaceModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded text-white transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
