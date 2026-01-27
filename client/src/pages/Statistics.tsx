import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function StatisticsPage() {
  const [, navigate] = useLocation();
  const { data: results = [], isLoading } = trpc.detection.getHistory.useQuery({ limit: 1000 });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const totalAnalyzed = results.length || 0;
  const aiCount = results.filter((r) => r.verdict === "ai").length || 0;
  const humanCount = results.filter((r) => r.verdict === "human").length || 0;

  // Generator breakdown
  const generatorMap: Record<string, number> = {};
  results.forEach((r) => {
    if (r.detectedGenerator) {
      generatorMap[r.detectedGenerator] = (generatorMap[r.detectedGenerator] || 0) + 1;
    }
  });

  const generatorData = Object.entries(generatorMap)
    .map(([name, count]) => ({ name, value: count }))
    .sort((a, b) => b.value - a.value);

  const verdictData = [
    { name: "AI-Generated", value: aiCount },
    { name: "Authentic", value: humanCount },
  ];

  const COLORS = ["#ef4444", "#22c55e"];

  // File type breakdown
  const fileTypeMap: Record<string, number> = {};
  results.forEach((r) => {
    fileTypeMap[r.fileType] = (fileTypeMap[r.fileType] || 0) + 1;
  });

  const fileTypeData = Object.entries(fileTypeMap).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    count,
  }));

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
        <h1 className="text-4xl font-bold text-white mb-8">Detection Statistics</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-slate-900 border-slate-700 p-6">
            <p className="text-slate-400 text-sm mb-2">Total Analyzed</p>
            <p className="text-4xl font-bold text-white">{totalAnalyzed}</p>
          </Card>
          <Card className="bg-slate-900 border-slate-700 p-6">
            <p className="text-slate-400 text-sm mb-2">AI-Generated</p>
            <p className="text-4xl font-bold text-red-500">{aiCount}</p>
            <p className="text-sm text-slate-400 mt-2">
              {totalAnalyzed > 0 ? Math.round((aiCount / totalAnalyzed) * 100) : 0}%
            </p>
          </Card>
          <Card className="bg-slate-900 border-slate-700 p-6">
            <p className="text-slate-400 text-sm mb-2">Authentic</p>
            <p className="text-4xl font-bold text-green-500">{humanCount}</p>
            <p className="text-sm text-slate-400 mt-2">
              {totalAnalyzed > 0 ? Math.round((humanCount / totalAnalyzed) * 100) : 0}%
            </p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Verdict Distribution */}
          <Card className="bg-slate-900 border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Verdict Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={verdictData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* File Type Breakdown */}
          <Card className="bg-slate-900 border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Analysis by File Type</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fileTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top Generators */}
        {generatorData.length > 0 && (
          <Card className="bg-slate-900 border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Top Detected Generators</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={generatorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}
