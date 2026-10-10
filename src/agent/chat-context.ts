"use client";
import { createContext } from "react";
import type { ChatRun } from "./schema";
export const RunsContext = createContext<ChatRun[]>([]);
export const RecoveryContext = createContext(false);
