"use server";

import { createServerClient } from "@/lib/supabase/server";
import { getTeamId } from "@/lib/team";
import { loadFamilyGraph, type QuestionRow } from "@/lib/data";
import { relation } from "@/lib/kinship/relation";
import {
  bucketize,
  drawPair,
  enumeratePairs,
  pairKey,
  randomTier,
  type Tier,
} from "@/lib/kinship/pairs";
import { cheapMatch } from "@/lib/normalize";
import { verifyWithLlm } from "@/lib/openai";
import {
  ANSWER_GRACE_SECONDS,
  pointsFor,
  RUN_DURATION_SECONDS,
} from "@/lib/scoring";

export interface PersonPayload {
  id: string;
  name: string;
  photoPath: string | null;
}

export interface QuestionPayload {
  id: string;
  tier: Tier;
  personA: PersonPayload;
  personB: PersonPayload;
}

export interface RunPayload {
  id: string;
  hardMode: boolean;
  endsAt: string;
  serverNow: string;
  score: number;
  correctCount: number;
  answeredCount: number;
}

export interface AnswerFeedback {
  verdict: "correct" | "incorrect" | "skipped";
  points: number;
  /** Full sentence describing the true relationship, shown after answering. */
  correctSentence: string;
}

export interface GameStateResult {
  error?: string;
  timeUp?: boolean;
  run?: RunPayload;
  question?: QuestionPayload | null;
  feedback?: AnswerFeedback;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function questionPayload(row: QuestionRow): Promise<QuestionPayload | null> {
  const supabase = createServerClient();
  const { data: people } = await supabase
    .from("people")
    .select("*")
    .in("id", [row.person_a, row.person_b]);
  const personA = people?.find((p) => p.id === row.person_a);
  const personB = people?.find((p) => p.id === row.person_b);
  if (!personA || !personB) return null;
  return {
    id: row.id,
    tier: row.tier,
    personA: { id: personA.id, name: personA.name, photoPath: personA.photo_path },
    personB: { id: personB.id, name: personB.name, photoPath: personB.photo_path },
  };
}

async function runPayload(runId: string): Promise<RunPayload | null> {
  const supabase = createServerClient();
  const { data: run } = await supabase
    .from("runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();
  if (!run) return null;
  const { data: questions } = await supabase
    .from("questions")
    .select("points,verdict")
    .eq("run_id", runId);
  const answered = (questions ?? []).filter((q) => q.verdict !== null);
  return {
    id: run.id,
    hardMode: run.hard_mode,
    endsAt: run.ends_at,
    serverNow: nowIso(),
    score: answered.reduce((sum, q) => sum + q.points, 0),
    correctCount: answered.filter((q) => q.verdict === "correct").length,
    answeredCount: answered.length,
  };
}

/** Pairs this team has already been asked, across all of its runs. */
async function askedPairKeys(teamId: string): Promise<Set<string>> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("questions")
    .select("person_a,person_b,runs!inner(team_id)")
    .eq("runs.team_id", teamId);
  return new Set((data ?? []).map((q) => pairKey(q.person_a, q.person_b)));
}

async function drawNextQuestion(run: {
  id: string;
  team_id: string;
  hard_mode: boolean;
}): Promise<QuestionPayload | null> {
  const supabase = createServerClient();

  // Resume any question that was drawn but never answered (refresh-safe).
  const { data: pending } = await supabase
    .from("questions")
    .select("*")
    .eq("run_id", run.id)
    .is("verdict", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pending) return questionPayload(pending);

  const { data: team } = await supabase
    .from("teams")
    .select("person1_id,person2_id")
    .eq("id", run.team_id)
    .maybeSingle();
  if (!team) return null;

  const graph = await loadFamilyGraph();
  const pairs = enumeratePairs(graph, {
    attendingOnly: !run.hard_mode,
    excludeIds: [team.person1_id, team.person2_id],
  });
  if (pairs.length === 0) return null;

  const asked = await askedPairKeys(run.team_id);
  const drawn = drawPair(bucketize(pairs), randomTier(), asked);
  if (!drawn) return null;

  // Randomize which person is asked about first.
  const flip = Math.random() < 0.5;
  const aId = flip ? drawn.pair.bId : drawn.pair.aId;
  const bId = flip ? drawn.pair.aId : drawn.pair.bId;
  const rel = flip
    ? {
        labelAB: drawn.pair.relation.labelBA,
        labelBA: drawn.pair.relation.labelAB,
      }
    : drawn.pair.relation;

  const { data: inserted, error } = await supabase
    .from("questions")
    .insert({
      run_id: run.id,
      tier: drawn.tier,
      person_a: aId,
      person_b: bId,
      expected_label_ab: rel.labelAB,
      expected_label_ba: rel.labelBA,
      distance: drawn.pair.relation.distance,
    })
    .select("*")
    .single();
  if (error || !inserted) return null;
  return questionPayload(inserted);
}

export async function startRun(hardMode: boolean): Promise<GameStateResult> {
  const teamId = await getTeamId();
  if (!teamId) return { error: "No team on this device — create one first" };

  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from("runs")
    .select("*")
    .eq("team_id", teamId)
    .gt("ends_at", nowIso())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let run = existing;
  if (!run) {
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + RUN_DURATION_SECONDS * 1000);
    const { data: created, error } = await supabase
      .from("runs")
      .insert({
        team_id: teamId,
        hard_mode: hardMode,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select("*")
      .single();
    if (error || !created) {
      return { error: error?.message ?? "Couldn't start the run" };
    }
    run = created;
  }

  const question = await drawNextQuestion(run);
  const payload = await runPayload(run.id);
  if (!payload) return { error: "Couldn't load the run" };
  if (!question) {
    return {
      run: payload,
      question: null,
      error:
        "Not enough related people in the family tree yet — ask the organizer to add more family members.",
    };
  }
  return { run: payload, question };
}

/** Resume state for the /play page after a refresh. */
export async function getRunState(): Promise<GameStateResult> {
  const teamId = await getTeamId();
  if (!teamId) return { error: "No team" };
  const supabase = createServerClient();
  const { data: run } = await supabase
    .from("runs")
    .select("*")
    .eq("team_id", teamId)
    .gt("ends_at", nowIso())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!run) return { run: undefined };
  const question = await drawNextQuestion(run);
  const payload = await runPayload(run.id);
  return { run: payload ?? undefined, question };
}

async function loadOwnQuestion(questionId: string) {
  const teamId = await getTeamId();
  if (!teamId) return { error: "No team on this device" as const };
  const supabase = createServerClient();
  const { data: question } = await supabase
    .from("questions")
    .select("*, runs!inner(id, team_id, hard_mode, ends_at, started_at)")
    .eq("id", questionId)
    .maybeSingle();
  if (!question || question.runs.team_id !== teamId) {
    return { error: "Question not found" as const };
  }
  return { question, run: question.runs };
}

async function finishQuestion(
  questionId: string,
  run: { id: string; team_id: string; hard_mode: boolean; ends_at: string },
  correctSentence: string,
  feedback: AnswerFeedback,
): Promise<GameStateResult> {
  const stillTime = Date.now() < new Date(run.ends_at).getTime();
  const question = stillTime ? await drawNextQuestion(run) : null;
  const payload = await runPayload(run.id);
  return {
    run: payload ?? undefined,
    question,
    feedback: { ...feedback, correctSentence },
    timeUp: !stillTime,
  };
}

export async function submitAnswer(
  questionId: string,
  answerText: string,
): Promise<GameStateResult> {
  const loaded = await loadOwnQuestion(questionId);
  if ("error" in loaded) return { error: loaded.error };
  const { question, run } = loaded;

  const supabase = createServerClient();
  const { data: pair } = await supabase
    .from("people")
    .select("id,name")
    .in("id", [question.person_a, question.person_b]);
  const nameA = pair?.find((p) => p.id === question.person_a)?.name ?? "Person A";
  const nameB = pair?.find((p) => p.id === question.person_b)?.name ?? "Person B";
  const correctSentence = `${nameA} is ${nameB}'s ${question.expected_label_ab}`;

  // Idempotency: a double-tap or retry shouldn't re-grade or re-draw points.
  if (question.verdict) {
    return finishQuestion(questionId, run, correctSentence, {
      verdict: question.verdict,
      points: question.points,
      correctSentence,
    });
  }

  const answer = answerText.trim();
  if (!answer) return { error: "Type an answer first" };

  const deadline = new Date(run.ends_at).getTime() + ANSWER_GRACE_SECONDS * 1000;
  if (Date.now() > deadline) {
    return { timeUp: true, run: (await runPayload(run.id)) ?? undefined };
  }

  // Accepted phrasings: the stored labels plus gendered/neutral variants from
  // the live graph (tree edits mid-run just widen or narrow the accept set).
  const accepted = new Set([question.expected_label_ab, question.expected_label_ba]);
  try {
    const graph = await loadFamilyGraph();
    const rel = relation(graph, question.person_a, question.person_b);
    for (const label of [...(rel?.acceptedAB ?? []), ...(rel?.acceptedBA ?? [])]) {
      accepted.add(label);
    }
  } catch {
    // Graph load failure just means we lean on the LLM pass.
  }

  let verdict: "correct" | "incorrect";
  let matchedVia: "exact" | "synonym" | "llm";
  let canonicalAnswer: string | null = null;

  const cheap = cheapMatch(answer, [...accepted], [nameA, nameB]);
  if (cheap) {
    verdict = "correct";
    matchedVia = cheap;
  } else {
    try {
      const llm = await verifyWithLlm({
        nameA,
        nameB,
        labelAB: question.expected_label_ab,
        labelBA: question.expected_label_ba,
        answer,
      });
      verdict = llm.matches_expected ? "correct" : "incorrect";
      matchedVia = "llm";
      canonicalAnswer = llm.canonical_relationship;
    } catch {
      return {
        error: "Couldn't check that answer — try submitting again",
      };
    }
  }

  const points = verdict === "correct" ? pointsFor(question.tier, run.hard_mode) : 0;
  const { error: updateError } = await supabase
    .from("questions")
    .update({
      answer_text: answer,
      canonical_answer: canonicalAnswer,
      matched_via: matchedVia,
      verdict,
      points,
      answered_at: nowIso(),
    })
    .eq("id", questionId)
    .is("verdict", null);
  if (updateError) return { error: updateError.message };

  return finishQuestion(questionId, run, correctSentence, {
    verdict,
    points,
    correctSentence,
  });
}

export async function skipQuestion(questionId: string): Promise<GameStateResult> {
  const loaded = await loadOwnQuestion(questionId);
  if ("error" in loaded) return { error: loaded.error };
  const { question, run } = loaded;

  const supabase = createServerClient();
  const { data: pair } = await supabase
    .from("people")
    .select("id,name")
    .in("id", [question.person_a, question.person_b]);
  const nameA = pair?.find((p) => p.id === question.person_a)?.name ?? "Person A";
  const nameB = pair?.find((p) => p.id === question.person_b)?.name ?? "Person B";
  const correctSentence = `${nameA} is ${nameB}'s ${question.expected_label_ab}`;

  if (!question.verdict) {
    await supabase
      .from("questions")
      .update({ verdict: "skipped", points: 0, answered_at: nowIso() })
      .eq("id", questionId)
      .is("verdict", null);
  }
  return finishQuestion(questionId, run, correctSentence, {
    verdict: "skipped",
    points: 0,
    correctSentence,
  });
}
