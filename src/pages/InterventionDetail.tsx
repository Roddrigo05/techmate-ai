import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Wrench, 
  Settings, 
  User, 
  Clock,
  Sparkles,
  CheckCircle,
  XCircle,
  Play
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Intervention {
  id: string;
  problem_description: string | null;
  status: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  machine_id: string | null;
  technician_id: string | null;
  ai_solution: string | null;
}

interface Machine {
  id: string;
  model: string;
  location: string | null;
}

interface Technician {
  id: string;
  name: string;
  specialty: string | null;
}

export default function InterventionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData(id);
    }
  }, [id]);

  const fetchData = async (interventionId: string) => {
    try {
      const { data: interventionData, error } = await supabase
        .from('interventions')
        .select('*')
        .eq('id', interventionId)
        .single();

      if (error) throw error;
      setIntervention(interventionData);

      // Fetch machine
      if (interventionData.machine_id) {
        const { data: machineData } = await supabase
          .from('machines')
          .select('id, model, location')
          .eq('id', interventionData.machine_id)
          .single();
        setMachine(machineData);
      }

      // Fetch technician
      if (interventionData.technician_id) {
        const { data: techData } = await supabase
          .from('technicians')
          .select('id, name, specialty')
          .eq('id', interventionData.technician_id)
          .single();
        setTechnician(techData);
      }
    } catch (error) {
      console.error('Error fetching intervention:', error);
      navigate('/interventions');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!intervention) return;
    
    setUpdating(true);
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('interventions')
        .update(updateData)
        .eq('id', intervention.id);

      if (error) throw error;

      setIntervention({ ...intervention, status: newStatus });
      toast({
        title: 'Estado atualizado',
        description: `Intervenção marcada como ${newStatus === 'resolved' ? 'resolvida' : newStatus === 'in_progress' ? 'em progresso' : newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o estado.',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!intervention) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Intervenção não encontrada</p>
          <Link to="/interventions">
            <Button variant="link">Voltar às intervenções</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/interventions')}>
          <ArrowLeft className="h-4 w-4" />
          Voltar às intervenções
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {machine?.model || 'Intervenção'}
              </h1>
              <StatusBadge status={(intervention.status as any) || 'pending'} />
              <PriorityBadge priority={(intervention.priority as any) || 'medium'} />
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Criada em {format(new Date(intervention.created_at), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {intervention.status === 'pending' && (
              <Button 
                onClick={() => updateStatus('in_progress')}
                disabled={updating}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
            )}
            {intervention.status === 'in_progress' && (
              <Button 
                onClick={() => updateStatus('resolved')}
                disabled={updating}
                className="gap-2 neon-glow"
              >
                <CheckCircle className="h-4 w-4" />
                Resolver
              </Button>
            )}
            {(intervention.status === 'pending' || intervention.status === 'in_progress') && (
              <Button 
                variant="outline"
                onClick={() => updateStatus('cancelled')}
                disabled={updating}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem Description */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-warning" />
                  Descrição do Problema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">
                  {intervention.problem_description || 'Sem descrição disponível'}
                </p>
              </CardContent>
            </Card>

            {/* AI Solution */}
            {intervention.ai_solution && (
              <Card className="card-hover border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Solução Sugerida pela IA
                  </CardTitle>
                  <CardDescription>
                    Gerada automaticamente com base no problema descrito
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm text-foreground">
                    {intervention.ai_solution}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Machine Info */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-5 w-5 text-primary" />
                  Máquina
                </CardTitle>
              </CardHeader>
              <CardContent>
                {machine ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{machine.model}</p>
                    <p className="text-sm text-muted-foreground">{machine.location || 'Localização não definida'}</p>
                    <Link to={`/machines/${machine.id}`}>
                      <Button variant="outline" size="sm" className="mt-2 w-full">
                        Ver detalhes
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Máquina não especificada</p>
                )}
              </CardContent>
            </Card>

            {/* Technician Info */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5 text-primary" />
                  Técnico Responsável
                </CardTitle>
              </CardHeader>
              <CardContent>
                {technician ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{technician.name}</p>
                    <p className="text-sm text-muted-foreground">{technician.specialty || 'Especialidade não definida'}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Técnico não atribuído</p>
                )}
              </CardContent>
            </Card>

            {/* Status Update */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-base">Alterar Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  value={intervention.status || 'pending'} 
                  onValueChange={updateStatus}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-base">Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">
                      Criada em {format(new Date(intervention.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  {intervention.resolved_at && (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-muted-foreground">
                        Resolvida em {format(new Date(intervention.resolved_at), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
