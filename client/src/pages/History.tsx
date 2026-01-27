import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Loader2, Download, X, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";

type VerdictFilter = "ai" | "human" | null;
type FileTypeFilter = "image" | "audio" | "video" | "text" | null;

export default function History() {
  const [, navigate] = useLocation();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>(null);
  const [fileTypeFilter, setFileTypeFilter] = useState<FileTypeFilter>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Use filtered history if any filters are applied
  const hasFilters = verdictFilter || fileTypeFilter || startDate || endDate;
  
  const { data: results, isLoading, error } = trpc.detection.getFilteredHistory.useQuery(
    {
      verdict: verdictFilter || undefined,
      fileType: fileTypeFilter || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: 100,
    },
    { enabled: !!hasFilters }
  );

  const { data: allResults, isLoading: isLoadingAll } = trpc.detection.getHistory.useQuery(
    { limit: 100 },
    { enabled: !!(!hasFilters) }
  );

  const displayResults = hasFilters ? results : allResults;
  const isLoadingResults = hasFilters ? isLoading : isLoadingAll;

  const getVerdictIcon = (verdict: "ai" | "human") => {
    if (verdict === "ai") {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getVerdictLabel = (verdict: "ai" | "human") => {
    return verdict === "ai" ? "AI-Generated" : "Authentic";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatGenerator = (generator: string | null) => {
    if (!generator) return "Unknown";
    return generator
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayResults?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayResults?.map((r) => r.id) || []));
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one result to export");
      return;
    }

    try {
      const response = await fetch("/api/trpc/detection.exportResults", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            ids: Array.from(selectedIds),
            format,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const result = await response.json();
      const data = result.result.data;

      // Create blob and download
      const blob = new Blob([data], {
        type: format === "csv" ? "text/csv" : "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `detection-results.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${selectedIds.size} results as ${format.toUpperCase()}`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export results");
    }
  };

  const clearFilters = () => {
    setVerdictFilter(null);
    setFileTypeFilter(null);
    setStartDate("");
    setEndDate("");
  };

  if (isLoadingResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600 mt-4">Loading your detection history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Card className="border-2 border-red-200 bg-red-50 p-6">
            <p className="text-red-900">Failed to load detection history. Please try again.</p>
          </Card>
        </div>
      </div>
    );
  }

  const isEmpty = !displayResults || displayResults.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Detection History</h1>
          <p className="text-slate-600">
            View all your previous AI content detection analyses
          </p>
        </div>

        {isEmpty ? (
          <Card className="border-2 border-slate-200 p-12 text-center bg-white">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">No detections yet</h2>
            <p className="text-slate-600 mb-6">
              Start by uploading an image, audio, or video file to analyze
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Go to Upload
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="border border-slate-200 p-6 bg-white">
                <p className="text-sm text-slate-600 mb-1">Total Analyses</p>
                <p className="text-3xl font-bold text-slate-900">{displayResults?.length || 0}</p>
              </Card>
              <Card className="border border-slate-200 p-6 bg-white">
                <p className="text-sm text-slate-600 mb-1">AI-Generated</p>
                <p className="text-3xl font-bold text-red-600">
                  {displayResults?.filter((r) => r.verdict === "ai").length || 0}
                </p>
              </Card>
              <Card className="border border-slate-200 p-6 bg-white">
                <p className="text-sm text-slate-600 mb-1">Authentic</p>
                <p className="text-3xl font-bold text-green-600">
                  {displayResults?.filter((r) => r.verdict === "human").length || 0}
                </p>
              </Card>
            </div>

            {/* Advanced Filters */}
            <Card className="border border-slate-200 p-4 bg-white mb-6">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-between text-left font-semibold text-slate-900 hover:text-blue-600 transition-colors"
              >
                <span>🔍 Advanced Filters</span>
                <span className="text-sm text-slate-600">{showFilters ? "Hide" : "Show"}</span>
              </button>

              {showFilters && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Verdict Filter */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Verdict
                      </label>
                      <select
                        value={verdictFilter || ""}
                        onChange={(e) => setVerdictFilter((e.target.value as VerdictFilter) || null)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Verdicts</option>
                        <option value="ai">AI-Generated</option>
                        <option value="human">Authentic</option>
                      </select>
                    </div>

                    {/* File Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        File Type
                      </label>
                      <select
                        value={fileTypeFilter || ""}
                        onChange={(e) => setFileTypeFilter((e.target.value as FileTypeFilter) || null)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Types</option>
                        <option value="image">Image</option>
                        <option value="audio">Audio</option>
                        <option value="video">Video</option>
                        <option value="text">Text</option>
                      </select>
                    </div>

                    {/* Start Date Filter */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* End Date Filter */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {hasFilters && (
                    <div className="flex justify-end">
                      <Button
                        onClick={clearFilters}
                        className="bg-slate-300 hover:bg-slate-400 text-slate-900 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Clear Filters
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Batch Export Controls */}
            {selectedIds.size > 0 && (
              <Card className="border border-blue-200 bg-blue-50 p-4 mb-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      {selectedIds.size} result{selectedIds.size !== 1 ? "s" : ""} selected
                    </p>
                    <p className="text-xs text-blue-700">
                      Export selected results as CSV or JSON
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExport("csv")}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
                    <Button
                      onClick={() => handleExport("json")}
                      className="bg-slate-600 hover:bg-slate-700 text-white flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export JSON
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === displayResults?.length && displayResults.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      File
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Verdict
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Confidence
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Generator
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayResults?.map((result) => {
                    const confidence = parseFloat(result.confidence);
                    const confidencePercent = (confidence * 100).toFixed(1);
                    const isSelected = selectedIds.has(result.id);

                    return (
                      <tr
                        key={result.id}
                        className={`border-b border-slate-200 transition-colors ${
                          isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(result.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {result.fileName}
                              </p>
                              <p className="text-xs text-slate-600">
                                {result.fileSize ? formatFileSize(result.fileSize) : "Text input"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium capitalize">
                            {result.fileType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getVerdictIcon(result.verdict)}
                            <span className="text-sm font-medium text-slate-900">
                              {getVerdictLabel(result.verdict)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full ${
                                  result.verdict === "ai"
                                    ? "bg-red-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-900 w-12">
                              {confidencePercent}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">
                            {result.verdict === "ai"
                              ? formatGenerator(result.detectedGenerator)
                              : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {format(new Date(result.createdAt), "MMM d, yyyy HH:mm")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
