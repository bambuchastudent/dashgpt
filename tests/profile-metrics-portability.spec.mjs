import { expect, test } from "./playwright-fixture.mjs";
import { createVault, exportVaultBundle, importVaultBundle } from "../demo/vault.js";
import { appendProjectMetricsRevision, currentProjectMetrics } from "../demo/profile-metrics.js";
import { vaultFromObjects, vaultToObjects } from "../src/vault-layout.js";

const NOW = "2026-08-13T12:00:00.000Z";

test("project money metrics survive Vault and object-layout round trips", () => {
  const vault = createVault({ vaultId: "vault_f27_portability", createdAt: NOW });
  appendProjectMetricsRevision(vault, { currency: "EUR", spentMinor: 2500, donatedMinor: 750 }, { profileRevisionId: "profile_metrics_f27", updatedAt: NOW });

  const bundleRoundTrip = importVaultBundle(exportVaultBundle(vault));
  expect(currentProjectMetrics(bundleRoundTrip)).toMatchObject({ currency: "EUR", spentMinor: 2500, donatedMinor: 750 });

  const objects = vaultToObjects(vault, "DashGPT");
  expect(objects.some(object => object.path === "DashGPT/profile/profile_metrics_f27.json")).toBe(true);
  const objectRoundTrip = vaultFromObjects(objects, "DashGPT");
  expect(currentProjectMetrics(objectRoundTrip)).toMatchObject({ currency: "EUR", spentMinor: 2500, donatedMinor: 750 });
});
