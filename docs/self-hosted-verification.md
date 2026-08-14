# DashGPT self-hosted verification

The canonical `npm run verify:full` GitHub Actions job runs on the dedicated
repository-level macOS runner selected by all of these labels:

```text
self-hosted, macOS, ARM64, dashgpt
```

The runner is installed outside every DashGPT checkout at:

```text
/Users/A12674683/development/github-runners/dashgpt
```

It uses the official GitHub Actions runner package and its macOS `svc.sh`
LaunchAgent flow in the owning user's context. Do not commit runner
registration files, service files, credentials, tokens, `_work`, or diagnostic
logs to this repository.

## Security boundary

Self-hosted jobs execute repository code on the local Mac. The workflow uses
`pull_request`, never `pull_request_target`, keeps `contents: read`, and allows
the self-hosted job only for repository-owner activity. Pull requests from
forks and activity initiated by another actor are skipped, so arbitrary
untrusted code is not automatically executed on this Mac.

This restriction is part of the security boundary. Do not relax it merely to
make an external pull request green. Review the code and use a trusted
repository-owner branch when verification is intended.

The runner must remain dedicated to DashGPT. Do not add labels that let other
repositories target it, and do not place secrets, browser profiles, or other
repository checkouts inside its installation or `_work` directories.

## Operational checks

From the runner directory, the official service can be inspected with:

```bash
./svc.sh status
```

Repository runner status and labels are visible under GitHub repository
Settings → Actions → Runners. A successful canonical workflow run must show
runner name `dashgpt-mac` and execute `npm run verify:full`.
