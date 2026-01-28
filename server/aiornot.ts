import { ENV } from "./_core/env.js";

export type DetectionFileType = "image" | "audio" | "video" | "text";

export interface AIOrNotImageResponse {
  id: string;
  report: {
    meta: {
      width: number;
      height: number;
      format: string;
      size_bytes: number;
      md5: string;
      processing_status: Record<string, string>;
    };
    ai_generated: {
      verdict: "ai" | "human";
      ai: { is_detected: boolean; confidence: number };
      human: { is_detected: boolean; confidence: number };
      generator: Record<string, number>;
    };
    deepfake?: {
      is_detected: boolean;
      confidence: number;
      rois?: Array<{
        is_detected: boolean;
        confidence: number;
        bbox: { x1: number; y1: number; x2: number; y2: number };
      }>;
    };
  };
  created_at: string;
  external_id?: string;
}

export interface AIOrNotAudioResponse {
  id: string;
  report: {
    meta: {
      duration_seconds: number;
      format: string;
      size_bytes: number;
      processing_status: Record<string, string>;
    };
    ai_generated: {
      verdict: "ai" | "human";
      ai: { is_detected: boolean; confidence: number };
      human: { is_detected: boolean; confidence: number };
      generator: Record<string, number>;
      segments?: Array<{
        start_time: number;
        end_time: number;
        verdict: "ai" | "human";
        confidence: number;
      }>;
    };
  };
  created_at: string;
  external_id?: string;
}

export interface AIOrNotVideoResponse {
  id: string;
  report: {
    ai_video: {
      is_detected: boolean;
      confidence: number;
    };
    ai_voice: {
      is_detected: boolean;
      confidence: number;
    };
    ai_music: {
      is_detected: boolean;
      confidence: number;
    };
    meta: {
      duration: number;
      total_bytes: number;
      md5: string;
      audio: string;
      video: string;
    };
    deepfake_video?: {
      is_detected: boolean;
      confidence: number;
      no_faces_found: boolean;
    };
  };
  created_at: string;
  external_id?: string;
}



/**
 * Detect if an image is AI-generated
 */
export async function detectImageAI(
  fileBuffer: Buffer,
  fileName: string
): Promise<AIOrNotImageResponse> {
  const formData = new FormData();
  formData.append("image", new Blob([new Uint8Array(fileBuffer)]), fileName);
  formData.append("external_id", `image-${Date.now()}`);

  const response = await fetch(`${ENV.aiOrNotApiUrl}/image/sync`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${ENV.aiOrNotApiKey}`,
      "Accept": "application/json"
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AIorNot Error] Image API failed: ${response.status} - ${errorText}`);
    throw new Error(`AI or Not API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Detect if audio is AI-generated (voice)
 */
export async function detectAudioVoiceAI(
  fileBuffer: Buffer,
  fileName: string
): Promise<AIOrNotAudioResponse> {
  const formData = new FormData();
  formData.append("audio", new Blob([new Uint8Array(fileBuffer)]), fileName);
  formData.append("external_id", `audio-${Date.now()}`);

  const response = await fetch(
    `${ENV.aiOrNotApiUrl}/audio/sync`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ENV.aiOrNotApiKey}`,
        "Accept": "application/json"
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AIorNot Error] Audio Voice API failed: ${response.status} - ${errorText}`);
    throw new Error(
      `AI or Not API error (audio voice): ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

/**
 * Detect if audio is AI-generated (music)
 */
export async function detectAudioMusicAI(
  fileBuffer: Buffer,
  fileName: string
): Promise<AIOrNotAudioResponse> {
  const formData = new FormData();
  formData.append("audio", new Blob([new Uint8Array(fileBuffer)]), fileName);
  formData.append("external_id", `audio-music-${Date.now()}`);

  const response = await fetch(
    `${ENV.aiOrNotApiUrl}/audio/music/sync`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.aiOrNotApiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `AI or Not API error (audio music): ${response.status} - ${errorText}`
    );
  }

  return response.json();
}

/**
 * Detect if video is AI-generated
 */
export async function detectVideoAI(
  fileBuffer: Buffer,
  fileName: string
): Promise<AIOrNotVideoResponse> {
  console.log("[AIOrNot] Video API URL:", ENV.aiOrNotApiUrl);
  console.log("[AIOrNot] Video API Key present:", !!ENV.aiOrNotApiKey);
  console.log("[AIOrNot] Video file size:", fileBuffer.length, "bytes");

  const formData = new FormData();
  formData.append("video", new Blob([new Uint8Array(fileBuffer)]), fileName);
  formData.append("external_id", `video-${Date.now()}`);

  try {
    const response = await fetch(`${ENV.aiOrNotApiUrl}/video/sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENV.aiOrNotApiKey}`,
        Accept: "application/json",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AIorNot Error] Video API failed: ${response.status} - ${errorText}`);
      throw new Error(`AI or Not Video API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("[AIOrNot] Video API response received successfully");
    return result;
  } catch (error: any) {
    console.error("[AIOrNot] Video API fetch error:", error?.message);
    console.error("[AIOrNot] Video API error stack:", error?.stack);
    throw error;
  }
}

/**
 * Extract the top detected generator from the API response
 */
export function getTopDetectedGenerator(
  generatorScores: Record<string, number>
): string | null {
  if (!generatorScores || Object.keys(generatorScores).length === 0) {
    return null;
  }

  let topGenerator = "";
  let topScore = 0;

  for (const [generator, score] of Object.entries(generatorScores)) {
    if (score > topScore) {
      topScore = score;
      topGenerator = generator;
    }
  }

  return topGenerator || null;
}

export interface AIOrNotTextResponse {
  id: string;
  report: {
    meta: {
      word_count: number;
      character_count: number;
      processing_status: Record<string, string>;
    };
    ai_generated: {
      verdict: "ai" | "human";
      ai: { is_detected: boolean; confidence: number };
      human: { is_detected: boolean; confidence: number };
      generator: Record<string, number>;
    };
  };
  created_at: string;
  external_id?: string;
}

export type AIOrNotResponse =
  | AIOrNotImageResponse
  | AIOrNotAudioResponse
  | AIOrNotVideoResponse
  | AIOrNotTextResponse;

/**
 * Detect if text is AI-generated
 */
export async function detectTextAI(
  text: string
): Promise<AIOrNotTextResponse> {
  const response = await fetch(`${ENV.aiOrNotApiUrl}/text/sync`, {
      method: "POST",
      headers: {
        "x-api-key": ENV.aiOrNotApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        external_id: `text-${Date.now()}`,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `AI or Not API error (text): ${response.status} - ${errorText}`
    );
  }

  return response.json();
}
