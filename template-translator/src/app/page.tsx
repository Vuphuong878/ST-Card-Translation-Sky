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

interface MortalTranslationItem {
  key: string;
  value: string;
  isTranslating?: boolean;
  error?: string;
}

interface MortalRowProps {
  item: MortalTranslationItem;
  originalIndex: number;
  translateItem: (idx: number) => Promise<boolean>;
  onValueChange: (idx: number, newVal: string) => void;
}

const MortalRow = React.memo(({ item, originalIndex, translateItem, onValueChange }: MortalRowProps) => {
  const [localVal, setLocalVal] = useState(item.value);

  // Sync state if it changes from outside (e.g., after AI translation)
  useEffect(() => {
    setLocalVal(item.value);
  }, [item.value]);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.key);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 border-b border-zinc-900/60 items-start hover:bg-zinc-900/10 px-2 transition-colors">
      {/* Left side: Chinese text */}
      <div className="flex flex-col gap-1.5 pr-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Tiếng Trung Gốc (#{originalIndex + 1})
          </span>
          <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              title="Sao chép từ gốc"
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => translateItem(originalIndex)}
              disabled={item.isTranslating}
              title="Dịch AI dòng này"
              className="p-1 hover:bg-zinc-800 rounded text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-all cursor-pointer"
            >
              {item.isTranslating ? (
                <Spinner className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Translate className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
        <div className="text-sm font-mono text-zinc-300 break-words select-text bg-zinc-950/30 p-2 rounded border border-zinc-900/40">
          {item.key}
        </div>
      </div>

      {/* Right side: Vietnamese input */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Bản dịch tiếng Việt
          </span>
          {item.error && (
            <span className="text-[10px] text-rose-400 font-mono max-w-[200px] truncate" title={item.error}>
              Lỗi: {item.error}
            </span>
          )}
        </div>
        <textarea
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onBlur={() => {
            if (localVal !== item.value) {
              onValueChange(originalIndex, localVal);
            }
          }}
          placeholder="Chưa dịch..."
          rows={2}
          className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 font-sans focus:outline-none focus:border-zinc-500 resize-none leading-relaxed transition-colors"
        />
      </div>
    </div>
  );
});

