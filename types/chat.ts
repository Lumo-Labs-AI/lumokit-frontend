export type MessageType = "user" | "ai";

export interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: Date;
  hasCode?: boolean;
  code?: string;
}

export interface Conversation {
  conversation_key: string;
  last_message_preview: string;
  timestamp: string;
}

export interface ApiMessage {
  id: number;
  message: string;
  response: string;
  timestamp: string;
}

export interface ChatApiRequest {
  public_key: string;
  signature: string;
  agent_public: string | null;
  agent_private: string | null;
  conversation_key: string | null;
  message: string;
  model_name?: string;
  temperature?: number;
  tools?: string[];
}

export interface ConversationKeyResponse {
  conversation_key: string;
}
