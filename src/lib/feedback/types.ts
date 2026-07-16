export type FeedbackStatus = "loading" | "success" | "error" | "info";

export interface FeedbackNoticeInput {
  status: FeedbackStatus;
  title: string;
  description?: string;
  duration?: number;
}