MortalRow.displayName = "MortalRow";

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

  // Tab State
  const [activeTab, setActiveTab] = useState<"file" | "mortal">("file");

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

  // Batch translation & grouping states
  const [batchSize, setBatchSize] = useState<number>(50);
  const [concurrency, setConcurrency] = useState<number>(3);
  const [isTranslatingAll, setIsTranslatingAll] = useState<boolean>(false);
  const [translateAllProgress, setTranslateAllProgress] = useState<{
    current: number;
    total: number;
    statusText: string;
  }>({ current: 0, total: 0, statusText: "" });
  const abortTranslateAllRef = useRef<boolean>(false);

  // Mortal UI translation states

  const [mortalFile, setMortalFile] = useState<{ name: string; size: number } | null>(null);
  const [mortalMetadata, setMortalMetadata] = useState<{
    schema?: string;
    format?: string;
    schemaVersion?: number;
    language?: string;
    name?: string;
    baseAppVersion?: string;
    exportedAt?: string;
  }>({});
  const [mortalItems, setMortalItems] = useState<MortalTranslationItem[]>([]);
  const [mortalSearch, setMortalSearch] = useState<string>("");
  const [mortalFilter, setMortalFilter] = useState<"all" | "untranslated" | "has_vars">("all");
  const [mortalPage, setMortalPage] = useState<number>(1);
  const [isProcessingMortalBulk, setIsProcessingMortalBulk] = useState<boolean>(false);

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

      const savedBatchSize = localStorage.getItem("translator-batch-size");
      if (savedBatchSize) {
        setBatchSize(parseInt(savedBatchSize) || 50);
      }

      const savedConcurrency = localStorage.getItem("translator-concurrency");
      if (savedConcurrency) {
        setConcurrency(parseInt(savedConcurrency) || 3);
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

  // Save API Pool, Batch Size and Concurrency to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem("translator-api-pool", JSON.stringify(apiPool));
      localStorage.setItem("translator-active-api-index", String(activeApiIndex));
      localStorage.setItem("translator-batch-size", String(batchSize));
      localStorage.setItem("translator-concurrency", String(concurrency));
    } catch (e) {}
  }, [apiPool, activeApiIndex, batchSize, concurrency]);

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

  const handleScanMortalVariables = () => {
    if (mortalItems.length === 0) return;
    const foundSet = new Set<string>();
    mortalItems.forEach(item => {
      const matches = item.key.match(/\{[a-zA-Z0-9_.-]+\}/g);
      if (matches) {
        matches.forEach(m => foundSet.add(m));
      }
      const matchesDouble = item.key.match(/\{\{[a-zA-Z0-9_.-]+\}\}/g);
      if (matchesDouble) {
        matchesDouble.forEach(m => foundSet.add(m));
      }
      const matchesDollar = item.key.match(/\$\{[a-zA-Z0-9_.-]+\}/g);
      if (matchesDollar) {
        matchesDollar.forEach(m => foundSet.add(m));
      }
    });
    setVariables(Array.from(new Set([...variables, ...Array.from(foundSet)])));
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

  // Mortal UI translation helpers
  const handleMortalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        // Extract metadata
        const metadata = {
          schema: parsed["$schema"],
          format: parsed["format"],
          schemaVersion: parsed["schemaVersion"],
          language: parsed["language"],
          name: parsed["name"],
          baseAppVersion: parsed["baseAppVersion"],
          exportedAt: parsed["exportedAt"],
        };
        setMortalMetadata(metadata);

        // Extract translations
        const translationsObj = parsed["translations"] || {};
        const itemsList: MortalTranslationItem[] = Object.keys(translationsObj).map((key) => ({
          key: key,
          value: translationsObj[key] || "",
        }));

        setMortalItems(itemsList);
        setMortalFile({ name: file.name, size: file.size });
        setMortalPage(1);
      } catch (err: any) {
        alert("Lỗi phân tích cú pháp tệp JSON: " + (err.message || String(err)));
      }
    };
    reader.readAsText(file);
  };

  const translateMortalItem = async (indexInItems: number): Promise<boolean> => {
    const item = mortalItems[indexInItems];
    if (!item) return false;

    // Update state to loading
    setMortalItems((prev) => {
      const next = [...prev];
      next[indexInItems] = { ...next[indexInItems], isTranslating: true, error: undefined };
      return next;
    });

    try {
      // Find dynamic variables to protect them during translation
      const dynamicVars = Array.from(new Set(item.key.match(/\{[a-zA-Z0-9_.-]+\}/g) || []));

      const { ok, data } = await fetchWithRotation({
        fileName: "dictionary_term.txt",
        content: item.key,
        fileType: "txt",
        sourceLang,
        targetLang,
        variables: dynamicVars,
        customPrompt,
        apiKey,
        provider,
        model,
        apiUrl,
        saveToWorkspace: false,
      });

      if (!ok || data.error) {
        setMortalItems((prev) => {
          const next = [...prev];
          next[indexInItems] = {
            ...next[indexInItems],
            isTranslating: false,
            error: data.error || "Lỗi dịch AI",
          };
          return next;
        });
        return false;
      }

      setMortalItems((prev) => {
        const next = [...prev];
        next[indexInItems] = {
          ...next[indexInItems],
          isTranslating: false,
          value: data.translated || "",
        };
        return next;
      });
      return true;
    } catch (e: any) {
      setMortalItems((prev) => {
        const next = [...prev];
        next[indexInItems] = {
          ...next[indexInItems],
          isTranslating: false,
          error: e.message || String(e),
        };
        return next;
      });
      return false;
    }
  };

  const handleMortalValueChange = (idx: number, newVal: string) => {
    setMortalItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], value: newVal };
      return next;
    });
  };

  // Filtering logic
  const filteredMortalItems = mortalItems.filter((item) => {
    const query = mortalSearch.toLowerCase().trim();
    const matchesSearch =
      query === "" ||
      item.key.toLowerCase().includes(query) ||
      item.value.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (mortalFilter === "untranslated") {
      return item.value === "" || item.value === item.key;
    }
    if (mortalFilter === "has_vars") {
      return /\{[a-zA-Z0-9_.-]+\}/.test(item.key);
    }

    return true;
  });

  const ITEMS_PER_PAGE = 50;
  const totalMortalPages = Math.ceil(filteredMortalItems.length / ITEMS_PER_PAGE) || 1;
  const clampedPage = Math.min(Math.max(1, mortalPage), totalMortalPages);
  
  const startIndex = (clampedPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageMortalItems = filteredMortalItems.slice(startIndex, endIndex);

  const handleTranslateMortalPage = async () => {
    if (pageMortalItems.length === 0 || !apiKey || isProcessingMortalBulk) return;
    setIsProcessingMortalBulk(true);

    const itemsToTranslate: { originalIndex: number }[] = [];
    pageMortalItems.forEach((pItem) => {
      const originalIndex = mortalItems.findIndex((item) => item.key === pItem.key);
      const isUntranslated = pItem.value === "" || pItem.value === pItem.key;
      if (originalIndex !== -1 && isUntranslated) {
        itemsToTranslate.push({ originalIndex });
      }
    });

    const CONCURRENCY = concurrency;
    for (let i = 0; i < itemsToTranslate.length; i += CONCURRENCY) {
      const chunk = itemsToTranslate.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map((item) => translateMortalItem(item.originalIndex)));
    }

    setIsProcessingMortalBulk(false);
  };

  const translateBatchIndividually = async (batchIndices: number[]) => {
    for (const idx of batchIndices) {
      if (abortTranslateAllRef.current) return;
      
      const item = mortalItems[idx];
      if (!item) continue;

      setTranslateAllProgress(prev => ({
        ...prev,
        statusText: `Fallback lẻ (${batchIndices.indexOf(idx) + 1}/${batchIndices.length}): "${item.key.slice(0, 22)}..."`,
      }));

      await translateMortalItem(idx);
      
      setTranslateAllProgress(prev => ({
        ...prev,
        current: Math.min(prev.current + 1, prev.total),
      }));
    }
  };

  const executeBatchWithFallback = async (batchIndices: number[]) => {
    if (abortTranslateAllRef.current) return;

    const keysToTranslate = batchIndices.map(idx => mortalItems[idx].key);
    
    // Scan variables to protect
    const batchVarsSet = new Set<string>();
    keysToTranslate.forEach(key => {
      const matches = key.match(/\{[a-zA-Z0-9_.-]+\}/g);
      if (matches) matches.forEach(v => batchVarsSet.add(v));
    });
    const batchVars = Array.from(batchVarsSet);

    // Set items status to loading
    setMortalItems(prev => {
      const next = [...prev];
      batchIndices.forEach(idx => {
        next[idx] = { ...next[idx], isTranslating: true, error: undefined };
      });
      return next;
    });

    setTranslateAllProgress(prev => ({
      ...prev,
      statusText: `Đang dịch batch ${batchIndices.length} dòng...`,
    }));

    try {
      const { ok, data } = await fetchWithRotation({
        fileName: "batch_dictionary_terms.json",
        content: JSON.stringify(keysToTranslate),
        fileType: "string-array",
        sourceLang,
        targetLang,
        variables: batchVars,
        customPrompt,
        apiKey,
        provider,
        model,
        apiUrl,
        saveToWorkspace: false,
      });

      if (abortTranslateAllRef.current) return;

      let translatedArray: string[] = [];
      if (ok && data.translated) {
        try {
          const cleanText = data.translated.replace(/```json/g, "").replace(/```/g, "").trim();
          translatedArray = JSON.parse(cleanText);
        } catch (e) {}
      }

      if (ok && Array.isArray(translatedArray) && translatedArray.length === batchIndices.length) {
        setMortalItems(prev => {
          const next = [...prev];
          batchIndices.forEach((originalIdx, i) => {
            next[originalIdx] = {
              ...next[originalIdx],
              isTranslating: false,
              value: translatedArray[i] || next[originalIdx].key,
            };
          });
          return next;
        });

        setTranslateAllProgress(prev => ({
          ...prev,
          current: Math.min(prev.current + batchIndices.length, prev.total),
          statusText: `Đã dịch ${prev.current + batchIndices.length}/${prev.total} từ...`,
        }));
      } else {
        console.warn("Lỗi định dạng dịch Batch, tự động chuyển sang dịch lẻ...");
        await translateBatchIndividually(batchIndices);
      }
    } catch (err: any) {
      if (abortTranslateAllRef.current) return;
      console.warn("Lỗi gọi API Batch, tự động chuyển sang dịch lẻ...", err);
      await translateBatchIndividually(batchIndices);
    }
  };

  const handleTranslateAllMortal = async () => {
    if (mortalItems.length === 0 || !apiKey || isTranslatingAll) return;

    // Filter untranslated indices
    const untranslatedIndices = mortalItems.reduce<number[]>((acc, item, idx) => {
      const isUntranslated = !item.value || item.value === item.key;
      if (isUntranslated) acc.push(idx);
      return acc;
    }, []);

    if (untranslatedIndices.length === 0) {
      alert("Tất cả các từ trong từ điển đã được dịch!");
      return;
    }

    setIsTranslatingAll(true);
    setTranslateAllProgress({
      current: 0,
      total: untranslatedIndices.length,
      statusText: "Bắt đầu khởi chạy tiến trình dịch toàn bộ...",
    });
    abortTranslateAllRef.current = false;

    // Group into batches
    const batches: number[][] = [];
    const size = Math.max(1, batchSize);
    for (let i = 0; i < untranslatedIndices.length; i += size) {
      batches.push(untranslatedIndices.slice(i, i + size));
    }

    // Process with Concurrency
    let batchIndex = 0;
    const workers = Array(Math.min(concurrency, batches.length))
      .fill(null)
      .map(async () => {
        while (batchIndex < batches.length && !abortTranslateAllRef.current) {
          const currentBatchIdx = batchIndex++;
          const currentBatch = batches[currentBatchIdx];
          await executeBatchWithFallback(currentBatch);
        }
      });

    await Promise.all(workers);

    setIsTranslatingAll(false);
    if (!abortTranslateAllRef.current) {
      alert("Đã hoàn thành dịch toàn bộ từ điển!");
    }
  };

  const handleClearAllMortalTranslations = () => {
    if (mortalItems.length === 0) return;
    const confirmClear = window.confirm("Bạn có chắc chắn muốn xóa toàn bộ bản dịch tiếng Việt hiện tại không? Thao tác này không thể hoàn tác.");
    if (!confirmClear) return;
    
    setMortalItems((prev) => {
      return prev.map((item) => ({
        ...item,
        value: "",
      }));
    });
  };

  const handleExportMortalJson = () => {
    if (mortalItems.length === 0) return;

    const translationsObj: Record<string, string> = {};
    mortalItems.forEach((item) => {
      translationsObj[item.key] = item.value;
    });

    const fullJson = {
      "$schema": mortalMetadata.schema || "/community-translation-pack.schema.json",
      "format": mortalMetadata.format || "mortal-ui-translation",
      "schemaVersion": mortalMetadata.schemaVersion || 1,
      "language": mortalMetadata.language || "vi",
      "name": mortalMetadata.name || "Mortal UI vi",
      "baseAppVersion": mortalMetadata.baseAppVersion || "v1.1.5",
      "exportedAt": new Date().toISOString(),
      "translations": translationsObj,
    };

    const blob = new Blob([JSON.stringify(fullJson, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = mortalFile ? mortalFile.name.replace(".json", "_translated.json") : "mortal-ui-vi_translated.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 mt-6">
          <button
            onClick={() => setActiveTab("file")}
            className={`px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-all duration-200 border-b-2 -mb-[2px] cursor-pointer flex items-center gap-2 ${
              activeTab === "file"
                ? "border-zinc-200 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Dịch Tệp Biến</span>
          </button>
          <button
            onClick={() => setActiveTab("mortal")}
            className={`px-4 py-2.5 text-xs font-semibold tracking-wider uppercase transition-all duration-200 border-b-2 -mb-[2px] cursor-pointer flex items-center gap-2 ${
              activeTab === "mortal"
                ? "border-zinc-200 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Dịch Mortal UI</span>
          </button>
        </div>
      </header>

      {activeTab === "file" ? (
        /* Main split dashboard layout for File Translation */
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
      ) : (
        /* New Mortal UI dashboard layout */
        <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch flex-1 mt-8">
          {/* Left Sidebar: Controls, stats, filters */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            {/* File Upload Zone */}
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md">
              <h2 className="text-md font-light text-zinc-200 mb-4 tracking-wide flex items-center gap-2">
                Tải tệp từ điển JSON
              </h2>

              {!mortalFile ? (
                <div className="relative border border-dashed border-zinc-800 hover:border-zinc-700 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-zinc-950/40 transition-colors group">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleMortalFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileArrowUp className="w-8 h-8 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  <span className="text-xs text-zinc-300 font-light text-center">Kéo thả hoặc click để tải lên file dịch JSON</span>
                  <span className="text-[10px] text-zinc-600 font-mono text-center">mortal-ui-vi-*.json</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5 bg-zinc-950/30 p-3.5 border border-zinc-900 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                      <div className="flex flex-col truncate">
                        <span className="text-xs text-zinc-200 font-mono font-medium truncate" title={mortalFile.name}>
                          {mortalFile.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {(mortalFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMortalFile(null);
                        setMortalItems([]);
                        setMortalMetadata({});
                      }}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-mono underline cursor-pointer"
                    >
                      Đặt lại
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Statistics Panel */}
            {mortalItems.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md">
                <h2 className="text-md font-light text-zinc-200 mb-4 tracking-wide flex items-center gap-2">
                  Tiến độ Dịch từ điển
                </h2>
                
                {(() => {
                  const total = mortalItems.length;
                  const translated = mortalItems.filter(item => item.value && item.value !== item.key).length;
                  const untranslated = total - translated;
                  const percent = total > 0 ? ((translated / total) * 100).toFixed(1) : "0.0";
                  
                  return (
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="bg-zinc-950/40 border border-zinc-900 p-2.5 rounded">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Tổng số từ</span>
                          <span className="text-lg font-light text-zinc-100 font-mono">{total.toLocaleString()}</span>
                        </div>
                        <div className="bg-zinc-950/40 border border-zinc-900 p-2.5 rounded">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Đã dịch</span>
                          <span className="text-lg font-light text-green-400 font-mono">{translated.toLocaleString()}</span>
                        </div>
                        <div className="bg-zinc-950/40 border border-zinc-900 p-2.5 rounded">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Chưa dịch</span>
                          <span className="text-lg font-light text-zinc-400 font-mono">{untranslated.toLocaleString()}</span>
                        </div>
                        <div className="bg-zinc-950/40 border border-zinc-900 p-2.5 rounded">
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">Hoàn thành</span>
                          <span className="text-lg font-light text-zinc-100 font-mono">{percent}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-950 border border-zinc-900 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                          className="bg-zinc-300 h-full transition-all duration-500" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Card: Cấu hình Hiệu năng Dịch for Mortal UI */}
            {mortalItems.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">
                    Số dòng gộp mỗi lần gọi (Batch Size)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/80 font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">
                    Số luồng chạy song song (Concurrency)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={concurrency}
                    onChange={(e) => setConcurrency(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500/80 font-mono"
                  />
                </div>
              </div>
            )}

            {mortalItems.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md flex flex-col gap-4">
                <h2 className="text-md font-light text-zinc-200 tracking-wide flex items-center gap-2">
                  Tìm kiếm &amp; Bộ lọc
                </h2>

                {/* Search query box */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Nhập từ khóa</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={mortalSearch}
                      onChange={(e) => {
                        setMortalSearch(e.target.value);
                        setMortalPage(1);
                      }}
                      placeholder="Tìm tiếng Trung hoặc Việt..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-500"
                    />
                    <MagnifyingGlass className="absolute left-3 w-4 h-4 text-zinc-600" />
                  </div>
                </div>

                {/* Filters selectors */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">Bộ lọc trạng thái</label>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { id: "all", label: "Tất cả từ điển", icon: <BookOpen className="w-3.5 h-3.5" /> },
                      { id: "untranslated", label: "Chưa dịch / Trống", icon: <FileText className="w-3.5 h-3.5" /> },
                      { id: "has_vars", label: "Chứa biến số ({value})", icon: <Cpu className="w-3.5 h-3.5" /> }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setMortalFilter(item.id as any);
                          setMortalPage(1);
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-md border text-left transition-all cursor-pointer ${
                          mortalFilter === item.id
                            ? "bg-zinc-100 border-zinc-100 text-zinc-950 font-semibold"
                            : "bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions panel */}
            {mortalItems.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md flex flex-col gap-3">
                <h2 className="text-md font-light text-zinc-200 tracking-wide">
                  Thao tác xuất bản
                </h2>

                <button
                  onClick={handleExportMortalJson}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <DownloadSimple className="w-4 h-4" />
                  <span>XUẤT FILE JSON</span>
                </button>

                <div className="text-[10px] text-zinc-500 leading-relaxed font-light text-center">
                  Tệp xuất ra sẽ giữ nguyên cấu trúc metadata ban đầu và cập nhật thời gian xuất bản mới.
                </div>
              </div>
            )}



            {/* Card 3: Prompt & Variables Setup for Mortal UI */}
            {mortalItems.length > 0 && (
              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-5 backdrop-blur-md flex flex-col min-h-[300px]">
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

                {/* Variable protection settings */}
                <div className="flex flex-col gap-3 pt-3 border-t border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase">
                      Biến số khóa bảo vệ ({variables.length})
                    </label>
                    <button
                      onClick={handleScanMortalVariables}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white transition-all cursor-pointer"
                    >
                      QUÉT BIẾN TỪ ĐIỂN
                    </button>
                  </div>

                  {/* Tag Editor List */}
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 min-h-[80px] max-h-[140px] overflow-y-auto flex flex-wrap gap-2 items-start mb-3">
                    {variables.length === 0 ? (
                      <span className="text-[11px] text-zinc-600 italic">
                        Chưa quét biến. Bấm "Quét biến từ điển" hoặc tự nhập thủ công bên dưới.
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
                      placeholder="Thêm biến thủ công (ví dụ: {value0})..."
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
            )}
          </aside>

          {/* Right Main Panel: Translation list grid */}
          <section className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-6 backdrop-blur-md flex flex-col min-h-[600px]">
            {mortalItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs italic gap-2 py-20">
                <BookOpen className="w-10 h-10 text-zinc-600 mb-2 animate-pulse" />
                <span>Chưa tải tệp từ điển. Vui lòng tải file ở thanh bên để hiển thị danh sách từ dịch.</span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full">
                {/* Grid Header & Pagination */}
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 mb-4 gap-4">
                  <div>
                    <h2 className="text-md font-light text-zinc-200 tracking-wide flex items-center gap-2">
                      Từ điển dịch song song
                    </h2>
                    <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredMortalItems.length)} của {filteredMortalItems.length.toLocaleString()} dòng
                    </p>
                  </div>

                  {/* Batch AI Translate button & Pagination controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTranslateAllMortal}
                      disabled={!apiKey || isTranslatingAll || mortalItems.length === 0}
                      className="px-3.5 py-1.5 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:opacity-40 rounded text-white disabled:text-zinc-500 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 shadow"
                    >
                      <Translate className="w-3.5 h-3.5" />
                      <span>DỊCH TOÀN BỘ TỪ ĐIỂN</span>
                    </button>

                    <button
                      onClick={handleTranslateMortalPage}
                      disabled={!apiKey || isProcessingMortalBulk || pageMortalItems.length === 0}
                      className="px-3.5 py-1.5 text-[10px] font-semibold bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-900 disabled:opacity-40 rounded text-zinc-950 disabled:text-zinc-500 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 shadow"
                    >
                      {isProcessingMortalBulk ? (
                        <>
                          <Spinner className="w-3 h-3 animate-spin text-zinc-600" />
                          <span>ĐANG DỊCH AI TRANG...</span>
                        </>
                      ) : (
                        <>
                          <Translate className="w-3.5 h-3.5" />
                          <span>DỊCH AI TRANG HIỆN TẠI</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleClearAllMortalTranslations}
                      disabled={mortalItems.length === 0 || isTranslatingAll}
                      className="px-3.5 py-1.5 text-[10px] font-semibold bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-750 disabled:bg-zinc-900 disabled:opacity-40 rounded text-rose-400 hover:text-rose-300 disabled:text-zinc-600 transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 shadow"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      <span>XÓA TOÀN BỘ BẢN DỊCH</span>
                    </button>

                    {/* Pagination buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setMortalPage(p => Math.max(1, p - 1))}
                        disabled={clampedPage === 1}
                        className="p-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 disabled:opacity-30 rounded text-zinc-300 cursor-pointer"
                      >
                        <CaretLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-zinc-300 font-mono px-2">
                        {clampedPage} / {totalMortalPages}
                      </span>
                      <button
                        onClick={() => setMortalPage(p => Math.min(totalMortalPages, p + 1))}
                        disabled={clampedPage === totalMortalPages}
                        className="p-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 disabled:opacity-30 rounded text-zinc-300 cursor-pointer"
                      >
                        <CaretRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* List of dictionary entries */}
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[70vh]">
                  {pageMortalItems.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs italic">
                      Không tìm thấy từ nào phù hợp với bộ lọc và từ khóa tìm kiếm.
                    </div>
                  ) : (
                    pageMortalItems.map((item) => {
                      // Find the true original index in the main mortalItems list
                      const originalIdx = mortalItems.findIndex((it) => it.key === item.key);
                      return (
                        <MortalRow
                          key={item.key}
                          item={item}
                          originalIndex={originalIdx}
                          translateItem={translateMortalItem}
                          onValueChange={handleMortalValueChange}
                        />
                      );
                    })
                  )}
                </div>

                {/* Bottom Pagination */}
                {totalMortalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-zinc-800 pt-4 mt-4 gap-4">
                    {/* Jump to page */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 font-mono uppercase">Nhảy đến trang</span>
                      <input
                        type="number"
                        min={1}
                        max={totalMortalPages}
                        value={mortalPage}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (val >= 1 && val <= totalMortalPages) {
                            setMortalPage(val);
                          }
                        }}
                        className="w-16 bg-zinc-950 border border-zinc-900 rounded p-1 text-center font-mono text-xs text-zinc-300 focus:outline-none focus:border-zinc-700"
                      />
                    </div>

                    {/* Pagination buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setMortalPage(p => Math.max(1, p - 1))}
                        disabled={clampedPage === 1}
                        className="p-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 disabled:opacity-30 rounded text-zinc-300 cursor-pointer"
                      >
                        <CaretLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-zinc-300 font-mono px-2">
                        {clampedPage} / {totalMortalPages}
                      </span>
                      <button
                        onClick={() => setMortalPage(p => Math.min(totalMortalPages, p + 1))}
                        disabled={clampedPage === totalMortalPages}
                        className="p-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 disabled:opacity-30 rounded text-zinc-300 cursor-pointer"
                      >
                        <CaretRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      )}

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

      {/* Overlay Progress Modal for Translate All */}
      {isTranslatingAll && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Spinner className="w-5 h-5 text-indigo-400 animate-spin" />
              <h3 className="text-md font-light text-zinc-100 tracking-wide">
                Đang Dịch Toàn Bộ Từ Điển
              </h3>
            </div>

            {/* Progress metrics */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-mono text-zinc-400">
                <span>Tiến độ hoàn thành:</span>
                <span>
                  {translateAllProgress.current} / {translateAllProgress.total} từ ({translateAllProgress.total > 0 ? ((translateAllProgress.current / translateAllProgress.total) * 100).toFixed(1) : 0}%)
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-zinc-950 border border-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300"
                  style={{
                    width: `${translateAllProgress.total > 0 ? (translateAllProgress.current / translateAllProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Current status message */}
            <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-lg text-xs font-mono text-zinc-400 truncate max-w-full">
              Trạng thái: <span className="text-zinc-200">{translateAllProgress.statusText}</span>
            </div>

            {/* Warning note */}
            <p className="text-[10px] text-zinc-500 italic leading-relaxed">
              *Hệ thống đang dịch song song {concurrency} Batch (kích thước {batchSize} từ/Batch). Vui lòng không đóng tab trình duyệt khi tiến trình đang diễn ra.
            </p>

            {/* Action button */}
            <button
              onClick={() => {
                abortTranslateAllRef.current = true;
                setTranslateAllProgress(prev => ({ ...prev, statusText: "Đang dừng tiến trình..." }));
              }}
              className="w-full py-2 bg-rose-950/20 hover:bg-rose-900 border border-rose-900/40 text-rose-300 hover:text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              HỦY TIẾN TRÌNH
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
