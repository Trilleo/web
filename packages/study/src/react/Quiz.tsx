/**
 * A lesson's quiz. Questions are checked in the browser with the same code the
 * build used to read them (quiz.ts); the answer and its explanation open below each
 * one. Without JavaScript the questions still show, and "Show answer" still opens.
 */
import { useState, type ReactNode } from "react";
import { checkAnswer, type CheckResult } from "../quiz";
import type { QuizProps, QuizQuestion } from "../types";

const PLACEHOLDERS = {
  number: "A number and its unit, e.g. 0.5 A",
  expression: "An expression, e.g. 2x + 1",
  text: "Your answer",
} as const;

function html(content: string) {
  return { __html: content };
}

function Question({
  question,
  index,
  quizId,
  onResult,
}: {
  question: QuizQuestion;
  index: number;
  quizId: string;
  onResult: (result: CheckResult, response: string) => void;
}) {
  const [typed, setTyped] = useState("");
  const [chosen, setChosen] = useState<number[]>([]);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [open, setOpen] = useState(false);
  const id = `${quizId}-q${String(index + 1)}`;
  const isChoice = question.kind === "choice" || question.kind === "multiple";

  const check = () => {
    const next = checkAnswer(question.check, isChoice ? chosen : typed);
    setResult(next);
    // Choices are kept as their numbers ("#1,#3"), so the mistake log can show them.
    if (!next.message)
      onResult(
        next,
        isChoice
          ? [...chosen]
              .sort((a, b) => a - b)
              .map((option) => `#${String(option + 1)}`)
              .join(",")
          : typed.trim(),
      );
  };
  const toggle = (option: number) => {
    setResult(null);
    setChosen((current) =>
      question.kind === "multiple"
        ? current.includes(option)
          ? current.filter((value) => value !== option)
          : [...current, option]
        : [option],
    );
  };
  const state =
    result && !result.message
      ? result.correct
        ? "right"
        : "wrong"
      : undefined;

  return (
    <li className="study-question" data-state={state}>
      <div className="study-question-head">
        <span className="study-question-number">{index + 1}</span>
        <div
          id={`${id}-prompt`}
          className="study-question-prompt"
          dangerouslySetInnerHTML={html(question.prompt)}
        />
      </div>
      {isChoice ? (
        <fieldset className="study-options" aria-labelledby={`${id}-prompt`}>
          {question.kind === "multiple" && (
            <p className="study-options-hint">Choose every right answer.</p>
          )}
          {question.options.map((option, optionIndex) => (
            <label key={optionIndex} className="study-option">
              <input
                type={question.kind === "multiple" ? "checkbox" : "radio"}
                // Empty for options with text of their own.
                aria-label={
                  question.optionLabels[optionIndex] === ""
                    ? undefined
                    : question.optionLabels[optionIndex]
                }
                name={id}
                checked={chosen.includes(optionIndex)}
                onChange={() => {
                  toggle(optionIndex);
                }}
              />
              <span dangerouslySetInnerHTML={html(option)} />
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="study-response">
          <label htmlFor={`${id}-input`} className="sr-only">
            Your answer to question {index + 1}
          </label>
          <input
            id={`${id}-input`}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={
              PLACEHOLDERS[question.kind as keyof typeof PLACEHOLDERS]
            }
            value={typed}
            onChange={(event) => {
              setTyped(event.currentTarget.value);
              setResult(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                check();
              }
            }}
          />
        </div>
      )}
      <div className="study-question-actions">
        <button type="button" className="study-button" onClick={check}>
          Check
        </button>
        <p className="study-feedback" aria-live="polite">
          {result &&
            (result.message ??
              (result.correct
                ? "Right."
                : "Not quite. Try again, or open the answer."))}
        </p>
      </div>
      <details
        className="study-answer"
        open={open}
        onToggle={(event) => {
          setOpen(event.currentTarget.open);
        }}
      >
        <summary>Show answer</summary>
        <p>
          <span className="study-answer-label">Answer</span>{" "}
          <span dangerouslySetInnerHTML={html(question.answer)} />
        </p>
        {question.explanation && (
          <div dangerouslySetInnerHTML={html(question.explanation)} />
        )}
      </details>
    </li>
  );
}

export interface QuizHandlers {
  /** Each checked answer (not ones refused unread, like an empty field). */
  onAttempt?: (
    question: QuizQuestion,
    correct: boolean,
    response: string,
  ) => void;
  /** Shown under the title (where answers are kept). */
  note?: ReactNode;
}

export function Quiz({
  id,
  title,
  questions,
  onAttempt,
  note,
}: Omit<QuizProps, "subject" | "lesson"> & QuizHandlers) {
  // First attempt per question counts for the score; later tries don't change it.
  const [scores, setScores] = useState<Record<number, boolean>>({});
  const answered = Object.keys(scores).length;
  const right = Object.values(scores).filter(Boolean).length;
  return (
    <section id={id} className="study-quiz" aria-labelledby={`${id}-title`}>
      <div className="study-quiz-head">
        <p id={`${id}-title`} className="study-quiz-title">
          <span className="study-box-kind">Quiz</span> {title}
        </p>
        <p className="study-quiz-score" aria-live="polite">
          {answered === 0
            ? `${String(questions.length)} ${questions.length === 1 ? "question" : "questions"}`
            : `${String(right)} of ${String(answered)} right first time`}
        </p>
        {note && <p className="study-quiz-note">{note}</p>}
      </div>
      <ol className="study-questions">
        {questions.map((question, index) => (
          <Question
            key={index}
            question={question}
            index={index}
            quizId={id}
            onResult={(result, response) => {
              onAttempt?.(question, result.correct, response);
              setScores((current) =>
                index in current
                  ? current
                  : { ...current, [index]: result.correct },
              );
            }}
          />
        ))}
      </ol>
    </section>
  );
}
