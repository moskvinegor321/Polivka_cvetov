"use client";
import { useState } from "react";

type Result = {
  flower_name: string;
  watering_schedule: string;
  care_recommendations: string[];
  health_assessment: string;
  confidence?: number;
  issues?: string[];
  tips?: string[];
  sources?: string[];
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data.result as Result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 sm:p-10">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl sm:text-3xl font-semibold">Анализ цветка по фото</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(f ? URL.createObjectURL(f) : null);
            }}
            className="block w-full border rounded p-2"
          />
          <button
            type="submit"
            disabled={!file || loading}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {loading ? "Анализ..." : "Загрузить и проанализировать"}
          </button>
        </form>

        {previewUrl && (
          <div className="border rounded p-3">
            <div className="text-sm mb-2 text-gray-600">Предпросмотр загруженного фото</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Загруженное фото" className="max-h-[360px] rounded" />
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm">Ошибка: {error}</div>
        )}

        {result && (
          <div className="space-y-4 border rounded p-4">
            <div className="text-xl font-semibold">{result.flower_name}</div>
            {typeof result.confidence === "number" && (
              <div className="text-sm text-gray-600">Уверенность: {(result.confidence * 100).toFixed(0)}%</div>
            )}
            <div>
              <div className="font-semibold">Полив</div>
              <p className="text-sm whitespace-pre-line">{result.watering_schedule}</p>
            </div>
            <div>
              <div className="font-semibold">Состояние</div>
              <p className="text-sm whitespace-pre-line">{result.health_assessment}</p>
            </div>
            {!!result.care_recommendations?.length && (
              <div>
                <div className="font-semibold">Рекомендации по уходу</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {result.care_recommendations.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!result.issues?.length && (
              <div>
                <div className="font-semibold">Проблемы</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {result.issues!.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!result.tips?.length && (
              <div>
                <div className="font-semibold">Советы</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {result.tips!.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!result.sources?.length && (
              <div>
                <div className="font-semibold">Источники</div>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {result.sources!.map((t, i) => (
                    <li key={i}>
                      <a className="underline" href={t} target="_blank" rel="noreferrer">
                        {t}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
