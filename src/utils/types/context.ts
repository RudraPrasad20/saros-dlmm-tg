import { Context } from "telegraf";
import { Update } from "telegraf/typings/core/types/typegram";

export interface MySessionData {
  tokenBase?: string;
  tokenQuote?: string;
}

export interface MyContext extends Context<Update> {
  session: MySessionData;
}
