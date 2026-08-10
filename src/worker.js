import coreWorker from "./index.js";
import {
  handleGitHubDisconnect,
  handleGitHubPairStart,
  handleGitHubSetup,
  handleGitHubStatus,
  handleGitHubSync
} from "./github-storage.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/storage/github/pair") return handleGitHubPairStart(request, env);
    if (url.pathname === "/api/storage/github/setup") return handleGitHubSetup(request, env);
    if (url.pathname === "/api/storage/github/status") return handleGitHubStatus(request, env);
    if (url.pathname === "/api/storage/github/sync") return handleGitHubSync(request, env);
    if (url.pathname === "/api/storage/github/disconnect") return handleGitHubDisconnect(request, env);

    return coreWorker.fetch(request, env, ctx);
  }
};
