// src/types.ts
import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

export interface MySessionData {
  tokenBase?: string;
  tokenQuote?: string;
}

// Extend Context to include session
export interface MyContext extends Context<Update> {
  session: MySessionData;
}
