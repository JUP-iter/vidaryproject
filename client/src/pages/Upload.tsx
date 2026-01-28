import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, UploadCloud, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import EnhancedResultCard from "@/components/EnhancedResultCard";

type FileType = "image" | "audio" | "video";
type AudioType = "voice" | "music";

interface AnalysisResult {
  success: boolean;
  verdict: "ai" | "human";
  confidence: string;
  detectedGenerator: string | null;
  fileUrl: string;
  processingTimeMs: number;
}

async function uploadLargeFileToApi(file: File): Promise<{ fileUrl: string }> {
  const form = new FormData();
  form.append("file", file);

  const resp = await fetch("/api/upload", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Upload API failed: ${resp.status} ${text}`);
  }

  const json = await resp.json();
  if (!json?.fileUrl) throw new Error("Upload API returned no fileUrl");
  return { fileUrl: json.fileUrl };
}

export default function UploadPage() {
  const [, navigate] = useLocation();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [audioType, setAudioType] = useState<AudioType>("voice");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);


  const analyzeImageMutation = trpc.detection.analyzeImage.useMutation();
  const analyzeAudioMutation = trpc.detection.analyzeAudio.useMutation();
  const analyzeVideoMutation = trpc.detection.analyzeVideo.useMutation();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const validateFile = (file: File): { valid: boolean; type?: FileType; error?: string } => {
    const imageTypes = ["image/jpeg", "image/png", "image/webp"];
    const audioTypes = ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/mp4"];
    const videoTypes = ["video/mp4", "video/quicktime", "video/webm"];

    const imageSizeLimit = 10 * 1024 * 1024;
    const audioSizeLimit = 50 * 1024 * 1024;
    const videoSizeLimit = 100 * 1024 * 1024;

    if (imageTypes.includes(file.type)) {
      if (file.size > imageSizeLimit) return { valid: false, error: "Image exceeds 10MB limit" };
      return { valid: true, type: "image" };
    }

    if (audioTypes.includes(file.type)) {
      if (file.size > audioSizeLimit) return { valid: false, error: "Audio exceeds 50MB limit" };
      return { valid: true, type: "audio" };
    }

    if (videoTypes.includes(file.type)) {
      if (file.size > videoSizeLimit) return { valid: false, error: "Video exceeds 100MB limit" };
      return { valid: true, type: "video" };
    }

    return { valid: false, error: "Unsupported file type" };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) handleFileSelect(files[0]);
  };

  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file");
      return;
    }
    setSelectedFile(file);
    setFileType(validation.type || null);
    setResult(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !fileType) {
      toast.error("Please select a file first");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(10);

    progressIntervalRef.current = setInterval(() => {
      setAnalysisProgress((prev) => Math.min(prev + Math.random() * 30, 90));
    }, 500);

    try {
      setAnalysisProgress(20);
      let analysisResult: any;

      // 🔥 КЛЮЧЕВОЕ: большие файлы грузим НЕ через tRPC/JSON, а через /api/upload (multipart)
      const isLarge =
        fileType === "video" || (fileType === "audio" && selectedFile.size > 4 * 1024 * 1024);

      if (isLarge) {
        setAnalysisProgress(35);

        const { fileUrl } = await uploadLargeFileToApi(selectedFile);

        setAnalysisProgress(65);

        if (fileType === "video") {
          analysisResult = await analyzeVideoMutation.mutateAsync({
            fileName: selectedFile.name,
            fileUrl,
            mimeType: selectedFile.type,
          });
        } else {
          analysisResult = await analyzeAudioMutation.mutateAsync({
            fileName: selectedFile.name,
            fileUrl,
            mimeType: selectedFile.type,
            audioType,
          });
        }
      } else {
        // маленькие файлы — оставляем base64 как было
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        setAnalysisProgress(45);

        if (fileType === "image") {
          analysisResult = await analyzeImageMutation.mutateAsync({
            fileName: selectedFile.name,
            fileData,
            mimeType: selectedFile.type,
          });
        } else if (fileType === "audio") {
          analysisResult = await analyzeAudioMutation.mutateAsync({
            fileName: selectedFile.name,
            fileData,
            mimeType: selectedFile.type,
            audioType,
          });
        }
      }

      if (analysisResult) {
        setAnalysisProgress(100);
        setResult(analysisResult);
        toast.success("Analysis complete!");
      } else {
        toast.error("Server returned no result. Check logs.");
      }
    } catch (error: any) {
      console.error("Analysis error details:", error);
      toast.error(error?.message || "Unknown error");
    } finally {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(0), 500);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileType(null);
    setResult(null);
    setAnalysisProgress(0);
    setAudioType("voice");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <EnhancedResultCard result={result} fileType={fileType || "image"} fileName={selectedFile?.name} />
          <Button onClick={handleReset} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white">
            Analyze Another File
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">AI Content Detector</h1>
          <p className="text-slate-600">Upload an image, audio, or video file to detect if it's AI-generated</p>
        </div>

        <Card className="border-2 border-slate-200 shadow-lg mb-8">
          <div
            className={`p-12 border-2 border-dashed rounded-lg transition-all duration-200 ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : selectedFile
                ? "border-green-500 bg-green-50"
                : "border-slate-300 bg-white hover:border-slate-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleInputChange}
              className="hidden"
              accept="image/*,audio/*,video/*"
            />

            <div className="text-center">
              {selectedFile ? (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-slate-900 mb-2">{selectedFile.name}</p>
                  <p className="text-sm text-slate-600 mb-4">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-slate-900 mb-2">Drop your file here or click to browse</p>
                  <p className="text-sm text-slate-600">
                    Supports: JPG, PNG, WebP (10MB) • MP3, WAV, M4A (50MB) • MP4, MOV, WebM (100MB)
                  </p>
                </>
              )}
            </div>

            {!selectedFile && (
              <Button onClick={() => fileInputRef.current?.click()} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white">
                Select File
              </Button>
            )}
          </div>
        </Card>

        {fileType === "audio" && (
          <Card className="border border-slate-200 shadow-md p-6 mb-6">
            <label className="block text-sm font-semibold text-slate-900 mb-3">Audio Type</label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="audioType"
                  value="voice"
                  checked={audioType === "voice"}
                  onChange={(e) => setAudioType(e.target.value as AudioType)}
                  className="w-4 h-4"
                />
                <span className="ml-2 text-slate-700">Voice/Speech</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="audioType"
                  value="music"
                  checked={audioType === "music"}
                  onChange={(e) => setAudioType(e.target.value as AudioType)}
                  className="w-4 h-4"
                />
                <span className="ml-2 text-slate-700">Music</span>
              </label>
            </div>
          </Card>
        )}

        {isAnalyzing && (
          <Card className="border border-slate-200 shadow-md p-6 mb-6 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-900">Analysis Progress</span>
              <span className="text-sm font-semibold text-blue-600">{Math.round(analysisProgress)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          </Card>
        )}

        {selectedFile && (
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze File"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
