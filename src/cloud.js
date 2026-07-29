import { supabase } from "./supabase.js";

function toCloudQuestion(question, userId) {
  return {
    id: String(question.id),
    user_id: userId,
    area: question.area,
    topic: question.topic,
    difficulty: question.difficulty,
    tag: question.tag || "Banco geral",
    question_text: question.text,
    options: question.options,
    correct_answer: question.answer,
    explanation: question.explanation || ""
  };
}

function fromCloudQuestion(row) {
  return {
    id: row.id,
    area: row.area,
    topic: row.topic,
    difficulty: row.difficulty,
    tag: row.tag || "Banco geral",
    text: row.question_text,
    options: row.options,
    answer: row.correct_answer,
    explanation: row.explanation
  };
}

export async function syncQuestions(questions, userId) {
  if (!supabase || !userId) return questions;

  const cleanQuestions = questions.filter(question => !/^omed-.+-r\d+$/.test(String(question.id)));
  const { error: cleanupError } = await supabase
    .from("questions")
    .delete()
    .eq("user_id", userId)
    .like("id", "omed-%-r%");
  if (cleanupError) throw cleanupError;

  if (cleanQuestions.length) {
    const rows = cleanQuestions.map(q => toCloudQuestion(q, userId));
    for (let index = 0; index < rows.length; index += 50) {
      const { error } = await supabase
        .from("questions")
        .upsert(rows.slice(index, index + 50), { onConflict: "user_id,id" });
      if (error) throw error;
    }
  }

  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data
    .map(fromCloudQuestion)
    .filter(question => !/^omed-.+-r\d+$/.test(String(question.id)));
}

export async function saveCloudQuestions(questions, userId) {
  if (!supabase || !userId || !questions.length) return;
  const { error } = await supabase
    .from("questions")
    .upsert(questions.map(q => toCloudQuestion(q, userId)), { onConflict: "user_id,id" });
  if (error) throw error;
}

export async function saveCloudAttempt(attempt, userId) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("attempts").insert({
    id: attempt.id,
    user_id: userId,
    question_id: String(attempt.questionId),
    area: attempt.area,
    topic: attempt.topic,
    selected_answer: attempt.selectedAnswer,
    correct: attempt.correct,
    answered_at: attempt.answeredAt
  });
  if (error) throw error;
}

export async function loadCloudAttempts() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("attempts")
    .select("*")
    .order("answered_at", { ascending: true });
  if (error) throw error;
  return data.map(row => ({
    id: row.id,
    questionId: row.question_id,
    area: row.area,
    topic: row.topic,
    selectedAnswer: row.selected_answer,
    correct: row.correct,
    answeredAt: row.answered_at
  }));
}

export async function syncAttempts(attempts, userId) {
  if (!supabase || !userId) return attempts;
  if (attempts.length) {
    const rows = attempts.map(attempt => ({
      id: attempt.id,
      user_id: userId,
      question_id: String(attempt.questionId),
      area: attempt.area,
      topic: attempt.topic,
      selected_answer: attempt.selectedAnswer,
      correct: attempt.correct,
      answered_at: attempt.answeredAt
    }));
    const { error } = await supabase.from("attempts").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
  return loadCloudAttempts();
}
