"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

type JobInfo = {
  jobId: string;
  status: JobStatus;
  createdAt?: string;
  updatedAt?: string;
  errorMessage?: string;
};

type RecentJob = { jobId: string; status: JobStatus };

const TERMINAL: JobStatus[] = ["COMPLETED", "FAILED"];

// Direct backend URL bypasses the Next.js dev proxy (10MB body cap).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function badge(status: JobStatus) {
  switch (status) {
    case "COMPLETED":
      return "badge badge-completed";
    case "FAILED":
      return "badge badge-failed";
    case "PROCESSING":
      return "badge badge-processing";
    default:
      return "badge badge-pending";
  }
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(
    null
  );
  const [jobIdInput, setJobIdInput] = useState("");
  const [job, setJob] = useState<JobInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [recent, setRecent] = useState<RecentJob[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("VideoScale-recent");
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("VideoScale-recent", JSON.stringify(recent));
    } catch {}
  }, [recent]);

  const stopPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };

  useEffect(() => stopPoll, []);

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "light" ? "light" : "dark"
    );
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("VideoScale-theme", next);
    } catch {}
  };

  const upsertRecent = useCallback((jobId: string, status: JobStatus) => {
    setRecent((prev) => {
      const next = [
        { jobId, status },
        ...prev.filter((j) => j.jobId !== jobId),
      ].slice(0, 20);
      return next;
    });
  }, []);

  const fetchStatus = useCallback(
    async (id: string): Promise<JobInfo | null> => {
      const res = await fetch(`${API_BASE}/api/videos/status/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    []
  );

  const watchJob = useCallback(
    (id: string) => {
      stopPoll();
      pollRef.current = setInterval(async () => {
        try {
          const data = await fetchStatus(id);
          if (!data) return stopPoll();
          setJob(data);
          upsertRecent(data.jobId, data.status);
          if (TERMINAL.includes(data.status)) stopPoll();
        } catch {
          stopPoll();
        }
      }, 3000);
    },
    [fetchStatus, upsertRecent]
  );

  const checkStatus = async (id?: string) => {
    const target = (id ?? jobIdInput).trim();
    if (!target) {
      setJob(null);
      setNotice({ msg: "Enter a Job ID first.", ok: false });
      return;
    }
    setChecking(true);
    setNotice(null);
    try {
      const data = await fetchStatus(target);
      if (!data) {
        setJob(null);
        setNotice({ msg: `No job found: ${target}`, ok: false });
        return;
      }
      setJob(data);
      setJobIdInput(data.jobId);
      upsertRecent(data.jobId, data.status);
      watchJob(data.jobId);
    } catch (e) {
      setNotice({ msg: e instanceof Error ? e.message : "Lookup failed", ok: false });
    } finally {
      setChecking(false);
    }
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setNotice({ msg: "Only video files are allowed.", ok: false });
      return;
    }
    setFile(f);
    setNotice(null);
    setProgress(0);
  };

  const upload = () => {
    if (!file || uploading) return;
    setUploading(true);
    setNotice({ msg: "Uploading…", ok: true });
    setProgress(0);

    const form = new FormData();
    form.append("video", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/videos/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = async () => {
      setUploading(false);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && data.jobId) {
          setProgress(100);
          setNotice({ msg: `Upload complete — tracking ${data.jobId}`, ok: true });
          upsertRecent(data.jobId, "PENDING");
          setJobIdInput(data.jobId);
          await checkStatus(data.jobId);
          setFile(null);
          if (inputRef.current) inputRef.current.value = "";
        } else {
          setNotice({ msg: data.message || "Upload failed.", ok: false });
        }
      } catch {
        setNotice({ msg: "Upload failed.", ok: false });
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      setNotice({ msg: "Network error. Is the backend running on :8080?", ok: false });
    };
    xhr.send(form);
  };

  return (
    <div className="mx-auto w-full max-w-xl px-5 pb-16 pt-14">
      <header className="relative mb-10 text-center">
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Light theme" : "Dark theme"}
          className="absolute right-0 top-0 rounded-md border border-line bg-ink-card p-2 text-paper-muted transition-colors hover:border-sand hover:text-sand"
        >
          {theme === "dark" ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
              <line x1="4.9" y1="4.9" x2="7" y2="7" />
              <line x1="17" y1="17" x2="19.1" y2="19.1" />
              <line x1="4.9" y1="19.1" x2="7" y2="17" />
              <line x1="17" y1="7" x2="19.1" y2="4.9" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          )}
        </button>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sand to-sand-light text-xl font-bold text-[#0b0f1a] shadow-[0_8px_32px_rgba(201,148,74,0.25)]">
          V
        </div>
        <h1 className="text-3xl font-bold tracking-tight">VideoScale</h1>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-paper-muted">
          Video Processing Pipeline
        </p>
      </header>

      {/* Upload */}
      <section className="relative mb-4 overflow-hidden rounded-xl border border-line bg-ink-card p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sand/30 to-transparent" />
        <h2 className="mb-4 text-sm font-semibold">Upload Video</h2>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className={`cursor-pointer rounded-lg border-[1.5px] border-dashed px-6 py-10 text-center transition-all ${
            dragOver
              ? "border-sand bg-sand/10"
              : "border-line bg-ink-surface hover:border-sand/40"
          }`}
        >
          <svg
            className={`mx-auto mb-3 h-10 w-10 ${dragOver ? "text-sand" : "text-paper-muted"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="truncate text-sm font-medium">
            {file ? file.name : "Drop your video here"}
          </p>
          <p className="mt-1 text-xs text-paper-muted">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB — ready to upload`
              : "or click to browse files"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        <button
          onClick={upload}
          disabled={!file || uploading}
          className="mt-4 w-full rounded-lg bg-gradient-to-br from-sand to-sand-light py-2.5 text-sm font-semibold text-ink transition-all hover:-translate-y-px hover:shadow-[0_4px_24px_rgba(201,148,74,0.35)] disabled:cursor-not-allowed disabled:bg-ink-hover disabled:text-paper-muted disabled:shadow-none"
        >
          {uploading ? `Uploading ${progress}%…` : "Upload Video"}
        </button>

        {uploading && (
          <div className="mt-3 h-[3px] overflow-hidden rounded bg-ink-hover">
            <div
              className="h-full rounded bg-gradient-to-r from-sand to-sand-light transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {notice && (
          <p className={`notice ${notice.ok ? "notice-ok" : "notice-err"}`}>
            {notice.msg}
          </p>
        )}
      </section>

      {/* Status */}
      <section className="relative mb-4 overflow-hidden rounded-xl border border-line bg-ink-card p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sand/30 to-transparent" />
        <h2 className="mb-4 text-sm font-semibold">Check Status</h2>
        <div className="flex gap-2">
          <input
            value={jobIdInput}
            onChange={(e) => setJobIdInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkStatus()}
            placeholder="Enter Job ID"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-md border border-line bg-ink-surface px-3 py-2 font-mono text-xs text-paper placeholder:font-sans focus:border-sand focus:outline-none"
          />
          <button
            onClick={() => checkStatus()}
            disabled={checking}
            className="rounded-md border border-sand/20 bg-sand/10 px-4 py-2 text-sm font-semibold text-sand transition-colors hover:bg-sand hover:text-ink disabled:opacity-50"
          >
            {checking ? "…" : "Check"}
          </button>
        </div>

        {job && (
          <div className="mt-4 rounded-md border border-line bg-ink-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-paper-muted">
                Job Status
              </span>
              <span className={badge(job.status)}>{job.status}</span>
            </div>
            <p className="mt-2 break-all font-mono text-xs text-paper-dim">
              {job.jobId}
            </p>
            {(job.createdAt || job.updatedAt) && (
              <p className="mt-1 text-xs text-paper-muted">
                {[job.createdAt && `Created ${new Date(job.createdAt).toLocaleString()}`,
                  job.updatedAt && `Updated ${new Date(job.updatedAt).toLocaleString()}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {job.errorMessage && (
              <p className="err-text">{job.errorMessage}</p>
            )}
            {!TERMINAL.includes(job.status) && (
              <p className="mt-2 text-xs text-paper-muted">
                Live — auto-refreshing every 3s…
              </p>
            )}
          </div>
        )}
      </section>

      {/* Recent */}
      <section className="relative overflow-hidden rounded-xl border border-line bg-ink-card p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sand/30 to-transparent" />
        <h2 className="mb-2 text-sm font-semibold">Recent Jobs</h2>
        {recent.length === 0 ? (
          <p className="py-2 text-center text-[13px] text-paper-muted">
            No jobs yet
          </p>
        ) : (
          <ul>
            {recent.map((j) => (
              <li key={j.jobId}>
                <button
                  onClick={() => checkStatus(j.jobId)}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-ink-hover"
                >
                  <span className="min-w-0 truncate font-mono text-xs text-paper-dim">
                    {j.jobId}
                  </span>
                  <span className={badge(j.status)}>{j.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-10 border-t border-line pt-5 text-center">
        <p className="text-xs text-paper-muted">
          VideoScale — Spring Boot API + Next.js UI
        </p>
      </footer>
    </div>
  );
}
