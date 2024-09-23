import { type NextRequest } from "next/server";
import { env } from "~/env";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return new Response("URL parameter is required", { status: 400 });
    }

    // Call Omni AI API to initiate the ZeroX process
    const omniResponse = await fetch(
      "https://api.getomni.ai/pipelines/run/2afc1cdb-c93c-4e0f-8a51-126490572e88",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.OMNI_API_KEY,
        },
        body: JSON.stringify({ url }),
      },
    );

    if (!omniResponse.ok) {
      throw new Error(`Omni API responded with status: ${omniResponse.status}`);
    }

    const initialResult = await omniResponse.json();
    const { jobId, result: resultUrl } = initialResult;

    // Poll for the result with adaptive timing
    const maxTotalWaitTime = 120000; // 2 minutes in milliseconds
    const initialInterval = 1000; // Start with 1 second interval
    let totalWaitTime = 0;
    let currentInterval = initialInterval;
    let finalResult;

    while (totalWaitTime < maxTotalWaitTime) {
      const resultResponse = await fetch(resultUrl, {
        headers: {
          "x-api-key": env.OMNI_API_KEY,
        },
      });

      if (!resultResponse.ok) {
        throw new Error(
          `Result API responded with status: ${resultResponse.status}`,
        );
      }

      const resultData = await resultResponse.json();

      if (resultData.status === "COMPLETE") {
        finalResult = resultData.result.ocr_result;
        break;
      } else if (
        resultData.status === "PENDING" ||
        resultData.status === "IN_PROGRESS"
      ) {
        await wait(currentInterval);
        totalWaitTime += currentInterval;
        // Gradually increase the interval, but cap it at 10 seconds
        currentInterval = Math.min(currentInterval * 1.5, 10000);
      } else {
        throw new Error(`Unexpected status: ${resultData.status}`);
      }
    }

    if (!finalResult) {
      throw new Error("Max wait time reached or processing failed");
    }

    return new Response(JSON.stringify({ result: finalResult }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
