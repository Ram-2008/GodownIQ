import { useState } from "react";
import { Button } from "./ui/Button";
import { FirstTimeHint } from "./FirstTimeHint";
import { useToast } from "./Toast";
import { nlEntryApi, NlParseResult } from "../api/nlEntry";
import { ApiClientError } from "../api/client";

export function NlQuickEntry({ onParsed }: { onParsed: (result: NlParseResult) => void }) {
  const { show } = useToast();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleParse() {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await nlEntryApi.parse(text.trim());
      onParsed(result);
      setText("");
      show("Parsed — check the details below and save.", "success");
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Couldn't parse that. Please fill the form manually.";
      show(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <FirstTimeHint id="nl-entry">
        Type a purchase in plain words (Hinglish is fine) and tap Parse — it'll fill the form below for you to check and save.
      </FirstTimeHint>
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Or describe it</div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleParse();
          }}
          placeholder='e.g. "bought 50kg chawal for 2200 from Sharma traders pending"'
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button type="button" variant="secondary" loading={loading} onClick={handleParse}>
          Parse
        </Button>
      </div>
    </div>
  );
}
