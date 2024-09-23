"use client";

import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import ReactMarkdown from "react-markdown";
import { Loader2, CheckCircle, Download, Eye } from "lucide-react";

type FileData = {
  name: string;
  content: string[];
  url: string;
  thumbnail: string;
};

type OCRResult = {
  content: string;
  time: number | null;
};

type OCRResults = {
  zerox: OCRResult;
  unstructured: OCRResult;
  textextract: OCRResult;
  azure: OCRResult;
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
  textextract: { content: "", time: null },
  azure: { content: "", time: null },
};

export function OcrComparisonTool() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.files) {
      setUploadStatus("uploading");
      const newFiles: FileData[] = await Promise.all(
        Array.from(event.target.files).map(async (file) => ({
          name: file.name,
          content: ["This is a placeholder content for " + file.name],
          url: URL.createObjectURL(file),
          thumbnail: await generateThumbnail(file),
        })),
      );
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      setOcrResults((prevResults) => [
        ...prevResults,
        ...newFiles.map(() => ({ ...initialOCRResults })),
      ]);
      setUploadStatus("uploaded");
    }
  };

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const scaleFactor = 100 / img.width;
          canvas.width = 100;
          canvas.height = img.height * scaleFactor;

          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL());
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const mockOCRRequest = (
    provider: keyof OCRResults,
    content: string,
  ): Promise<OCRResult> => {
    return new Promise((resolve) => {
      const processingTime = Math.random() * 3 + 1; // Random time between 1 and 4 seconds
      setTimeout(() => {
        resolve({
          content: `## ${provider.charAt(0).toUpperCase() + provider.slice(1)} OCR Result\n\n${content}\n\n### Additional Metadata\n- Confidence: ${Math.floor(Math.random() * 20) + 80}%\n- Characters recognized: ${content.length}`,
          time: processingTime,
        });
      }, processingTime * 1000);
    });
  };

  const processOCR = async () => {
    if (files.length === 0) return;

    setUploadStatus("processing");

    try {
      const newOcrResults = await Promise.all(
        files.map(async (file, fileIndex) => {
          const content = file.content.join("\n\n");
          const results: OCRResults = { ...initialOCRResults };

          for (const provider of Object.keys(initialOCRResults) as Array<
            keyof OCRResults
          >) {
            results[provider] = await mockOCRRequest(provider, content);
          }

          setOcrResults((prev) => {
            const updated = [...prev];
            updated[fileIndex] = results;
            return updated;
          });

          return results;
        }),
      );

      setSummaryStats({
        tokensUsed: files.reduce(
          (acc, file) => acc + file.content.join(" ").split(" ").length,
          0,
        ),
        totalCost:
          Math.round(
            files.reduce(
              (acc, file) => acc + file.content.join(" ").split(" ").length,
              0,
            ) *
              0.0001 *
              100,
          ) / 100,
        latency: Math.max(
          ...newOcrResults.flatMap((result) =>
            Object.values(result).map((r) => r.time ?? 0),
          ),
        ),
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
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="flex-grow"
                  accept=".pdf"
                  disabled={
                    uploadStatus === "uploading" ||
                    uploadStatus === "processing"
                  }
                />
                <Button
                  onClick={processOCR}
                  className="whitespace-nowrap bg-blue-500 text-white hover:bg-blue-600"
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
              </div>
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
                        <img
                          src={file.thumbnail}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
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
