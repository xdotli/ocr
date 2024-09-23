"use client";

import { useState } from "react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";

export default function UnstructuredInput() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useZerox, setUseZerox] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const apiEndpoint = useZerox ? "/api/zerox" : "/api/unstructured";
      const response = await fetch(
        `${apiEndpoint}?url=${encodeURIComponent(url)}`,
      );
      const data = await response.json();

      if (response.ok) {
        setResult(JSON.stringify(data, null, 2));
      } else {
        setError(data.error || "An unknown error occurred");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Error fetching data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="use-zerox"
          checked={useZerox}
          onCheckedChange={setUseZerox}
        />
        <Label htmlFor="use-zerox">Use Zerox</Label>
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? "Loading..." : "Submit"}
        </Button>
      </div>
      {error && <div className="text-red-500">{JSON.stringify(error)}</div>}
      {result && (
        <pre className="overflow-auto rounded-md bg-gray-100 p-4">{result}</pre>
      )}
    </div>
  );
}
