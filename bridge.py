import os
from pathlib import Path

import requests
import urllib3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

LOCKFILE = Path(r"C:\Riot Games\League of Legends\lockfile")
FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:3000",
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

def load_champion_names():
    try:
        versions = requests.get(
            "https://ddragon.leagueoflegends.com/api/versions.json",
            timeout=10,
        )
        versions.raise_for_status()
        version = versions.json()[0]

        response = requests.get(
            f"https://ddragon.leagueoflegends.com/cdn/"
            f"{version}/data/ko_KR/champion.json",
            timeout=10,
        )
        response.raise_for_status()

        champions = response.json()["data"]
        return {
            champion["key"]: champion["name"]
            for champion in champions.values()
        }
    except (requests.RequestException, KeyError, IndexError):
        return {}

CHAMPION_NAMES = load_champion_names()

def champion_name(champion_id):
    if not champion_id:
        return "미선택"
    return CHAMPION_NAMES.get(
        str(champion_id),
        f"챔피언 ID {champion_id}",
    )

def summarize_team(team):
    return [
        {
            "champion": champion_name(player.get("championId")),
            "position": player.get("assignedPosition") or "포지션 미정",
        }
        for player in team
    ]

@app.get("/api/draft")
def get_draft():
    if not LOCKFILE.exists():
        raise HTTPException(
            status_code=503,
            detail="League Client lockfile을 찾지 못했습니다.",
        )

    try:
        parts = LOCKFILE.read_text(encoding="utf-8").strip().split(":")
        if len(parts) < 5:
            raise HTTPException(
                status_code=503,
                detail="lockfile 형식을 읽지 못했습니다.",
            )

        _, _, port, token, protocol = parts[:5]
        url = (
            f"{protocol}://127.0.0.1:{port}"
            "/lol-champ-select/v1/session"
        )

        response = requests.get(
            url,
            auth=("riot", token),
            verify=False,
            timeout=3,
        )

        if response.status_code == 404:
            return {
                "inChampSelect": False,
                "message": "현재 챔피언 선택 세션이 없습니다.",
            }

        response.raise_for_status()
        data = response.json()

        timer = data.get("timer") or {}
        bans = data.get("bans") or {}

        return {
            "inChampSelect": True,
            "phase": timer.get("phase", "단계 정보 없음"),
            "myTeam": summarize_team(data.get("myTeam", [])),
            "theirTeam": summarize_team(data.get("theirTeam", [])),
            "myTeamBans": [
                champion_name(champ_id)
                for champ_id in bans.get("myTeamBans", [])
            ],
            "theirTeamBans": [
                champion_name(champ_id)
                for champ_id in bans.get("theirTeamBans", [])
            ],
        }

    except requests.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"LCU 연결 실패: {e}",
        )
