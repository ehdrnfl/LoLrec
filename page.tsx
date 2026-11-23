"use client";

import { useEffect, useState } from "react";

type Player = {
  champion: string;
  position: string;
};

type DraftData = {
  inChampSelect: boolean;
  message?: string;
  phase?: string;
  myTeam?: Player[];
  theirTeam?: Player[];
  myTeamBans?: string[];
  theirTeamBans?: string[];
};

const BRIDGE_URL = "http://127.0.0.1:8787/api/draft";

function TeamPanel({
  title,
  players,
  bans,
}: {
  title: string;
  players: Player[];
  bans: string[];
}) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>

      <div className="space-y-3">
        {players.map((player, index) => (
          <div
            key={`${player.position}-${index}`}
            className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3"
          >
            <span className="font-medium">{player.champion}</span>
            <span className="text-sm text-slate-400">
              {player.position}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold text-slate-400">밴</h3>
        <div className="flex flex-wrap gap-2">
          {bans.length > 0 ? (
            bans.map((champion, index) => (
              <span
                key={`${champion}-${index}`}
                className="rounded-full bg-rose-950 px-3 py-1 text-sm text-rose-200"
              >
                {champion}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">아직 밴 없음</span>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch(BRIDGE_URL, { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail ?? "로컬 브리지 응답 오류");
        }

        if (active) {
          setDraft(data);
          setError("");
          setUpdatedAt(new Date().toLocaleTimeString());
        }
      } catch {
        if (active) {
          setError(
            "로컬 브리지에 연결할 수 없습니다. bridge.py가 실행 중인지 확인하세요."
          );
        }
      }
    }

    refresh();
    const timer = window.setInterval(refresh, 1500);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
            Live Draft Monitor
          </p>
          <h1 className="mt-2 text-3xl font-bold">실시간 밴픽 현황</h1>
          <p className="mt-2 text-sm text-slate-400">
            화면은 약 1.5초 간격으로 갱신됩니다.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-amber-700 bg-amber-950/50 p-4 text-amber-200">
            {error}
          </div>
        ) : !draft ? (
          <div className="rounded-xl bg-slate-900 p-5 text-slate-300">
            LCU 연결 확인 중…
          </div>
        ) : !draft.inChampSelect ? (
          <div className="rounded-xl bg-slate-900 p-5 text-slate-300">
            {draft.message}
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-900 p-4">
              <span>
                진행 단계:{" "}
                <strong className="text-indigo-300">{draft.phase}</strong>
              </span>
              <span className="text-sm text-slate-400">
                마지막 갱신: {updatedAt}
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <TeamPanel
                title="우리 팀"
                players={draft.myTeam ?? []}
                bans={draft.myTeamBans ?? []}
              />
              <TeamPanel
                title="상대 팀"
                players={draft.theirTeam ?? []}
                bans={draft.theirTeamBans ?? []}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
