"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  skipQuestion,
  startRun,
  submitAnswer,
  type AnswerFeedback,
  type QuestionPayload,
  type RunPayload,
} from "@/app/actions/game";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const TIER_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;
const TIER_TONE = {
  easy: "sage",
  medium: "brown",
  hard: "terracotta",
} as const;

function useCountdown(run: RunPayload | null): number {
  const [remaining, setRemaining] = useState(Infinity);
  useEffect(() => {
    if (!run) return;
    // Anchor to the server clock so a wrong phone clock can't cheat the timer.
    const offsetMs = new Date(run.serverNow).getTime() - Date.now();
    const endsAtMs = new Date(run.endsAt).getTime();
    const tick = () =>
      setRemaining(Math.max(0, endsAtMs - (Date.now() + offsetMs)) / 1000);
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [run]);
  return run ? remaining : Infinity;
}

export function RunScreen({
  initialRun,
  initialQuestion,
  treeUnlocked,
}: {
  initialRun: RunPayload | null;
  initialQuestion: QuestionPayload | null;
  treeUnlocked: boolean;
}) {
  const [run, setRun] = useState(initialRun);
  const [question, setQuestion] = useState(initialQuestion);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hardMode, setHardMode] = useState(false);
  const [answer, setAnswer] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = useCountdown(run);
  const timeUp = remaining <= 0;
  // The run summary shows once the clock is out and any last feedback is read.
  const finished = run !== null && timeUp && !feedback;

  const applyResult = (result: Awaited<ReturnType<typeof submitAnswer>>) => {
    if (result.error && !result.run) {
      setError(result.error);
      return;
    }
    setError(result.error ?? null);
    if (result.run) setRun(result.run);
    if (result.feedback) setFeedback(result.feedback);
    setQuestion(result.question ?? null);
    setAnswer("");
  };

  const handleStart = () => {
    setError(null);
    startTransition(async () => {
      const result = await startRun(hardMode);
      setFeedback(null);
      applyResult(result);
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!question || !answer.trim() || pending) return;
    startTransition(async () => {
      applyResult(await submitAnswer(question.id, answer));
    });
  };

  const handleSkip = () => {
    if (!question || pending) return;
    setError(null);
    setAnswer("");
    setFeedback({
      verdict: "skipped",
      points: 0,
      correctSentence: "Calculating Answer...",
    });
    startTransition(async () => {
      const result = await skipQuestion(question.id);
      if (result.error && !result.run) {
        setFeedback(null);
        setError(result.error);
        return;
      }
      applyResult(result);
    });
  };

  const dismissFeedback = () => {
    setFeedback(null);
    if (!timeUp && question) inputRef.current?.focus();
  };

  // ---------- Lobby ----------
  if (!run || finished) {
    return (
      <div className="flex flex-col gap-4">
        {finished && run && (
          <Card className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm tracking-wide text-brown-500 uppercase">
              Time&apos;s up! Your score was:
            </p>
            <p className="font-display text-5xl font-semibold text-terracotta-500">
              {run.score}
            </p>
            <p className="text-brown-700">
              {run.correctCount} correct out of {run.answeredCount} questions
              answered.
            </p>
            <Link href="/leaderboard" className="w-full">
              <Button variant="primary" className="w-full">
                View the Leaderboard
              </Button>
            </Link>
          </Card>
        )}

        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {finished ? "Another Round?" : "Ready to Play?"}
            </h2>
            {!finished && (
              <p className="mt-1 text-sm text-brown-700">
                You&apos;ll have 5 minutes to answer as many questions as you
                can. Harder pairings are worth more points. Good luck!
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-cream-300 bg-cream-50 p-3">
            <input
              type="checkbox"
              checked={hardMode}
              onChange={(event) => setHardMode(event.target.checked)}
              className="mt-1 size-5 accent-terracotta-500"
            />
            <span>
              <span className="font-medium text-brown-900">Expert Mode</span>
              <span className="block text-sm text-brown-700">
                Questions can include family members who aren&apos;t here! Each
                correct answer is worth 1.5x points :)
              </span>
            </span>
          </label>

          <Button variant="accent" onClick={handleStart} disabled={pending}>
            {pending ? "Picking Questions..." : "Start the Clock"}
          </Button>
          {error && (
            <p className="text-center text-sm text-terracotta-600">{error}</p>
          )}
        </Card>

        {treeUnlocked && (
          <Link href="/tree" className="text-center text-brown-500 underline">
            Study the Family Tree
          </Link>
        )}
      </div>
    );
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const urgent = remaining <= 60;
  const loadingSkippedQuestion =
    pending &&
    feedback?.verdict === "skipped" &&
    feedback.correctSentence === "Loading the answer";

  // ---------- Active run ----------
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span
          className={`rounded-full px-4 py-1.5 font-display text-lg font-semibold tabular-nums ${
            urgent
              ? "bg-terracotta-500 text-cream-50"
              : "bg-brown-700 text-cream-50"
          }`}
        >
          {minutes}:{String(seconds).padStart(2, "0")}
        </span>
        <div className="text-right">
          <p className="text-xs tracking-wide text-brown-500 uppercase">
            Score
          </p>
          <p className="font-display text-xl font-semibold tabular-nums">
            {run.score}
          </p>
        </div>
      </div>

      {feedback ? (
        <Card className="flex flex-col items-center gap-3 text-center">
          {feedback.verdict === "correct" ? (
            <>
              <p className="font-display text-3xl font-semibold text-sage-600">
                Correct! +{feedback.points}
              </p>
              <p className="text-brown-700">{feedback.correctSentence}</p>
            </>
          ) : (
            <>
              <p className="font-display text-3xl font-semibold text-terracotta-600">
                {feedback.verdict === "skipped" ? "Skipped" : "Not Quite..."}
              </p>
              <p className="text-brown-700">
                <span className="font-medium">{feedback.correctSentence}.</span>
              </p>
            </>
          )}
          <Button
            variant="primary"
            onClick={dismissFeedback}
            disabled={loadingSkippedQuestion}
            className="w-full"
          >
            {loadingSkippedQuestion
              ? "Loading Next Question..."
              : timeUp || !question
                ? "Finish"
                : "Next Question"}
          </Button>
        </Card>
      ) : question ? (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Badge tone={TIER_TONE[question.tier]}>
              {TIER_LABEL[question.tier]}
            </Badge>
          </div>

          <div className="flex items-center justify-center gap-4">
            {[question.personA, question.personB].map((person, index) => (
              <div key={person.id} className="flex flex-col items-center gap-2">
                <Avatar
                  name={person.name}
                  photoPath={person.photoPath}
                  size="lg"
                />
                <p className="max-w-28 text-center text-sm font-medium leading-tight">
                  {person.name}
                </p>
                {index === 0 && <span className="sr-only">and</span>}
              </div>
            ))}
          </div>

          <h2 className="text-center font-display text-xl font-semibold">
            How is {question.personA.name.split(/\s+/)[0]} related to{" "}
            {question.personB.name.split(/\s+/)[0]}?
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              ref={inputRef}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="e.g. she's his great-aunt"
              autoComplete="off"
              autoCapitalize="off"
              enterKeyHint="send"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="accent"
                disabled={pending || !answer.trim()}
                className="flex-1"
              >
                {pending ? (
                  <span
                    className="inline-flex items-center gap-1"
                    aria-live="polite"
                  >
                    <span>Checking</span>
                    <span
                      className="inline-flex w-5 justify-between"
                      aria-hidden="true"
                    >
                      <span className="inline-block motion-safe:animate-[checking-dot_1200ms_ease-in-out_infinite]">
                        .
                      </span>
                      <span
                        className="inline-block motion-safe:animate-[checking-dot_1200ms_ease-in-out_infinite]"
                        style={{ animationDelay: "240ms" }}
                      >
                        .
                      </span>
                      <span
                        className="inline-block motion-safe:animate-[checking-dot_1200ms_ease-in-out_infinite]"
                        style={{ animationDelay: "480ms" }}
                      >
                        .
                      </span>
                    </span>
                  </span>
                ) : (
                  "Submit"
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSkip}
                disabled={pending}
              >
                Skip
              </Button>
            </div>
          </form>
          {error && (
            <p className="text-center text-sm text-terracotta-600">{error}</p>
          )}
        </Card>
      ) : (
        <Card className="text-center text-brown-700">
          {error ?? "No More Questions Available — Nice Work!"}
        </Card>
      )}
    </div>
  );
}
