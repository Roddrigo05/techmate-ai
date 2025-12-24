import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  MapPin, 
  FileText, 
  ArrowLeft, 
  Package,
  Wrench,
  ExternalLink
} from 'lucide-react';

interface Machine {
  id: string;
  model: string;
  location: string;
  manual_pdf_url: string | null;
  specifications: Record<string, unknown> | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface Part {
  id: string;
  name: string;
  stock_quantity: number;
}

interface Intervention {
  id: string;
  status: string;
  problem_description: string;
  created_at: string;
}

export default function MachineDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [machine, setMachine] = useState<Machine | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchMachineData(id);
    }
  }, [id]);

  const fetchMachineData = async (machineId: string) => {
    try {
      const [machineRes, partsRes, interventionsRes] = await Promise.all([
        supabase.from('machines').select('*').eq('id', machineId).single(),
        supabase.from('parts').select('id, name, stock_quantity').eq('compatible_machine_id', machineId),
        supabase.from('interventions').select('id, status, problem_description, created_at')
          .eq('machine_id', machineId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (machineRes.error) throw machineRes.error;
      
      setMachine(machineRes.data);
      setParts(partsRes.data || []);
      setInterventions(interventionsRes.data || []);
    } catch (error) {
      console.error('Error fetching machine:', error);
      navigate('/machines');
    } finally {
      setLoading(false);
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

  if (!machine) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Máquina não encontrada</p>
          <Link to="/machines">
            <Button variant="link">Voltar às máquinas</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/machines')}>
          <ArrowLeft className="h-4 w-4" />
          Voltar às máquinas
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">{machine.model}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {machine.location || 'Localização não definida'}
              </span>
              <Badge variant={machine.is_active ? 'default' : 'secondary'}>
                {machine.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
          </div>
          
          {machine.manual_pdf_url && (
            <Button className="gap-2 neon-glow" asChild>
              <a href={machine.manual_pdf_url} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4" />
                Ver Manual PDF
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            <Card className="card-hover overflow-hidden">
              <div className="aspect-video bg-muted/30 flex items-center justify-center">
                {machine.image_url ? (
                  <img 
                    src={machine.image_url} 
                    alt={machine.model}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Settings className="h-24 w-24 text-muted-foreground/20" />
                )}
              </div>
            </Card>

            {/* Specifications */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Especificações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {machine.specifications && typeof machine.specifications === 'object' && Object.keys(machine.specifications).length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Object.entries(machine.specifications).map(([key, value]) => (
                      <div key={key} className="rounded-lg border border-border bg-muted/30 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {key}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Nenhuma especificação definida
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Interventions */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Intervenções Recentes
                </CardTitle>
                <CardDescription>
                  Últimas {interventions.length} intervenções nesta máquina
                </CardDescription>
              </CardHeader>
              <CardContent>
                {interventions.length > 0 ? (
                  <div className="space-y-3">
                    {interventions.map((intervention) => (
                      <div
                        key={intervention.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {intervention.problem_description || 'Sem descrição'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(intervention.created_at).toLocaleDateString('pt-PT')}
                          </p>
                        </div>
                        <Badge variant={intervention.status === 'resolved' ? 'secondary' : 'default'}>
                          {intervention.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Nenhuma intervenção registada
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Compatible Parts */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Peças Compatíveis
                </CardTitle>
                <CardDescription>
                  {parts.length} peças disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {parts.length > 0 ? (
                  <div className="space-y-2">
                    {parts.map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                      >
                        <span className="text-sm font-medium">{part.name}</span>
                        <Badge 
                          variant={part.stock_quantity < 5 ? 'destructive' : 'outline'}
                          className="font-mono"
                        >
                          {part.stock_quantity}
                        </Badge>
                      </div>
                    ))}
                    <Link to="/inventory">
                      <Button variant="outline" className="w-full mt-2">
                        Ver Inventário Completo
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nenhuma peça associada
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/interventions/new" className="block">
                  <Button className="w-full gap-2 neon-glow">
                    <Wrench className="h-4 w-4" />
                    Nova Intervenção
                  </Button>
                </Link>
                <Button variant="outline" className="w-full">
                  Editar Máquina
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
