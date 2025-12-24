import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  MicOff, 
  Loader2, 
  Sparkles, 
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Machine {
  id: string;
  model: string;
  location: string;
}

interface Technician {
  id: string;
  name: string;
  specialty: string;
}

type ProcessingStep = 'idle' | 'recording' | 'transcribing' | 'generating' | 'complete';

export default function NewIntervention() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [machines, setMachines] = useState<Machine[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [aiSolution, setAiSolution] = useState<string>('');
  
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [machinesRes, techniciansRes] = await Promise.all([
      supabase.from('machines').select('id, model, location').eq('is_active', true),
      supabase.from('technicians').select('id, name, specialty').eq('is_active', true),
    ]);

    if (machinesRes.data) setMachines(machinesRes.data);
    if (techniciansRes.data) setTechnicians(techniciansRes.data);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processAudio();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setProcessingStep('recording');
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no microfone',
        description: 'Não foi possível aceder ao microfone. Verifique as permissões.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    setProcessingStep('transcribing');
    
    try {
      // Convert audio to base64
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Transcribe audio
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke(
        'transcribe-audio',
        { body: { audio: base64Audio } }
      );

      if (transcribeError) throw transcribeError;
      
      const transcribedText = transcribeData.text;
      setProblemDescription(transcribedText);
      
      // Generate AI solution
      setProcessingStep('generating');
      
      const selectedMachineData = machines.find(m => m.id === selectedMachine);
      
      const { data: solutionData, error: solutionError } = await supabase.functions.invoke(
        'generate-solution',
        { 
          body: { 
            problemDescription: transcribedText,
            machineName: selectedMachineData?.model,
            machineLocation: selectedMachineData?.location,
          } 
        }
      );

      if (solutionError) throw solutionError;
      
      setAiSolution(solutionData.solution);
      setProcessingStep('complete');
      
      toast({
        title: 'Processamento concluído',
        description: 'Áudio transcrito e solução gerada com sucesso!',
      });
      
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingStep('idle');
      toast({
        variant: 'destructive',
        title: 'Erro no processamento',
        description: 'Ocorreu um erro ao processar o áudio. Tente novamente.',
      });
    }
  };

  const handleSave = async () => {
    if (!selectedMachine || !selectedTechnician || !problemDescription) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
      });
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase.from('interventions').insert({
        machine_id: selectedMachine,
        technician_id: selectedTechnician,
        problem_description: problemDescription,
        ai_solution: aiSolution,
        status: 'pending',
        priority: 'medium',
      });

      if (error) throw error;

      toast({
        title: 'Intervenção criada',
        description: 'A intervenção foi registada com sucesso.',
      });
      
      navigate('/');
      
    } catch (error) {
      console.error('Save error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao guardar',
        description: 'Não foi possível guardar a intervenção.',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStepStatus = (step: ProcessingStep) => {
    const steps: ProcessingStep[] = ['recording', 'transcribing', 'generating', 'complete'];
    const currentIndex = steps.indexOf(processingStep);
    const stepIndex = steps.indexOf(step);
    
    if (processingStep === 'idle') return 'idle';
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nova Intervenção</h1>
          <p className="text-muted-foreground">
            Use o microfone para descrever o problema ou escreva manualmente
          </p>
        </div>

        {/* Selection Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg">Máquina</CardTitle>
              <CardDescription>Selecione a máquina com o problema</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar máquina..." />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.model} - {machine.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-lg">Técnico</CardTitle>
              <CardDescription>Selecione o técnico responsável</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar técnico..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name} - {tech.specialty || 'Geral'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Voice Recording Section */}
        <Card className="card-hover overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Gravação de Voz
            </CardTitle>
            <CardDescription>
              Clique no microfone para gravar o diagnóstico do problema
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6 py-8">
            {/* Microphone Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={processingStep === 'transcribing' || processingStep === 'generating'}
              className={cn(
                'relative flex h-32 w-32 items-center justify-center rounded-full border-4 transition-all duration-300',
                isRecording
                  ? 'border-destructive bg-destructive/20 pulse-mic-recording'
                  : 'border-primary bg-primary/20 pulse-mic hover:bg-primary/30',
                (processingStep === 'transcribing' || processingStep === 'generating') && 
                  'cursor-not-allowed opacity-50'
              )}
            >
              {isRecording ? (
                <MicOff className="h-12 w-12 text-destructive" />
              ) : (
                <Mic className="h-12 w-12 text-primary" />
              )}
            </button>

            <p className="text-sm text-muted-foreground">
              {isRecording 
                ? 'A gravar... Clique para parar' 
                : processingStep === 'idle' 
                  ? 'Clique para começar a gravar'
                  : processingStep === 'transcribing'
                    ? 'A transcrever áudio...'
                    : processingStep === 'generating'
                      ? 'A gerar solução IA...'
                      : 'Processamento concluído!'
              }
            </p>

            {/* Processing Steps */}
            {processingStep !== 'idle' && (
              <div className="flex items-center gap-4">
                {(['recording', 'transcribing', 'generating', 'complete'] as ProcessingStep[]).map((step, index) => {
                  const status = getStepStatus(step);
                  const labels = {
                    recording: 'Gravação',
                    transcribing: 'Transcrição',
                    generating: 'IA',
                    complete: 'Concluído'
                  };
                  
                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                        status === 'complete' && 'bg-success text-success-foreground',
                        status === 'active' && 'bg-primary text-primary-foreground animate-pulse',
                        status === 'pending' && 'bg-muted text-muted-foreground',
                        status === 'idle' && 'bg-muted text-muted-foreground'
                      )}>
                        {status === 'complete' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : status === 'active' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={cn(
                        'text-xs',
                        status === 'active' ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {labels[step]}
                      </span>
                      {index < 3 && (
                        <div className={cn(
                          'h-0.5 w-8',
                          status === 'complete' ? 'bg-success' : 'bg-muted'
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Problem Description */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Descrição do Problema
            </CardTitle>
            <CardDescription>
              Descrição do problema (preenchida automaticamente pela voz ou manualmente)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="Descreva o problema aqui ou use o microfone..."
              className="min-h-[120px] resize-none"
            />
          </CardContent>
        </Card>

        {/* AI Solution */}
        {aiSolution && (
          <Card className="card-hover border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Solução Sugerida pela IA
              </CardTitle>
              <CardDescription>
                Sugestão gerada automaticamente com base no problema descrito
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm prose-invert max-w-none">
                <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm text-foreground">
                  {aiSolution}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !problemDescription || !selectedMachine || !selectedTechnician}
            className="gap-2 neon-glow"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Intervenção
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
