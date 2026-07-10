"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Compass,
  Play,
  Trash,
  DownloadSimple,
  FolderOpen,
  WarningCircle,
  CheckCircle,
  Spinner,
  Desktop,
  Stop,
  ArrowSquareOut,
  ArrowClockwise,
} from "@phosphor-icons/react";

export default function CrawlerPage() {
  const [url, setUrl] = useState<string>("");
  const [prefixesText, setPrefixesText] = useState<string>(
    "/assets/, /fonts/, /textures/, /art/, /r2-presets/, /favicon.svg"
  );
  const [enableR2Presets, setEnableR2Presets] = useState<boolean>(true);

  const [status, setStatus] = useState<{
    isCrawling: boolean;
    origin: string;
    outDir: string;
    downloaded: number;
    failed: number;
    queued: number;
    presetOk: number;
    presetFailed: number;
    status: "idle" | "running" | "completed" | "failed";
    error?: string;
  }>({
    isCrawling: false,
    origin: "",
    outDir: "",
    downloaded: 0,
    failed: 0,
    queued: 0,
    presetOk: 0,
    presetFailed: 0,
    status: "idle",
  });

  const [logs, setLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Live Server States
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [serverStatus, setServerStatus] = useState<{
    isRunning: boolean;
    folderName: string;
    port: number;
    url: string;
  }>({
    isRunning: false,
    folderName: "",
    port: 8086,
    url: "",
  });

  const [activeTab, setActiveTab] = useState<"console" | "preview">("console");
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [iframeUrl, setIframeUrl] = useState<string>("");

  // Poll status from the API route
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/crawler");
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error("Failed to query crawler status", e);
    }
  };

  const fetchServerInfo = async () => {
    try {
      const res = await fetch("/api/live-server");
      const data = await res.json();
      setFolders(data.folders);
      setServerStatus(data.status);
      if (data.folders.length > 0 && !selectedFolder) {
        setSelectedFolder(data.folders[0]);
      }
      if (data.status.isRunning) {
        setIframeUrl(data.status.url);
      }
    } catch (e) {
      console.error("Failed to query server info", e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchServerInfo();
    // Poll progress every 2 seconds
    const interval = setInterval(() => {
      fetchStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Listen to SSE live stream for crawler logs
  useEffect(() => {
    const sse = new EventSource("/api/events");

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "log" && payload.message) {
          setLogs((prev) => {
            // Deduplicate logs to avoid clutter
            if (prev.includes(payload.message)) return prev;
            return [...prev, payload.message];
          });
        }
      } catch (e) {}
    };

    return () => {
      sse.close();
    };
  }, []);

  // Autoscroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStartCrawl = async () => {
    setLogs(["[CRAWLER] Đang kết nối tới server khởi chạy tiến trình crawl..."]);

    const prefixes = prefixesText
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    try {
      const res = await fetch("/api/crawler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          allowedPrefixes: prefixes,
          enableR2Presets,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setLogs((prev) => [...prev, `[ERROR] ${data.error}`]);
      } else {
        setStatus((prev) => ({
          ...prev,
          isCrawling: true,
          status: "running",
          outDir: data.outDir,
        }));
        // Refresh folder list once crawl kicks off
        setTimeout(fetchServerInfo, 1000);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[ERROR] Connection failed: ${err.message}`]);
    }
  };

  const handleStartServer = async () => {
    if (!selectedFolder) return;
    try {
      const res = await fetch("/api/live-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          folderName: selectedFolder,
        }),
      });
      const data = await res.json();
      if (data.status) {
        setServerStatus(data.status);
        setIframeUrl(data.status.url);
        setActiveTab("preview");
        setIframeKey((prev) => prev + 1);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopServer = async () => {
    try {
      const res = await fetch("/api/live-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "stop",
        }),
      });
      const data = await res.json();
      if (data.status) {
        setServerStatus(data.status);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-50 flex flex-col p-6 md:p-8 lg:p-12 selection:bg-indigo-500/20">
      {/* Header Section */}
      <header className="max-w-7xl w-full mx-auto mb-8 md:mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-zinc-400 text-sm font-mono tracking-wider uppercase mb-2">
              <Compass className="w-4 h-4 animate-spin-slow text-indigo-400" />
              <span>Web Acquisition</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white leading-tight">
              Crawler &amp; Preview
            </h1>
          </div>
          <p className="text-sm text-zinc-400 max-w-sm font-light leading-relaxed">
            Sao chép tài nguyên trang web tĩnh về local workspace và giả lập môi trường chạy thực tế.
          </p>
        </div>
        <div className="h-px bg-zinc-800/60 mt-6 w-full" />
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Configurations & Controls */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Card 1: Configuration Form */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-6 backdrop-blur-md">
            <h2 className="text-lg font-light text-zinc-200 mb-6 tracking-wide flex items-center gap-2">
              Cấu hình Tải trang
            </h2>
            <div className="flex flex-col gap-5">
              {/* URL input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono tracking-wider text-zinc-400 uppercase">
                  Đường dẫn Website mục tiêu
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={status.isCrawling}
                  placeholder="https://example.com"
                  className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 transition-colors disabled:opacity-55"
                />
              </div>

              {/* Prefixes filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono tracking-wider text-zinc-400 uppercase">
                  Bộ lọc thư mục hợp lệ (Prefixes)
                </label>
                <input
                  type="text"
                  value={prefixesText}
                  onChange={(e) => setPrefixesText(e.target.value)}
                  disabled={status.isCrawling}
                  className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 transition-colors disabled:opacity-55"
                />
                <span className="text-[11px] text-zinc-500 font-light leading-relaxed">
                  Ngăn chặn tải dư thừa bằng cách giới hạn đường dẫn tải xuống.
                </span>
              </div>

              {/* R2 Presets manifest toggle */}
              <div className="flex items-center justify-between border-t border-zinc-800/50 pt-4 mt-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-light text-zinc-200">Tự phân tích R2 Presets</span>
                  <span className="text-[11px] text-zinc-500 font-light">
                    Phân tích manifest.json để tự tải file thẻ (nếu có).
                  </span>
                </div>
                <button
                  onClick={() => setEnableR2Presets(!enableR2Presets)}
                  disabled={status.isCrawling}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                    enableR2Presets ? "bg-indigo-600" : "bg-zinc-800"
                  } disabled:opacity-50`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform transform ${
                      enableR2Presets ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Start button */}
              <button
                onClick={handleStartCrawl}
                disabled={status.isCrawling}
                className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 border border-indigo-500/20 disabled:border-zinc-800 disabled:opacity-55 text-sm font-semibold tracking-wide text-white rounded-lg transition-all tactile-btn flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-[0_1px_12px_rgba(99,102,241,0.15)]"
              >
                {status.isCrawling ? (
                  <>
                    <Spinner className="w-4 h-4 animate-spin text-white" />
                    <span>Đang cào dữ liệu...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-white" />
                    <span>Bắt đầu Thu thập</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Stats Display */}
          {status.status !== "idle" && (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-6 backdrop-blur-md">
              <h3 className="text-sm font-mono tracking-wider text-zinc-400 uppercase mb-5">
                Thông số thu thập thực tế
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950/40 border border-zinc-800/30 rounded-lg p-3.5 flex flex-col">
                  <span className="text-[11px] text-zinc-500 font-light">Thành công</span>
                  <span className="text-2xl font-light text-green-400 mt-1 flex items-center gap-1.5">
                    <CheckCircle className="w-5 h-5 inline text-green-400/80" />
                    {status.downloaded}
                  </span>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-800/30 rounded-lg p-3.5 flex flex-col">
                  <span className="text-[11px] text-zinc-500 font-light">Thất bại</span>
                  <span className={`text-2xl font-light mt-1 flex items-center gap-1.5 ${status.failed > 0 ? "text-rose-400" : "text-zinc-500"}`}>
                    <WarningCircle className="w-5 h-5 inline" />
                    {status.failed}
                  </span>
                </div>
                <div className="bg-zinc-950/40 border border-zinc-800/30 rounded-lg p-3.5 flex flex-col col-span-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-zinc-500 font-light">Tiến độ cào queue</span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {status.status === "completed" ? "Đã xong" : `Đang chạy (Tổng: ${status.queued})`}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800/50 rounded-full h-1.5 mt-3.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        status.status === "completed" ? "bg-green-500" : "bg-indigo-500"
                      }`}
                      style={{
                        width: `${status.queued > 0 ? Math.min(100, (status.downloaded / status.queued) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* R2 Presets Details */}
              {enableR2Presets && (status.presetOk > 0 || status.presetFailed > 0) && (
                <div className="border-t border-zinc-800/50 mt-5 pt-4">
                  <span className="text-xs font-mono tracking-wider text-zinc-400 uppercase">
                    R2 Presets Assets
                  </span>
                  <div className="flex gap-4 mt-2">
                    <div className="text-xs text-zinc-400">
                      Thành công: <span className="text-green-400 font-mono font-semibold">{status.presetOk}</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Lỗi: <span className={`${status.presetFailed > 0 ? "text-rose-400" : "text-zinc-500"} font-mono font-semibold`}>{status.presetFailed}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 3: Live Server Simulator */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-6 backdrop-blur-md">
            <h2 className="text-lg font-light text-zinc-200 mb-5 tracking-wide flex items-center gap-2">
              Giả lập Host local
            </h2>

            <div className="flex flex-col gap-4">
              {/* Folder Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono tracking-wider text-zinc-400 uppercase">
                  Chọn thư mục đã thu thập
                </label>
                <div className="relative">
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/80 transition-colors appearance-none"
                  >
                    {folders.length === 0 ? (
                      <option value="">Chưa có dữ liệu cào...</option>
                    ) : (
                      folders.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))
                    )}
                  </select>
                  <FolderOpen className="absolute right-3.5 top-3 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* Status details */}
              {serverStatus.isRunning && (
                <div className="bg-zinc-950/60 border border-zinc-800/30 rounded-lg p-3.5 flex flex-col font-mono text-xs">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-zinc-500">Môi trường:</span>
                    <span className="text-green-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Đang mở
                    </span>
                  </div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-zinc-500">Local Port:</span>
                    <span className="text-zinc-300">{serverStatus.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Đường dẫn:</span>
                    <a
                      href={serverStatus.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {serverStatus.url}
                      <ArrowSquareOut className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Start/Stop buttons */}
              <div className="flex gap-3">
                {serverStatus.isRunning ? (
                  <button
                    onClick={handleStopServer}
                    className="flex-1 py-2.5 bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold tracking-wider rounded-lg transition-all tactile-btn flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Stop className="w-4 h-4" />
                    ĐÓNG SERVER
                  </button>
                ) : (
                  <button
                    onClick={handleStartServer}
                    disabled={!selectedFolder}
                    className="flex-1 py-2.5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 disabled:opacity-45 text-zinc-300 hover:text-zinc-100 text-xs font-semibold tracking-wider rounded-lg transition-all tactile-btn flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Desktop className="w-4 h-4" />
                    KHỞI CHẠY HOST
                  </button>
                )}
                <button
                  onClick={fetchServerInfo}
                  className="px-3 bg-zinc-900/40 hover:bg-zinc-800/40 border border-zinc-800/80 rounded-lg transition-all tactile-btn cursor-pointer flex items-center justify-center"
                  title="Tải lại danh sách"
                >
                  <ArrowClockwise className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Right column: Monitor Log Terminal or View Preview iframe */}
        <section className="lg:col-span-7 flex flex-col gap-4 self-stretch min-h-[500px]">
          {/* Tab switches */}
          <div className="flex bg-zinc-900/40 border border-zinc-800/60 rounded-lg p-1 self-start">
            <button
              onClick={() => setActiveTab("console")}
              className={`px-5 py-2.5 text-xs font-medium tracking-wide rounded-md transition-all cursor-pointer ${
                activeTab === "console"
                  ? "bg-zinc-900 text-indigo-400 shadow-md"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Cửa sổ Console
            </button>
            <button
              onClick={() => {
                if (serverStatus.isRunning) {
                  setActiveTab("preview");
                }
              }}
              disabled={!serverStatus.isRunning}
              className={`px-5 py-2.5 text-xs font-medium tracking-wide rounded-md transition-all ${
                activeTab === "preview"
                  ? "bg-zinc-900 text-indigo-400 shadow-md"
                  : "text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:hover:text-zinc-400"
              } disabled:cursor-not-allowed cursor-pointer`}
            >
              Xem trước trực tiếp
            </button>
          </div>

          {/* Display screen */}
          <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-xl flex-1 flex flex-col overflow-hidden relative">
            {activeTab === "console" ? (
              /* Terminal display */
              <div className="flex-1 p-5 font-mono text-[12.5px] leading-relaxed text-zinc-300 overflow-y-auto max-h-[600px] flex flex-col gap-1.5 selection:bg-zinc-800 selection:text-zinc-100">
                {logs.length === 0 ? (
                  <div className="text-zinc-600 italic">Console trống. Nhấn "Bắt đầu Thu thập" để xem nhật ký hoạt động.</div>
                ) : (
                  logs.map((log, idx) => {
                    let color = "text-zinc-300";
                    if (log.includes("[FAIL]")) color = "text-rose-400/90";
                    else if (log.includes("[SUCCESS]")) color = "text-green-400/90 font-light";
                    else if (log.includes("[ERROR]")) color = "text-rose-500 font-semibold";
                    else if (log.includes("[CRAWLER]")) color = "text-indigo-400/80";

                    return (
                      <div key={idx} className={color}>
                        {log}
                      </div>
                    );
                  })
                )}
                <div ref={terminalEndRef} />
              </div>
            ) : (
              /* Iframe Live Preview Screen */
              <div className="flex-1 flex flex-col relative w-full h-full min-h-[500px]">
                {iframeUrl ? (
                  <iframe
                    key={iframeKey}
                    src={iframeUrl}
                    className="w-full h-full flex-1 border-none bg-white rounded-b-xl"
                    title="Live Preview"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                    Không tìm thấy URL hợp lệ để giả lập xem trước.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
