import { type NextRequest } from "next/server";
import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { env } from "~/env";

const unstructuredKey = env.UNSTRUCTURED_API_KEY;

const client = new UnstructuredClient({
  serverURL: env.UNSTRUCTURED_URL,
  security: {
    apiKeyAuth: unstructuredKey,
  },
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return new Response("URL parameter is required", { status: 400 });
    }

    // Download the PDF file
    const response = await fetch(url);
    const pdfBuffer = await response.arrayBuffer();

    // Save the PDF to a temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `temp-${Date.now()}.pdf`);
    fs.writeFileSync(tempFilePath, Buffer.from(pdfBuffer));

    // Process the PDF with Unstructured API
    const result = await client.general.partition({
      partitionParameters: {
        files: {
          content: fs.readFileSync(tempFilePath),
          fileName: tempFilePath,
        },
        strategy: Strategy.HiRes,
      },
    });

    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);

    if (result.statusCode === 200) {
      return new Response(JSON.stringify(result.elements), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response("Error processing PDF", {
        status: result.statusCode,
      });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
