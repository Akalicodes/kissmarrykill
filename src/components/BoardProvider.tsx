"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Leaderboard } from "@/lib/types";

type MyVote = { kiss: string; marry: string; kill: string } | null;

type BoardState = {
  leaderboard: Leaderboard | null;
  myVote: MyVote;
  demoMode: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
  setLocal: (next: { leaderboard: Leaderboard; myVote: MyVote }) => void;
};

const Ctx = createContext<BoardState | null>(null);

const POLL_MS = 8_000;
const LOCAL_VOTED_KEY = "kmkai_voted_month";

/**
 * Provides live board state to the rest of the page.
 * - Initial fetch happens on mount.
 * - Polls every 8s for that "live" feel (cheap and good enough for v1;
 *   swap for Supabase Realtime later when traffic justifies it).
 */
export function BoardProvider({ children }: { children: ReactNode }) {
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [myVote, setMyVote] = useState<MyVote>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const aborter = useRef<AbortController | null>(null);

  const refetch = useCallback(async () => {
    aborter.current?.abort();
    const ac = new AbortController();
    aborter.current = ac;
    try {
      const res = await fetch("/api/leaderboard", {
        cache: "no-store",
        signal: ac.signal,
      });
      if (!res.ok) return;
      const data = await res.json();
      setLeaderboard(data.leaderboard);
      setDemoMode(!!data.demoMode);
      // Server is the source of truth for "have I voted". Fall back to
      // localStorage flag for snappier first paint after voting.
      if (data.myVote) {
        setMyVote(data.myVote);
      } else {
        const localMonth = typeof window !== "undefined"
          ? window.localStorage.getItem(LOCAL_VOTED_KEY)
          : null;
        if (localMonth && localMonth === data.leaderboard?.month) {
          // server says no but local says yes — trust server, clear stale.
          window.localStorage.removeItem(LOCAL_VOTED_KEY);
        }
        setMyVote(null);
      }
    } catch (e) {
      // Suppress aborted-request noise — some browsers throw TypeError instead of AbortError
      if (!ac.signal.aborted && (e as Error).name !== "AbortError") {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const t = setInterval(refetch, POLL_MS);
    return () => clearInterval(t);
  }, [refetch]);

  const setLocal = useCallback(
    (next: { leaderboard: Leaderboard; myVote: MyVote }) => {
      setLeaderboard(next.leaderboard);
      setMyVote(next.myVote);
      if (next.myVote && typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_VOTED_KEY, next.leaderboard.month);
      }
    },
    [],
  );

  const value = useMemo<BoardState>(
    () => ({ leaderboard, myVote, demoMode, loading, refetch, setLocal }),
    [leaderboard, myVote, demoMode, loading, refetch, setLocal],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBoard() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBoard must be used inside <BoardProvider>");
  return v;
}
