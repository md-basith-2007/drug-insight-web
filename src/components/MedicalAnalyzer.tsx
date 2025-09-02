import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Pill, 
  AlertTriangle, 
  Activity,
  Upload,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface AnalysisResult {
  drugs: string[];
  interactions: string[];
  sideEffects: string[];
}

export const MedicalAnalyzer = () => {
  const { toast } = useToast();
  const [article, setArticle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult | null>(null);

  const simulateAnalysis = async () => {
    setIsAnalyzing(true);
    setProgress(0);
    
    // Simulate progressive analysis
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Mock results based on common medical terms
    const mockResults: AnalysisResult = {
      drugs: [
        'Aspirin', 'Metformin', 'Lisinopril', 'Atorvastatin', 
        'Warfarin', 'Digoxin', 'Insulin'
      ].filter(() => Math.random() > 0.6),
      interactions: [
        'Warfarin + Aspirin: Increased bleeding risk',
        'Metformin + Contrast agents: Risk of lactic acidosis',
        'Digoxin + Diuretics: Risk of digitalis toxicity'
      ].filter(() => Math.random() > 0.5),
      sideEffects: [
        'Gastrointestinal bleeding', 'Hypoglycemia', 'Hyperkalemia',
        'Muscle weakness', 'Nausea', 'Dizziness', 'Headache'
      ].filter(() => Math.random() > 0.4)
    };

    setResults(mockResults);
    setIsAnalyzing(false);
    
    toast({
      title: "Analysis Complete",
      description: "Medical article has been successfully analyzed",
    });
  };

  const handleAnalyze = () => {
    if (!article.trim()) {
      toast({
        title: "No Content",
        description: "Please enter a medical article to analyze",
        variant: "destructive",
      });
      return;
    }
    simulateAnalysis();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-medical-gradient text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Medical Analysis</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Drug Insight Web
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            Advanced NLP analysis to identify drug mentions, interactions, and side effects in medical literature
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="p-6 bg-card-gradient shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">Medical Article Input</h2>
            </div>
            
            <div className="space-y-4">
              <Textarea
                placeholder="Paste your medical article text here for analysis..."
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                className="min-h-[300px] resize-none border-border/50 focus:border-primary"
              />
              
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Article
                    </>
                  )}
                </Button>
                
                <Button variant="outline" className="border-border/50">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>

              {isAnalyzing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>
          </Card>

          {/* Results Section */}
          <Card className="p-6 bg-card-gradient shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Activity className="w-5 h-5 text-accent-foreground" />
              </div>
              <h2 className="text-2xl font-semibold">Analysis Results</h2>
            </div>

            {!results ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No analysis yet</p>
                <p>Enter a medical article and click analyze to see results</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Drugs Found */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Pill className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Drugs Identified</h3>
                    <Badge variant="secondary">{results.drugs.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {results.drugs.map((drug, index) => (
                      <Badge key={index} className="bg-primary/10 text-primary border-primary/20">
                        {drug}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Drug Interactions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <h3 className="text-lg font-semibold">Drug Interactions</h3>
                    <Badge variant="secondary">{results.interactions.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {results.interactions.map((interaction, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-warning/5 border border-warning/20 rounded-lg">
                        <ChevronRight className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{interaction}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Side Effects */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-destructive" />
                    <h3 className="text-lg font-semibold">Side Effects</h3>
                    <Badge variant="secondary">{results.sideEffects.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {results.sideEffects.map((effect, index) => (
                      <Badge key={index} className="bg-destructive/10 text-destructive border-destructive/20">
                        {effect}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};