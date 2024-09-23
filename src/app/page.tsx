"use client";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import ReactMarkdown from "react-markdown";
import { Loader2, CheckCircle, Download, Eye } from "lucide-react";
import { UploadDropzone } from "~/utils/uploadthing";

type FileData = {
  name: string;
  url: string;
};

type OCRResult = {
  content: string;
  time: number | null;
};

type OCRResults = {
  zerox: OCRResult;
  unstructured: OCRResult;
};

type UploadStatus =
  | "idle"
  | "uploading"
  | "uploaded"
  | "processing"
  | "processed"
  | "error";

const initialOCRResults: OCRResults = {
  zerox: { content: "", time: null },
  unstructured: { content: "", time: null },
};

export default function OcrComparisonTool() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [ocrResults, setOcrResults] = useState<OCRResults[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    tokensUsed: 0,
    totalCost: 0,
    latency: 0,
  });
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [activeTab, setActiveTab] = useState<keyof OCRResults>("zerox");

  const processOCR = async () => {
    if (files.length === 0) return;

    setUploadStatus("processing");

    try {
      const newOcrResults = await Promise.all(
        files.map(async (file) => {
          const results: OCRResults = { ...initialOCRResults };

          // Process with Zerox
          const zeroxStartTime = performance.now();
          console.log("url", file.url);

          const zeroxResponse = await fetch(`/api/zerox?url=${file.url}`);
          const zeroxData = await zeroxResponse.json();
          const zeroxEndTime = performance.now();
          results.zerox = {
            content: zeroxData?.result,
            time: (zeroxEndTime - zeroxStartTime) / 1000,
          };

          // Process with Unstructured
          const unstructuredStartTime = performance.now();
          const unstructuredResponse = await fetch(
            `/api/unstructured?url=${file.url}`,
          );
          const unstructuredData = await unstructuredResponse.json();
          const unstructuredEndTime = performance.now();
          results.unstructured = {
            content: unstructuredData
              .map((item: any) => item.text)
              .join("\n\n"),
            time: (unstructuredEndTime - unstructuredStartTime) / 1000,
          };

          return results;
        }),
      );

      setOcrResults(newOcrResults);

      // Calculate summary stats
      const totalTokens = newOcrResults.reduce(
        (acc, result) =>
          acc +
          result.zerox.content.split(" ").length +
          result.unstructured.content.split(" ").length,
        0,
      );
      const totalCost = (totalTokens * 0.0001).toFixed(2);
      const maxLatency = Math.max(
        ...newOcrResults.flatMap((result) =>
          Object.values(result).map((r) => r.time ?? 0),
        ),
      );

      setSummaryStats({
        tokensUsed: totalTokens,
        totalCost: parseFloat(totalCost),
        latency: maxLatency,
      });

      setUploadStatus("processed");
    } catch (error) {
      console.error("Error processing OCR:", error);
      setUploadStatus("error");
    }
  };

  const currentResults = ocrResults[currentFileIndex] ?? initialOCRResults;

  return (
    <div className="flex h-screen flex-col gap-4 p-4">
      <div className="flex flex-grow gap-4">
        {/* Left side - File upload, preview, and gallery */}
        <div className="flex w-1/2 flex-col gap-4">
          <Card>
            <CardContent className="p-4">
              <UploadDropzone
                endpoint="pdfUploader"
                onClientUploadComplete={(res) => {
                  if (res) {
                    const newFiles = res.map((file) => ({
                      name: file.name,
                      url: file.url,
                    }));
                    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
                    setUploadStatus("uploaded");
                  }
                }}
                onUploadError={(error: Error) => {
                  console.error("Upload error:", error);
                  setUploadStatus("error");
                }}
              />
              <Button
                onClick={processOCR}
                className="mt-4 whitespace-nowrap bg-blue-500 text-white hover:bg-blue-600"
                disabled={uploadStatus !== "uploaded"}
              >
                {uploadStatus === "processing" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : uploadStatus === "processed" ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Processed
                  </>
                ) : (
                  "Start OCR"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex-grow">
            <CardHeader>
              <CardTitle>File Preview</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100vh-400px)]">
              {files.length > 0 ? (
                <iframe
                  src={files[currentFileIndex]?.url}
                  className="h-full w-full"
                />
              ) : (
                <p className="text-gray-500">No file uploaded</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uploaded Files</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40 w-full">
                <div className="flex gap-4">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className={`flex w-32 flex-shrink-0 cursor-pointer flex-col items-center rounded border p-2 ${
                        currentFileIndex === index
                          ? "border-primary"
                          : "border-gray-200"
                      }`}
                      onClick={() => setCurrentFileIndex(index)}
                    >
                      <div className="mb-2 flex h-20 w-full items-center justify-center overflow-hidden bg-gray-200">
                        <p className="text-xs text-gray-500">PDF</p>
                      </div>
                      <p className="w-full truncate text-center text-xs font-medium">
                        {file.name}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(file.url, "_blank");
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement("a");
                            link.href = file.url;
                            link.download = file.name;
                            link.click();
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right side - OCR results in tabs and summary stats */}
        <div className="flex w-1/2 flex-col gap-4">
          <Card className="flex-grow">
            <CardContent className="p-0">
              <Tabs
                value={activeTab}
                onValueChange={(value) =>
                  setActiveTab(value as keyof OCRResults)
                }
                className="flex h-full flex-col"
              >
                <div className="rounded-t-lg bg-gray-100 p-2">
                  <TabsList className="w-full bg-transparent">
                    {Object.entries(initialOCRResults).map(([key]) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="flex-1 rounded-t-md px-1 py-1 data-[state=active]:bg-white data-[state=active]:shadow-none"
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">{key}</span>
                          {currentResults[key as keyof OCRResults].time !==
                            null && (
                            <span className="text-xs text-muted-foreground">
                              (
                              {currentResults[
                                key as keyof OCRResults
                              ].time?.toFixed(2)}
                              s)
                            </span>
                          )}
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {Object.entries(initialOCRResults).map(([key]) => (
                  <TabsContent
                    key={key}
                    value={key}
                    className="mt-0 flex-grow rounded-b-lg border-x border-b bg-white"
                  >
                    <ScrollArea className="h-[calc(100vh-18rem)]">
                      {files.length === 0 ? (
                        <p className="p-4 text-gray-500">No file uploaded</p>
                      ) : uploadStatus === "processing" ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : currentResults[key as keyof OCRResults].content ? (
                        <ReactMarkdown className="prose max-w-none p-4">
                          {currentResults[key as keyof OCRResults].content}
                        </ReactMarkdown>
                      ) : (
                        <p className="p-4 text-gray-500">OCR not started</p>
                      )}
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-gray-100">
            <CardHeader>
              <CardTitle className="text-lg">Summary Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Tokens Used: {summaryStats.tokensUsed}</p>
              <p>Total cost: ${summaryStats.totalCost}</p>
              <p>Latency: {summaryStats.latency.toFixed(2)}s</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
