import fetch from "node-fetch";

async function probe() {
  const urls = [
    "https://suncore.master-viethiepho.workers.dev/TTTHL.zip",
    "https://suncore.master-viethiepho.workers.dev/download/TTTHL",
    "https://suncore.master-viethiepho.workers.dev/download?game_id=TTTHL",
    "https://suncore.master-viethiepho.workers.dev/games/TTTHL.zip",
    "https://suncore.master-viethiepho.workers.dev/get_game?game_id=TTTHL",
    "https://suncore.master-viethiepho.workers.dev/api/download/TTTHL"
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "GET" });
      console.log(`GET ${url} -> Status: ${res.status}, Type: ${res.headers.get("content-type")}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`  Preview: ${text.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`GET ${url} failed:`, e.message);
    }
  }
}
probe();
