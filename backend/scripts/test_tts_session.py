"""End-to-end test script for the TTS interview session (mock mode).

Bypasses VAD/STT by sending text answers directly over WebSocket.

Usage:
    python scripts/test_tts_session.py <job_key>
"""

from __future__ import annotations

import asyncio
import json
import sys

import httpx
import websockets

API_BASE = "http://localhost:8000"
WS_BASE = "ws://localhost:8000"

# Fake answers sent for each question
MOCK_ANSWER = "J'ai une bonne expérience sur ce sujet, je maîtrise les concepts fondamentaux et j'ai déjà mis en pratique ces compétences dans des projets professionnels."


async def main(job_key: str) -> None:
    async with httpx.AsyncClient(base_url=API_BASE, timeout=60.0) as client:
        # 1. Create session
        print("[1/3] Creating session...")
        resp = await client.post("/interview/sessions", params={"job_key": job_key})
        resp.raise_for_status()
        session_data = resp.json()
        session_id = session_data["session_id"]
        print(f"      session_id : {session_id}")
        print(f"      questions  : {session_data['total_questions']}")

        # 2. Join session (bypass CV)
        print("\n[2/3] Joining session...")
        resp = await client.post(
            f"/interview/sessions/{session_id}/join",
            params={"profile_reference": "f3b7171b-0ab7-4b45-bbe2-a887b0fd83cd"},
        )
        resp.raise_for_status()
        ws_url = resp.json()["ws_url"]
        print(f"      ws_url: {ws_url}")

    # 3. Connect WebSocket
    print("\n[3/3] Running interview (mock mode)...")
    print("=" * 60)

    async with websockets.connect(f"{WS_BASE}{ws_url}", max_size=50 * 1024 * 1024) as ws:
        while True:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=120.0)
            except asyncio.TimeoutError:
                print("\n[TIMEOUT] No message received in 120s")
                break

            data = json.loads(raw)
            msg_type = data.get("type", "unknown")

            if msg_type == "audio_chunk":
                idx = data.get("chunk_index", 0)
                total = data.get("total_chunks", 1)
                if idx == 0:
                    print(f"[audio]         receiving {total} chunks...")
                elif idx == total - 1:
                    print(f"[audio]         ✓ done ({total} chunks)")

            elif msg_type == "state_change":
                state = data.get("state", "?")
                print(f"[state]         → {state}")

                if state == "listening":
                    # Send mock text answer instead of real audio
                    await asyncio.sleep(0.3)  # small delay to feel natural
                    await ws.send(json.dumps({
                        "type": "mock_answer",
                        "text": MOCK_ANSWER,
                    }))
                    print(f"[mock_answer]   sent: \"{MOCK_ANSWER[:60]}...\"")

                elif state == "done":
                    total_answers = data.get("total_answers", "?")
                    print(f"\n{'=' * 60}")
                    print(f"Interview terminé — {total_answers} réponses enregistrées.")
                    break

            elif msg_type == "question_text":
                print(f"[question]      {data.get('text', '')}")

            elif msg_type == "transcript":
                print(f"[transcript]    {data.get('text', '')}")

            elif msg_type == "error":
                print(f"[ERROR]         {data.get('message', data)}")
                break

    print("\nDone.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: python {sys.argv[0]} <job_key>")
        sys.exit(1)

    asyncio.run(main(sys.argv[1]))
