import type { JSX } from "react";

export type FeedbackKind = "error" | "success" | "info";

export interface Feedback {
  readonly message: string;
  readonly kind: FeedbackKind;
}

interface FeedbackAlertProps {
  readonly feedback: Feedback;
}

export function FeedbackAlert({ feedback }: FeedbackAlertProps): JSX.Element {
  return (
    <p
      role={feedback.kind === "error" ? "alert" : "status"}
      className={`feedback-alert feedback-alert--${feedback.kind}`}
    >
      {feedback.message}
    </p>
  );
}
