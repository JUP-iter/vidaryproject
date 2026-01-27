import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Download, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface DetectionResult {
  success: boolean;
  verdict: "ai" | "human";
  confidence: string;
  detectedGenerator: string | null;
  fileUrl: string;
  processingTimeMs: number;
}

interface EnhancedResultCardProps {
  result: DetectionResult;
  fileType?: string;
  fileName?: string;
}

const CircularGauge = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = parseInt(value) || 0;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (animatedValue / 100) * circumference;

  useEffect(() => {
    let start = 0;
    const end = percentage;
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      start = Math.floor(end * progress);
      setAnimatedValue(start);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [percentage]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{animatedValue}</span>
        </div>
      </div>
      <p className="text-sm text-slate-400 mt-2">{label}</p>
    </div>
  );
};

export default function EnhancedResultCard({
  result,
  fileType,
  fileName,
}: EnhancedResultCardProps) {
  const isAI = result.verdict === "ai";
  const confidenceDecimal = parseFloat(result.confidence) || 0;
  const confidence = Math.round(confidenceDecimal * 100);
  const gaugeColor = isAI ? "#ef4444" : "#22c55e";

  // Mock data for demonstration - in real implementation, this would come from the API
  const detectionMetrics = {
    ai: isAI ? confidence : 100 - confidence,
    deepfake: isAI ? Math.max(0, confidence - 20) : 0,
    quality: isAI ? Math.min(100, confidence + 10) : 95,
  };

  const generatorBreakdown = [
    { name: "Midjourney", likelihood: isAI ? 45 : 0 },
    { name: "DALL-E", likelihood: isAI ? 30 : 0 },
    { name: "4o", likelihood: isAI ? 15 : 0 },
    { name: "GAN", likelihood: isAI ? 10 : 0 },
  ].filter((g) => g.likelihood > 0);

  const handleDownloadReport = () => {
    // TODO: Implement PDF report download
    toast.success("Report download feature coming soon!");
  };

  const handleShareResult = () => {
    const shareUrl = `${window.location.origin}/share/${btoa(JSON.stringify(result))}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Detection Report</h2>
          <p className="text-slate-400">{fileName}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleShareResult}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share Result
          </Button>
          <Button
            onClick={handleDownloadReport}
            className="bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Verdict Banner */}
      <Card className="border border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 p-6">
        <div className="flex items-center gap-4">
          {isAI ? (
            <AlertCircle className="w-12 h-12 text-red-500 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm text-slate-400">Detection Result</p>
            <p className={`text-3xl font-bold ${isAI ? "text-red-500" : "text-green-500"}`}>
              {isAI ? "AI-Generated" : "Authentic"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Confidence: {confidence}% • Processing time: {result.processingTimeMs}ms
            </p>
          </div>
        </div>
      </Card>

      {/* Circular Gauges */}
      <Card className="border border-slate-700 bg-slate-800/50 p-8">
        <h3 className="text-lg font-semibold text-white mb-6">Detection Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          <CircularGauge
            label="AI"
            value={detectionMetrics.ai.toFixed(0)}
            color={isAI ? "#ef4444" : "#22c55e"}
          />
          <CircularGauge
            label="Deepfake"
            value={detectionMetrics.deepfake.toFixed(0)}
            color="#f97316"
          />
          <CircularGauge
            label="Quality"
            value={detectionMetrics.quality.toFixed(0)}
            color="#3b82f6"
          />
        </div>
      </Card>

      {/* Data Breakdown */}
      {generatorBreakdown.length > 0 && (
        <Card className="border border-slate-700 bg-slate-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Data Breakdown</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-700">
              <p className="text-sm text-slate-400">Class</p>
              <p className="text-sm text-slate-400 text-right">Likelihoods</p>
            </div>
            {generatorBreakdown.map((generator) => (
              <div key={generator.name} className="grid grid-cols-2 gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
                    }}
                  />
                  <p className="text-sm text-white">{generator.name}</p>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      style={{ width: `${generator.likelihood}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-400 w-12 text-right">
                    {generator.likelihood}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Additional Info */}
      <Card className="border border-slate-700 bg-slate-800/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Analysis Details</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-slate-400">File Type</p>
            <p className="text-white capitalize">{fileType || "Image"}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-slate-400">Detected Generator</p>
            <p className="text-white">{result.detectedGenerator || "Unknown"}</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-slate-400">Confidence Score</p>
            <p className="text-white font-semibold">{confidence}%</p>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-slate-400">Processing Time</p>
            <p className="text-white">{result.processingTimeMs}ms</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
