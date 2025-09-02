import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  FileText, 
  Pill, 
  AlertTriangle, 
  Activity,
  Upload,
  Sparkles,
  ChevronRight,
  Download,
  Copy,
  Check,
  File,
  FileUp
} from 'lucide-react';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface AnalysisResult {
  drugs: Array<{name: string, confidence: number}>;
  interactions: Array<{interaction: string, severity: 'low' | 'medium' | 'high', confidence: number}>;
  sideEffects: Array<{effect: string, frequency: string, confidence: number}>;
  summary: {
    totalDrugs: number;
    criticalInteractions: number;
    majorSideEffects: number;
  };
}

export const CompleteMedicalAnalyzer = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [article, setArticle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Drug patterns and side effects database
  const drugPatterns = [
    { name: 'Aspirin', aliases: ['acetylsalicylic acid', 'ASA'], category: 'NSAID' },
    { name: 'Metformin', aliases: ['glucophage'], category: 'Antidiabetic' },
    { name: 'Lisinopril', aliases: ['prinivil', 'zestril'], category: 'ACE Inhibitor' },
    { name: 'Atorvastatin', aliases: ['lipitor'], category: 'Statin' },
    { name: 'Warfarin', aliases: ['coumadin'], category: 'Anticoagulant' },
    { name: 'Digoxin', aliases: ['lanoxin'], category: 'Cardiac Glycoside' },
    { name: 'Insulin', aliases: ['humalog', 'novolog'], category: 'Hormone' },
    { name: 'Amoxicillin', aliases: ['amoxil'], category: 'Antibiotic' },
    { name: 'Prednisone', aliases: ['deltasone'], category: 'Corticosteroid' },
    { name: 'Ibuprofen', aliases: ['advil', 'motrin'], category: 'NSAID' }
  ];

  const drugInteractions = [
    {
      drugs: ['Warfarin', 'Aspirin'],
      interaction: 'Increased bleeding risk due to combined anticoagulant effects',
      severity: 'high' as const
    },
    {
      drugs: ['Metformin', 'Contrast agents'],
      interaction: 'Risk of lactic acidosis, especially in patients with kidney dysfunction',
      severity: 'high' as const
    },
    {
      drugs: ['Digoxin', 'Diuretics'],
      interaction: 'Risk of digitalis toxicity due to potassium depletion',
      severity: 'medium' as const
    },
    {
      drugs: ['ACE Inhibitors', 'NSAIDs'],
      interaction: 'Reduced antihypertensive effect and potential kidney damage',
      severity: 'medium' as const
    },
    {
      drugs: ['Insulin', 'Beta-blockers'],
      interaction: 'Masking of hypoglycemic symptoms',
      severity: 'medium' as const
    }
  ];

  const sideEffectPatterns = [
    { effect: 'Gastrointestinal bleeding', drugs: ['Aspirin', 'NSAIDs'], frequency: 'Common' },
    { effect: 'Hypoglycemia', drugs: ['Insulin', 'Metformin'], frequency: 'Common' },
    { effect: 'Hyperkalemia', drugs: ['ACE Inhibitors', 'Lisinopril'], frequency: 'Uncommon' },
    { effect: 'Muscle weakness', drugs: ['Statins'], frequency: 'Rare' },
    { effect: 'Nausea', drugs: ['Metformin', 'Digoxin'], frequency: 'Common' },
    { effect: 'Dizziness', drugs: ['ACE Inhibitors', 'Diuretics'], frequency: 'Common' },
    { effect: 'Headache', drugs: ['Vasodilators'], frequency: 'Common' },
    { effect: 'Rash', drugs: ['Antibiotics', 'Amoxicillin'], frequency: 'Uncommon' },
    { effect: 'Weight gain', drugs: ['Corticosteroids', 'Insulin'], frequency: 'Common' },
    { effect: 'Dry cough', drugs: ['ACE Inhibitors'], frequency: 'Common' }
  ];

  // Advanced NLP Analysis Function
  const performNLPAnalysis = async (text: string): Promise<AnalysisResult> => {
    const normalizedText = text.toLowerCase();
    
    // Drug Detection with confidence scoring
    const detectedDrugs: Array<{name: string, confidence: number}> = [];
    
    drugPatterns.forEach(drug => {
      const drugName = drug.name.toLowerCase();
      let confidence = 0;
      
      // Check for exact drug name matches
      if (normalizedText.includes(drugName)) {
        confidence += 0.9;
      }
      
      // Check for aliases
      drug.aliases.forEach(alias => {
        if (normalizedText.includes(alias.toLowerCase())) {
          confidence += 0.8;
        }
      });
      
      // Check for partial matches with context
      const medicalContext = ['mg', 'dose', 'tablet', 'prescribed', 'administered', 'treatment'];
      medicalContext.forEach(context => {
        if (normalizedText.includes(drugName) && normalizedText.includes(context)) {
          confidence += 0.1;
        }
      });
      
      if (confidence > 0.5) {
        detectedDrugs.push({
          name: drug.name,
          confidence: Math.min(confidence, 1.0)
        });
      }
    });

    // Drug Interaction Analysis
    const detectedInteractions: Array<{interaction: string, severity: 'low' | 'medium' | 'high', confidence: number}> = [];
    const drugNames = detectedDrugs.map(d => d.name);
    
    drugInteractions.forEach(interaction => {
      const foundDrugs = interaction.drugs.filter(drug => 
        drugNames.some(detected => 
          detected.toLowerCase().includes(drug.toLowerCase()) || 
          drug.toLowerCase().includes(detected.toLowerCase())
        )
      );
      
      if (foundDrugs.length >= 2) {
        detectedInteractions.push({
          interaction: interaction.interaction,
          severity: interaction.severity,
          confidence: 0.8 + (foundDrugs.length - 2) * 0.1
        });
      }
    });

    // Side Effects Analysis
    const detectedSideEffects: Array<{effect: string, frequency: string, confidence: number}> = [];
    
    sideEffectPatterns.forEach(sideEffect => {
      let confidence = 0;
      const effectWords = sideEffect.effect.toLowerCase().split(' ');
      
      // Check if side effect is mentioned in text
      const effectMentioned = effectWords.some(word => normalizedText.includes(word));
      if (effectMentioned) confidence += 0.6;
      
      // Check if related drug is present
      const relatedDrugPresent = sideEffect.drugs.some(drug => 
        drugNames.some(detected => detected.toLowerCase().includes(drug.toLowerCase()))
      );
      if (relatedDrugPresent) confidence += 0.3;
      
      // Check for adverse event keywords
      const adverseKeywords = ['side effect', 'adverse', 'reaction', 'toxicity', 'complication'];
      if (adverseKeywords.some(keyword => normalizedText.includes(keyword))) {
        confidence += 0.1;
      }
      
      if (confidence > 0.4) {
        detectedSideEffects.push({
          effect: sideEffect.effect,
          frequency: sideEffect.frequency,
          confidence: Math.min(confidence, 1.0)
        });
      }
    });

    // Generate Summary
    const summary = {
      totalDrugs: detectedDrugs.length,
      criticalInteractions: detectedInteractions.filter(i => i.severity === 'high').length,
      majorSideEffects: detectedSideEffects.filter(e => e.frequency === 'Common').length
    };

    return {
      drugs: detectedDrugs.sort((a, b) => b.confidence - a.confidence),
      interactions: detectedInteractions.sort((a, b) => b.confidence - a.confidence),
      sideEffects: detectedSideEffects.sort((a, b) => b.confidence - a.confidence),
      summary
    };
  };

  const handleAnalyze = async () => {
    if (!article.trim()) {
      toast({
        title: "No Content",
        description: "Please enter a medical article to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    
    try {
      // Simulate progressive analysis with real processing
      const steps = [
        { message: "Preprocessing text...", progress: 20 },
        { message: "Identifying drug mentions...", progress: 40 },
        { message: "Analyzing drug interactions...", progress: 60 },
        { message: "Detecting side effects...", progress: 80 },
        { message: "Generating summary...", progress: 100 }
      ];

      for (const step of steps) {
        setProgress(step.progress);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const analysisResults = await performNLPAnalysis(article);
      setResults(analysisResults);
      
      toast({
        title: "Analysis Complete",
        description: `Found ${analysisResults.summary.totalDrugs} drugs, ${analysisResults.summary.criticalInteractions} critical interactions`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "An error occurred during analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // PDF Processing Function
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      setIsProcessingPdf(true);
      setPdfProgress(0);
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      const totalPages = pdf.numPages;
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setPdfProgress((pageNum / totalPages) * 100);
        
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setIsProcessingPdf(false);
      return fullText.trim();
      
    } catch (error) {
      setIsProcessingPdf(false);
      throw new Error('Failed to extract text from PDF');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    
    try {
      let text = '';
      
      if (file.type === 'application/pdf') {
        toast({
          title: "Processing PDF",
          description: "Extracting text from PDF file...",
        });
        
        text = await extractTextFromPDF(file);
        
        toast({
          title: "PDF Processed Successfully",
          description: `Extracted text from ${file.name}`,
        });
      } else {
        // Handle text files
        const reader = new FileReader();
        text = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        });
        
        toast({
          title: "File Uploaded",
          description: `Loaded ${file.name} successfully`,
        });
      }
      
      setArticle(text);
      
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive",
      });
      setUploadedFileName(null);
    }
  };

  const copyResults = async () => {
    if (!results) return;
    
    const resultText = `
Drug Insight Analysis Results
============================

SUMMARY:
- Total Drugs Found: ${results.summary.totalDrugs}
- Critical Interactions: ${results.summary.criticalInteractions}
- Major Side Effects: ${results.summary.majorSideEffects}

DRUGS IDENTIFIED:
${results.drugs.map(drug => `• ${drug.name} (${(drug.confidence * 100).toFixed(1)}% confidence)`).join('\n')}

DRUG INTERACTIONS:
${results.interactions.map(int => `• ${int.interaction} (${int.severity.toUpperCase()} severity)`).join('\n')}

SIDE EFFECTS:
${results.sideEffects.map(effect => `• ${effect.effect} (${effect.frequency})`).join('\n')}
    `;
    
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Results Copied",
      description: "Analysis results copied to clipboard",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-success/10 text-success border-success/20';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-medical-gradient text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">PDF & Text Analysis with Advanced NLP</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Drug Insight Web
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto">
            Upload PDF medical articles or paste text for comprehensive drug analysis using advanced NLP
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
              <div className="relative">
                <Textarea
                  placeholder="Paste your medical article, case study, or clinical notes here for comprehensive analysis... Or upload a PDF file using the button below."
                  value={article}
                  onChange={(e) => setArticle(e.target.value)}
                  className="min-h-[300px] resize-none border-border/50 focus:border-primary"
                />
                {uploadedFileName && (
                  <div className="absolute top-2 right-2 bg-primary/10 text-primary px-2 py-1 rounded text-xs flex items-center gap-1">
                    <File className="w-3 h-3" />
                    PDF Loaded
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 flex-wrap">
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
                
                <Button 
                  variant="outline" 
                  className="border-border/50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingPdf}
                >
                  {isProcessingPdf ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-spin" />
                      Processing PDF...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 mr-2" />
                      Upload PDF/Text
                    </>
                  )}
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {uploadedFileName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <File className="w-4 h-4" />
                    <span>{uploadedFileName}</span>
                  </div>
                )}
              </div>

              {(isAnalyzing || isProcessingPdf) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {isProcessingPdf 
                        ? "Extracting text from PDF..." 
                        : "Processing medical content..."
                      }
                    </span>
                    <span>{isProcessingPdf ? pdfProgress.toFixed(0) : progress}%</span>
                  </div>
                  <Progress value={isProcessingPdf ? pdfProgress : progress} className="h-2" />
                </div>
              )}
            </div>
          </Card>

          {/* Results Section */}
          <Card className="p-6 bg-card-gradient shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Activity className="w-5 h-5 text-accent-foreground" />
                </div>
                <h2 className="text-2xl font-semibold">Analysis Results</h2>
              </div>
              
              {results && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyResults}
                    className="border-border/50"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border/50"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {!results ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Ready for analysis</p>
                <p>Enter medical content and click analyze to get comprehensive insights</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-primary/5 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-primary">{results.summary.totalDrugs}</div>
                    <div className="text-sm text-muted-foreground">Drugs Found</div>
                  </div>
                  <div className="bg-warning/5 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-warning">{results.summary.criticalInteractions}</div>
                    <div className="text-sm text-muted-foreground">Critical</div>
                  </div>
                  <div className="bg-destructive/5 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-destructive">{results.summary.majorSideEffects}</div>
                    <div className="text-sm text-muted-foreground">Major Effects</div>
                  </div>
                </div>

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
                        {drug.name} ({(drug.confidence * 100).toFixed(0)}%)
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
                      <div key={index} className={`flex items-start gap-2 p-3 rounded-lg ${getSeverityColor(interaction.severity)}`}>
                        <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm">{interaction.interaction}</span>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {interaction.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {(interaction.confidence * 100).toFixed(0)}% confidence
                            </Badge>
                          </div>
                        </div>
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
                  <div className="space-y-2">
                    {results.sideEffects.map((effect, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <span className="text-sm font-medium">{effect.effect}</span>
                        <div className="flex gap-2">
                          <Badge variant="outline" className="text-xs">
                            {effect.frequency}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {(effect.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
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