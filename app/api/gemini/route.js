import { GoogleGenerativeAI } from "@google/generative-ai";

// Add GET method for testing
export async function GET() {
  return Response.json({
    status: "API route is working!",
    message: "Send POST request with {text: 'your text'} to use this endpoint"
  });
}

export async function POST(req) {
  console.log("🔥 Gemini API POST request received");

  try {
    const body = await req.json();
    const { text } = body;

    if (!text) {
      console.log("❌ No text provided in request");
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY not found in environment");
      return Response.json({
        error: "API key not configured. Please add GEMINI_API_KEY to .env.local"
      }, { status: 500 });
    }

    console.log("✅ Text received:", text.substring(0, 100));

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const prompt = `You are analyzing OCR-extracted text from a product label or package.

Extract the following information:
1. Product Name (brand and product type)
2. Expiry Date (in any format: DD/MM/YYYY, MM/YYYY, Best Before, Use By, etc.)

If any information is not clearly visible, write "Not found"

OCR TEXT:
${text}

Respond ONLY in this format:
[name],[expiry_date(in dd/mm/yyyy format)]`;

    console.log("🤖 Calling Gemini API...");

    let result;
    try {
      // Try gemini-2.0-flash (found in available models list)
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      result = await model.generateContent(prompt);
    } catch (error) {
      console.warn("⚠️ gemini-2.0-flash failed, attempting fallback to gemini-flash-latest...");
      console.error("Original Error:", error.message);

      try {
        // Fallback to generic alias
        const modelFallback = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        result = await modelFallback.generateContent(prompt);
      } catch (fallbackError) {
        console.error("❌ Fallback model also failed:", fallbackError.message);
        throw fallbackError; // Re-throw to be caught by outer block
      }
    }

    const output = result.response.text();

    console.log("✅ Gemini response received:", output);

    return Response.json({ result: output });

  } catch (err) {
    console.error("❌ Gemini API Error:", err);
    return Response.json({
      error: "Failed to process with Gemini AI",
      details: err.message
    }, { status: 500 });
  }
}