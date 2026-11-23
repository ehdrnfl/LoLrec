from pathlib import Path
import time
import requests
import urllib3

# 설치 위치가 다르면 이 경로를 수정하세요.
LOCKFILE = Path(r"C:\Riot Games\League of Legends\lockfile")

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Data Dragon에서 챔피언 ID → 한국어 이름 사전을 한 번 가져옵니다.
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

        champion_data = response.json()["data"]
        return {
            champion["key"]: champion["name"]
            for champion in champion_data.values()
        }
    except (requests.RequestException, KeyError, IndexError) as e:
        print(f"챔피언 이름 목록을 가져오지 못했습니다: {e}")
        return {}

champion_names = load_champion_names()

def champion_name(champion_id):
    if not champion_id:
        return "미선택"
    return champion_names.get(
        str(champion_id),
        f"이름 확인 불가 (ID: {champion_id})",
    )

if not LOCKFILE.exists():
    raise SystemExit(
        f"lockfile을 찾지 못했습니다: {LOCKFILE}\n"
        "League of Legends 설치 폴더 안의 lockfile 경로를 확인하세요."
    )

# lockfile 형식: 프로세스명:PID:포트:토큰:프로토콜
parts = LOCKFILE.read_text(encoding="utf-8").strip().split(":")
if len(parts) < 5:
    raise SystemExit("lockfile 형식을 읽지 못했습니다.")

_, _, port, token, protocol = parts[:5]
url = f"{protocol}://127.0.0.1:{port}/lol-champ-select/v1/session"

print(f"LCU_PORT: {port}")
print("LCU_TOKEN: 읽음 (화면에는 표시하지 않음)")
print("밴픽 세션 조회 중 — 종료하려면 Ctrl+C를 누르세요.")

last_output = None

def team_summary(team):
    return [
        {
            "champion": champion_name(player.get("championId")),
            "position": player.get("assignedPosition") or "미정",
        }
        for player in team
    ]

while True:
    try:
        response = requests.get(
            url,
            auth=("riot", token),
            verify=False,
            timeout=3,
        )

        if response.status_code == 404:
            output = "현재 챔피언 선택 세션이 없습니다."
        else:
            response.raise_for_status()
            data = response.json()

            timer = data.get("timer") or {}
            bans = data.get("bans") or {}

            output = {
                "phase": timer.get("phase", "정보 없음"),
                "myTeam": team_summary(data.get("myTeam", [])),
                "theirTeam": team_summary(data.get("theirTeam", [])),
                "myTeamBans": [
                    champion_name(champ_id)
                    for champ_id in bans.get("myTeamBans", [])
                ],
                "theirTeamBans": [
                    champion_name(champ_id)
                    for champ_id in bans.get("theirTeamBans", [])
                ],
            }

        text = str(output)
        if text != last_output:
            print("\n", output)
            last_output = text

    except requests.exceptions.ConnectionError:
        print("LCU 연결 실패 — 클라이언트가 실행 중인지 확인하세요.")
        break
    except requests.exceptions.HTTPError as e:
        print(f"LCU 응답 오류: {e}")
        break
    except KeyboardInterrupt:
        print("\n종료합니다.")
        break
