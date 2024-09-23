import { type NextRequest } from "next/server";
import { zerox } from "zerox";
import { env } from "~/env";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return new Response("URL parameter is required", { status: 400 });
    }

    // Process the PDF with Zerox
    const result = await zerox({
      filePath: url,
      openaiAPIKey: env.OPENAI_API_KEY,
      // You can add more options here if needed
    });

    // Format the response
    const formattedResponse = {
      completionTime: result.completionTime,
      fileName: result.fileName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      pages: result.pages.map((page) => ({
        content: page.content,
        pageNumber: page.page,
        contentLength: page.contentLength,
      })),
    };

    return new Response(JSON.stringify(formattedResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
