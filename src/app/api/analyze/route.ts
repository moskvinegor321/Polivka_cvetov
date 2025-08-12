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

    const prompt = `Ты — профессиональный ботаник‑ассистент. Проанализируй фото цветка и верни ТОЛЬКО компактный JSON с ключами (ключи на английском, значения строго на русском):
{
  "flower_name": string, // распространённое русское название и, по возможности, латинское в скобках
  "watering_schedule": string, // как и как часто поливать, кратко и по делу
  "care_recommendations": string[], // 3–7 практичных советов по уходу
  "health_assessment": string, // краткая оценка состояния по фото
  "confidence": number, // 0..1 уверенность в определении
  "issues": string[], // возможные проблемы (переувлажнение, вредители и т.п.)
  "tips": string[], // короткие дополнительные советы
  "sources": string[] // 1–3 надёжные ссылки для чтения
}
Все текстовые значения — на русском языке. Если точность низкая, так и напиши в поле health_assessment и упомяни 2–3 возможных варианта в поле flower_name.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Отвечай только валидным JSON без форматирования Markdown. Язык ответов — русский. Не добавляй никакого лишнего текста вне JSON." },
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
        { error: "Модель вернула невалидный JSON", raw: content },
        { status: 502 },
      );
    }

    const parsed = AnalysisSchema.safeParse(data);
    if (!parsed.success) {
      return Response.json(
        { error: "Ответ модели не прошёл валидацию схемы", issues: parsed.error.format() },
        { status: 502 },
      );
    }

    const result: Analysis = parsed.data;
    return Response.json({ result });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Неожиданная ошибка сервера" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json({ status: "ok" });
}


