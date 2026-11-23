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

type RoleId = "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";

type DraftSlot = {
  player?: Player;
  temporary?: boolean;
};

const BRIDGE_URL = "http://127.0.0.1:8787/api/draft";

const ROLES: { id: RoleId; label: string; sublabel: string }[] = [
  { id: "TOP", label: "TOP", sublabel: "탑" },
  { id: "JUNGLE", label: "JUNGLE", sublabel: "정글" },
  { id: "MID", label: "MID", sublabel: "미드" },
  { id: "ADC", label: "ADC", sublabel: "바텀" },
  { id: "SUPPORT", label: "SUPPORT", sublabel: "서포터" },
];

function positionToRole(position?: string): RoleId | null {
  const value = (position ?? "").trim().toLowerCase();

  if (value === "top") return "TOP";
  if (value === "jungle") return "JUNGLE";
  if (value === "middle" || value === "mid") return "MID";
  if (value === "bottom" || value === "adc") return "ADC";
  if (value === "utility" || value === "support") return "SUPPORT";

  return null;
}

function makeSlots(players: Player[] = []): Record<RoleId, DraftSlot> {
  const slots: Record<RoleId, DraftSlot> = {
    TOP: {},
    JUNGLE: {},
    MID: {},
    ADC: {},
    SUPPORT: {},
  };

  const unassigned: Player[] = [];

  for (const player of players) {
    const role = positionToRole(player.position);

    if (role && !slots[role].player) {
      slots[role] = { player };
    } else {
      unassigned.push(player);
    }
  }

  for (const player of unassigned) {
    const emptyRole = ROLES.find((role) => !slots[role.id].player);

    if (emptyRole) {
      slots[emptyRole.id] = { player, temporary: true };
    }
  }

  return slots;
}

function TeamBoard({
  title,
  sideLabel,
  players,
  bans,
  accent,
}: {
  title: string;
  sideLabel: string;
  players: Player[];
  bans: string[];
  accent: "blue" | "red";
}) {
  const slots = makeSlots(players);
  const accentText = accent === "blue" ? "text-sky-300" : "text-rose-300";
  const accentBorder =
    accent === "blue" ? "border-sky-500/30" : "border-rose-500/30";
  const accentGlow =
    accent === "blue" ? "bg-sky-400" : "bg-rose-400";

  return (
    <section className={`rounded-2xl border ${accentBorder} bg-slate-900/90 p-4`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className={`text-xs font-bold tracking-[0.2em] ${accentText}`}>
            {sideLabel}
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">{title}</h2>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${accentGlow}`} />
      </div>

      <div className="space-y-2">
        {ROLES.map((role) => {
          const slot = slots[role.id];
          const player = slot.player;
          const picked = player && player.champion !== "미선택";

          return (
            <div
              key={role.id}
              className="flex min-h-[68px] items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2"
            >
              <div className="w-[76px] shrink-0">
                <div className="text-xs font-bold tracking-wide text-slate-200">
                  {role.label}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {role.sublabel}
                </div>
              </div>

              <div className="h-9 w-px bg-slate-700" />

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {picked ? player.champion : "픽 대기"}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {slot.temporary
                    ? "포지션 정보 없음 · 임시 배치"
                    : picked
                      ? "챔피언 선택 완료"
                      : "아직 선택되지 않음"}
                </div>
              </div>

              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  picked
                    ? accent === "blue"
                      ? "bg-sky-400/15 text-sky-200"
                      : "bg-rose-400/15 text-rose-200"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {picked ? player.champion.slice(0, 1) : "—"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-800 pt-3">
        <div className="mb-2 text-xs font-semibold text-slate-400">밴 챔피언</div>
        <div className="flex min-h-7 flex-wrap gap-1.5">
          {bans.length > 0 ? (
            bans.map((champion, index) => (
              <span
                key={`${champion}-${index}`}
                className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300"
              >
                {champion}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-600">아직 밴 없음</span>
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
          throw new Error(data.detail ?? "브리지 응답 오류");
        }

        if (active) {
          setDraft(data);
          setError("");
          setUpdatedAt(new Date().toLocaleTimeString());
        }
      } catch {
        if (active) {
          setError("로컬 브리지에 연결할 수 없습니다.");
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
    <main className="min-h-screen bg-[#080d18] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-indigo-300">
              LOLREC
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">밴픽 추천</h1>
            <p className="mt-1 text-sm text-slate-400">
              현재 조합과 상대 픽을 확인하고 다음 선택을 준비하세요.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
            <span
              className={`h-2 w-2 rounded-full ${
                error ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            {error ? "연결 확인 필요" : "밴픽 데이터 연결"}
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">
            {error} `bridge.py`가 실행 중인지 확인해 주세요.
          </div>
        )}

        {!draft?.inChampSelect && !error && (
          <div className="mb-5 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
            {draft?.message ?? "밴픽 정보를 불러오는 중입니다."}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/10 to-slate-900 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-indigo-300">
                  PICK ANALYSIS
                </p>
                <h2 className="mt-2 text-xl font-bold">추천 픽</h2>
                <p className="mt-1 text-sm text-slate-400">
                  다음 선택에 도움이 될 후보와 추천 이유가 이곳에 표시됩니다.
                </p>
              </div>

              <span className="rounded-full border border-indigo-300/20 bg-indigo-300/10 px-3 py-1.5 text-xs font-semibold text-indigo-200">
                {draft?.phase ?? "밴픽 대기"}
              </span>
            </div>

            <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-5">
              <div className="text-sm font-semibold text-slate-200">
                추천 모델 연결 전
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                실시간 밴픽 정보는 연결되어 있지만, 추천 후보와 근거를 만들
                모델/API는 아직 연결되지 않았습니다. 모델을 연결하면 이 영역에
                추천 결과가 표시됩니다.
              </p>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {["아군 조합 분석", "상대 픽 대응", "포지션별 후보"].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3 text-center text-xs text-slate-400"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-slate-500">
                  LIVE DRAFT
                </p>
                <h2 className="mt-1 text-xl font-bold">현재 밴픽</h2>
              </div>
              <p className="text-xs text-slate-500">
                갱신: {updatedAt || "—"}
              </p>
            </div>

            <div className="space-y-4">
              <TeamBoard
                title="블루 팀"
                sideLabel="BLUE SIDE"
                players={draft?.myTeam ?? []}
                bans={draft?.myTeamBans ?? []}
                accent="blue"
              />
              <TeamBoard
                title="레드 팀"
                sideLabel="RED SIDE"
                players={draft?.theirTeam ?? []}
                bans={draft?.theirTeamBans ?? []}
                accent="red"
              />
            </div>
          </section>
        </div>

        <footer className="mt-6 text-center text-xs text-slate-600">
          밴픽 데이터는 로컬 브리지에서 가져옵니다.
        </footer>
      </div>
    </main>
  );
}
