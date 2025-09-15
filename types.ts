// FIX: Removed a circular self-import of `MessageAuthor`. A file cannot import a type that it is also defining.
export enum MessageAuthor {
  USER = 'user',
  AI = 'ai',
}

export interface Message {
  id: string;
  text: string;
  author: MessageAuthor;
  file?: {
    name: string;
    type: string;
    url: string; // Used for local preview URLs
  };
}