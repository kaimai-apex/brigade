"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  APPLICANT_STATUS_COPY,
  applicationSections,
  type ApplicationQuestion,
} from "@/lib/academy/application-form";
import { uploadMediaFile } from "@/lib/media-upload";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Answers = Record<string, string>;

type Application = {
  id: string;
  status: string;
  answers: Record<string, string | number>;
  resumeUrl: string | null;
  portfolioUrl: string | null;
  instagramUrl: string | null;
};

const SECTIONS = applicationSections();
const ALL_QUESTIONS = SECTIONS.flatMap((section) => section.questions);

/** Autosave delay. Long enough not to POST on every keystroke. */
const SAVE_DEBOUNCE_MS = 1200;

export function ApplicationForm() {
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [resumeUrl, setResumeUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  // Skips the autosave that would otherwise fire from the initial load.
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/applications")
      .then((res) => res.json())
      .then((json: { application: Application | null }) => {
        const existing = json.application;
        if (existing) {
          setApplication(existing);
          const loaded: Answers = {};
          for (const [key, value] of Object.entries(existing.answers ?? {})) {
            loaded[key] = String(value);
          }
          setAnswers(loaded);
          setResumeUrl(existing.resumeUrl ?? "");
          setPortfolioUrl(existing.portfolioUrl ?? "");
          setInstagramUrl(existing.instagramUrl ?? "");
        }
      })
      .catch(() => toast.error("Could not load your application"))
      .finally(() => setLoading(false));
  }, []);

  const isDraft = !application || application.status === "draft";

  const save = useCallback(
    async (submit: boolean) => {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          resumeUrl: resumeUrl || undefined,
          portfolioUrl: portfolioUrl || undefined,
          instagramUrl: instagramUrl || undefined,
          submit,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        application?: Application;
        message?: string;
        invalid?: string[];
      };
      if (!res.ok) {
        if (json.invalid) setMissing(json.invalid);
        throw new Error(json.message ?? "Could not save");
      }
      if (json.application) setApplication(json.application);
      setSavedAt(new Date());
      return json.application;
    },
    [answers, resumeUrl, portfolioUrl, instagramUrl],
  );

  // Autosave the draft. A fourteen-question form that loses everything to a
  // closed tab does not get finished.
  useEffect(() => {
    if (loading || !isDraft) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void save(false).catch(() => {
        /* draft autosave is best-effort; submit is the one that must report */
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, resumeUrl, portfolioUrl, instagramUrl, loading, isDraft, save]);

  async function handleResume(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      setResumeUrl(await uploadMediaFile(file, "resume"));
      toast.success("Resume uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload that");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMissing([]);
    try {
      await save(true);
      toast.success("Application sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send that");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Card className="p-8 text-sm text-ink/60">Loading…</Card>;
  }

  // Submitted and beyond: the form becomes a status page. Answers are read-only
  // server-side too, so this is presentation, not the security boundary.
  if (application && application.status !== "draft") {
    const copy =
      APPLICANT_STATUS_COPY[application.status] ?? APPLICANT_STATUS_COPY.submitted;
    return (
      <Card className="space-y-3 p-6 sm:p-8">
        <p className="text-[12px] font-semibold tracking-[0.08em] text-forest">
          APPLICATION STATUS
        </p>
        <h2 className="font-display text-2xl font-bold tracking-tight">{copy.title}</h2>
        <p className="text-body-md leading-relaxed text-ink/70">{copy.body}</p>
      </Card>
    );
  }

  const answered = ALL_QUESTIONS.filter(
    (question) => question.required && (answers[question.id] ?? "").trim(),
  ).length;
  const requiredCount = ALL_QUESTIONS.filter((q) => q.required).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-meta text-ink/60">
          {answered} of {requiredCount} required answers
        </p>
        {savedAt && (
          <p className="text-meta text-ink/50">
            Saved{" "}
            {savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        )}
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title} className="space-y-4 p-5">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/50">
            {section.title}
          </p>
          {section.questions.map((question) => (
            <Field
              key={question.id}
              question={question}
              value={answers[question.id] ?? ""}
              invalid={missing.includes(question.id)}
              onChange={(value) =>
                setAnswers((prev) => ({ ...prev, [question.id]: value }))
              }
            />
          ))}
        </Card>
      ))}

      <Card className="space-y-4 p-5">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/50">
          Show us your work
        </p>

        <div>
          <Label htmlFor="instagramUrl">Instagram</Label>
          <Input
            id="instagramUrl"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourhandle"
          />
        </div>

        <div>
          <Label htmlFor="portfolioUrl">Website or portfolio</Label>
          <Input
            id="portfolioUrl"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://"
          />
        </div>

        <div>
          <p className="mb-2 block text-sm font-semibold text-ink/80">Resume</p>
          <label className="cursor-pointer">
            <span className="inline-flex h-10 items-center rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold">
              {uploading
                ? "Uploading…"
                : resumeUrl
                  ? "Replace resume"
                  : "Upload resume"}
            </span>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => void handleResume(e.target.files?.[0])}
            />
          </label>
          {resumeUrl && <p className="mt-1.5 text-xs text-forest">Resume attached.</p>}
          <p className="mt-1.5 text-xs text-ink/55">PDF, DOC or DOCX.</p>
        </div>
      </Card>

      {missing.length > 0 && (
        <p className="text-sm text-rust">
          {missing.length} answer{missing.length === 1 ? "" : "s"} still needed.
          They&apos;re marked below their question.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={submitting} className="min-w-[10rem]">
          {submitting ? "Sending…" : "Send Application"}
        </Button>
        <p className="text-meta text-ink/55">
          Your answers save as you go. You can come back to this.
        </p>
      </div>
    </form>
  );
}

function Field({
  question,
  value,
  invalid,
  onChange,
}: {
  question: ApplicationQuestion;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const id = `q-${question.id}`;
  return (
    <div>
      <Label htmlFor={id}>
        {question.label}
        {!question.required && (
          <span className="ml-1.5 font-normal text-ink/45">optional</span>
        )}
      </Label>

      {question.kind === "long" ? (
        <Textarea
          id={id}
          value={value}
          rows={4}
          maxLength={question.maxLength}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(invalid && "border-rust")}
        />
      ) : question.kind === "select" ? (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "flex h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm",
            invalid && "border-rust",
          )}
        >
          <option value="">Select…</option>
          {question.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          type={question.kind === "number" ? "number" : "text"}
          inputMode={question.kind === "number" ? "numeric" : undefined}
          min={question.kind === "number" ? 0 : undefined}
          max={question.kind === "number" ? 70 : undefined}
          value={value}
          maxLength={question.maxLength}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(invalid && "border-rust")}
        />
      )}

      {question.help && !invalid && (
        <p className="mt-1.5 text-xs text-ink/55">{question.help}</p>
      )}
      {invalid && <p className="mt-1.5 text-xs text-rust">This one is needed.</p>}
    </div>
  );
}
