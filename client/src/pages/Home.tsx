import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowRight, Shield, Zap, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Navigation */}
        <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                🎬 Vidary
              </div>
              <span className="text-xs text-slate-400 ml-2">by Astromind</span>
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Sign In
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Detect AI-Generated Content with Confidence
              </h1>
              <p className="text-xl text-slate-300 mb-2 leading-relaxed">
                Upload images, audio, or videos to instantly determine if they're AI-generated or
                authentic. Powered by state-of-the-art detection algorithms.
              </p>
              <p className="text-sm text-slate-400 mb-8">
                Vidary - Advanced AI Detection by Astromind
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => navigate("/login")}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 text-lg"
                >
                  Get Started <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-slate-800"
                >
                  Learn More
                </Button>
              </div>
            </div>

            {/* Feature Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-3xl" />
              <Card className="relative border border-slate-700 bg-slate-800/50 backdrop-blur p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      🖼️
                    </div>
                    <div>
                      <p className="text-white font-semibold">Image Detection</p>
                      <p className="text-slate-400 text-sm">DALL-E, Midjourney, Stable Diffusion</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      🎵
                    </div>
                    <div>
                      <p className="text-white font-semibold">Audio Detection</p>
                      <p className="text-slate-400 text-sm">Voice cloning, synthetic speech</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                      🎬
                    </div>
                    <div>
                      <p className="text-white font-semibold">Video Detection</p>
                      <p className="text-slate-400 text-sm">Deepfakes, AI-generated video</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-slate-800/50 border-t border-slate-700 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-white mb-12 text-center">Why Choose Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border border-slate-700 bg-slate-800/50 p-8 hover:border-blue-500 transition-colors">
                <Shield className="w-12 h-12 text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Highly Accurate</h3>
                <p className="text-slate-400">
                  State-of-the-art AI detection models trained on the latest generative AI outputs
                </p>
              </Card>

              <Card className="border border-slate-700 bg-slate-800/50 p-8 hover:border-cyan-500 transition-colors">
                <Zap className="w-12 h-12 text-cyan-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Lightning Fast</h3>
                <p className="text-slate-400">
                  Get results in seconds with our optimized detection pipeline
                </p>
              </Card>

              <Card className="border border-slate-700 bg-slate-800/50 p-8 hover:border-purple-500 transition-colors">
                <BarChart3 className="w-12 h-12 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold text-white mb-3">Detailed Insights</h3>
                <p className="text-slate-400">
                  View confidence scores and identify the likely generator used
                </p>
              </Card>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-12 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to Detect AI Content?</h2>
            <p className="text-blue-100 text-lg mb-8">
              Start analyzing your files today with our powerful detection system
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="bg-white text-blue-600 hover:bg-slate-100 px-8 py-3 text-lg font-semibold"
            >
              Sign In to Get Started
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-700 bg-slate-900 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
            <p>&copy; 2026 AI Content Detector. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
            🔍 AI Detector
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-700">Welcome, {user?.username || "User"}!</span>
            <Button 
              variant="outline" 
              className="border-slate-300"
              onClick={() => {
                trpc.auth.logout.useMutation().mutate();
                window.location.reload();
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Upload Card */}
          <Card
            onClick={() => navigate("/upload")}
            className="border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all p-8 cursor-pointer h-full"
          >
            <div className="text-5xl mb-4">📤</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyze Media</h2>
            <p className="text-slate-600 mb-4">
              Upload an image, audio, or video file to detect if it's AI-generated
            </p>
            <div className="inline-flex items-center gap-2 text-blue-600 font-semibold">
              Get Started <ArrowRight className="w-4 h-4" />
            </div>
          </Card>

          {/* Text Detection Card */}
          <Card
            onClick={() => navigate("/text")}
            className="border-2 border-slate-200 hover:border-green-400 hover:shadow-lg transition-all p-8 cursor-pointer h-full"
          >
            <div className="text-5xl mb-4">📝</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Detect Text</h2>
            <p className="text-slate-600 mb-4">
              Paste or type text to detect if it's AI-generated
            </p>
            <div className="inline-flex items-center gap-2 text-green-600 font-semibold">
              Analyze <ArrowRight className="w-4 h-4" />
            </div>
          </Card>

          {/* History Card */}
          <Card
            onClick={() => navigate("/history")}
            className="border-2 border-slate-200 hover:border-purple-400 hover:shadow-lg transition-all p-8 cursor-pointer h-full"
          >
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">View History</h2>
            <p className="text-slate-600 mb-4">
              Check all your previous detection analyses and results
            </p>
            <div className="inline-flex items-center gap-2 text-purple-600 font-semibold">
              View Results <ArrowRight className="w-4 h-4" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
