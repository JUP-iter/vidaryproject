import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import EnhancedResultCard from "@/components/EnhancedResultCard";

interface AnalysisResult {
  success: boolean;
  verdict: "ai" | "human";
  confidence: string;
  detectedGenerator: string | null;
  fileUrl: string;
  processingTimeMs: number;
}

export default function TextDetectionPage() {
  const [, navigate] = useLocation();
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeTextMutation = trpc.detection.analyzeText.useMutation();

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to analyze");
      return;
    }

    if (text.length > 50000) {
      toast.error("Text exceeds 50,000 character limit");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await analyzeTextMutation.mutateAsync({
        text: text.trim(),
      });

      setResult(response as AnalysisResult);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Analysis error:", error);
      if (error?.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to analyze text. Please try again.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setText("");
    setResult(null);
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <EnhancedResultCard result={result} fileType="text" fileName="Text Input" />
          <Button
            onClick={handleReset}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Analyze Another Text
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Text Detection</h1>
          <p className="text-slate-600">Analyze text to detect AI-generated content</p>
        </div>

        {/* Input Card */}
        <Card className="border-2 border-slate-200 shadow-lg mb-6">
          <div className="p-8">
            <label className="block text-sm font-semibold text-slate-900 mb-3">
              Enter Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type your text here... (max 50,000 characters)"
              className="w-full h-64 p-4 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-slate-600">
                {text.length} / 50,000 characters
              </p>
              {text.length > 50000 && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Text exceeds limit
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Analysis Button */}
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !text.trim() || text.length > 50000}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white py-3 text-lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze Text"
          )}
        </Button>

        {/* Info Card */}
        <Card className="border border-slate-200 shadow-md p-6 mt-8 bg-blue-50">
          <h3 className="font-semibold text-slate-900 mb-2">How it works</h3>
          <ul className="text-sm text-slate-700 space-y-1">
            <li>• Paste or type text content you want to analyze</li>
            <li>• Our AI detection system analyzes the text for AI-generated patterns</li>
            <li>• Get instant results showing whether the text is AI-generated or authentic</li>
            <li>• View detailed analysis with confidence scores and detected generators</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
