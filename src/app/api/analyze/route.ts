import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

const AnalysisSchema = z.object({
  flower_name: z.string().min(1),
  watering_schedule: z.string().min(1),
  care_recommendations: z.array(z.string()).default([]),
  health_assessment: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  issues: z.array(z.string()).default([]),
  tips: z.array(z.string()).default([]),
  sources: z.array(z.string().url()).default([]),
});

type Analysis = z.infer<typeof AnalysisSchema>;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const image = form.get("image");

    if (!image || typeof image === "string") {
      return Response.json({ error: "Image file is required" }, { status: 400 });
    }

    // Convert the uploaded image to a data URL for OpenAI Vision
    const file = image as File;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mime = file.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // TODO: Add to .env
    });

    const prompt = `You are a professional botanist assistant. Analyze the provided flower photo and return ONLY a compact JSON object with the following keys:
{
  "flower_name": string, // common name, plus latin in parentheses if known
  "watering_schedule": string, // concise schedule with frequency and volume tips
  "care_recommendations": string[], // actionable bullet tips
  "health_assessment": string, // short assessment of current health from the photo
  "confidence": number, // 0..1 confidence in identification
  "issues": string[], // potential problems seen (e.g., overwatering, pests)
  "tips": string[], // short extra tips
  "sources": string[] // 1-3 reputable links for further reading
}
Keep it realistic. If identification is uncertain, say so and provide 2-3 likely candidates.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only valid JSON. No markdown." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";

    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      return Response.json(
        { error: "Model did not return valid JSON", raw: content },
        { status: 502 },
      );
    }

    const parsed = AnalysisSchema.safeParse(data);
    if (!parsed.success) {
      return Response.json(
        { error: "Response schema validation failed", issues: parsed.error.format() },
        { status: 502 },
      );
    }

    const result: Analysis = parsed.data;
    return Response.json({ result });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json({ status: "ok" });
}


