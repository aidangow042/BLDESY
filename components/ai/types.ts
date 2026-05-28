/** Shared types for the AI Assist chat UI. */

export interface BuilderRec {
  id: string;
  business_name: string;
  trade_category: string;
  suburb: string;
  postcode?: string | null;
  profile_photo_url?: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  builders?: BuilderRec[];
  searchParams?: Record<string, string>;
}
