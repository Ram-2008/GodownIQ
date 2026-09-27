import "dotenv/config";
import { HindsightClient } from "@vectorize-io/hindsight-client";

async function main() {
  const apiKey = process.env.HINDSIGHT_API_KEY;
  const baseUrl = process.env.HINDSIGHT_API_URL;

  if (!apiKey || !baseUrl) {
    throw new Error("backend/.env lo Hindsight API key and URL add cheyyi.");
  }

  const client = new HindsightClient({ baseUrl, apiKey });

  // Separate bank for synthetic test data.
  const bankId = `${
    process.env.HINDSIGHT_BANK_ID || "godowniq-demo"
  }-connection-test`;

  const recallOnly = process.argv.includes("--recall-only");

  if (!recallOnly) {
    await client.createBank(bankId, {});

    console.log("Saving demo incident...");

    await client.retain(
      bankId,
      "Synthetic demo incident: Supplier Demo Traders delivered " +
        "100 rice bags three days late. Ten bags were damaged. " +
        "The damaged bags were resolved with a credit note.",
      {
        documentId: "godowniq-connection-test-001",
        async: false,
      }
    );

    console.log("Memory saved.");
  }

  console.log("Recalling supplier history...");

  const response = await client.recall(
    bankId,
    "What went wrong with Demo Traders and how was it resolved?"
  );

  if (!response.results.length) {
    throw new Error("No memories returned. Run the recall command again.");
  }

  for (const memory of response.results) {
    console.log("-", memory.text);
  }

  console.log("SUCCESS: Hindsight recalled saved memory.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const key = process.env.HINDSIGHT_API_KEY;
  console.error("Test failed:", key ? message.split(key).join("[REDACTED]") : message);
  process.exitCode = 1;
});