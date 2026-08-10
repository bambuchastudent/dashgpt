const url = "https://dashgpt.dimkashir.workers.dev/api/storage/github/status";
const response = await fetch(url, { headers: { accept: "application/json" } });
const text = await response.text();
console.log(`GET ${url} -> ${response.status}`);
console.log(text);
if (!response.ok) process.exit(1);
const payload = JSON.parse(text);
if (payload.configured !== true) {
  console.error("Expected production GitHub storage to report configured=true");
  process.exit(1);
}
console.log("Production GitHub storage is configured.");
