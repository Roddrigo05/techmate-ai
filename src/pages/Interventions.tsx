import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { 
  Search, 
  Plus,
  Wrench,
  ArrowRight,
  Filter,
  Clock
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
  machine_id: string | null;
  technician_id: string | null;
  ai_solution: string | null;
}

export default function Interventions() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [machines, setMachines] = useState<Record<string, string>>({});
  const [technicians, setTechnicians] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [interventionsRes, machinesRes, techniciansRes] = await Promise.all([
        supabase
          .from('interventions')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('machines').select('id, model'),
        supabase.from('technicians').select('id, name'),
      ]);

      if (interventionsRes.data) setInterventions(interventionsRes.data);
      
      const machinesMap: Record<string, string> = {};
      machinesRes.data?.forEach(m => { machinesMap[m.id] = m.model; });
      setMachines(machinesMap);

      const techniciansMap: Record<string, string> = {};
      techniciansRes.data?.forEach(t => { techniciansMap[t.id] = t.name; });
      setTechnicians(techniciansMap);
    } catch (error) {
      console.error('Error fetching interventions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInterventions = interventions.filter(intervention => {
    const matchesSearch = 
      intervention.problem_description?.toLowerCase().includes(search.toLowerCase()) ||
      machines[intervention.machine_id || '']?.toLowerCase().includes(search.toLowerCase()) ||
      technicians[intervention.technician_id || '']?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || intervention.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Intervenções</h1>
            <p className="text-muted-foreground">
              Gestão de intervenções técnicas
            </p>
          </div>
          <Link to="/interventions/new">
            <Button className="gap-2 neon-glow">
              <Plus className="h-4 w-4" />
              Nova Intervenção
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar intervenções..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Progresso</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Interventions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredInterventions.length === 0 ? (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center text-center">
              <Wrench className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {search || statusFilter !== 'all' 
                  ? 'Nenhuma intervenção encontrada com os filtros aplicados' 
                  : 'Nenhuma intervenção registada'}
              </p>
              {!search && statusFilter === 'all' && (
                <Link to="/interventions/new" className="mt-4">
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar primeira intervenção
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInterventions.map((intervention) => (
              <Card key={intervention.id} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {machines[intervention.machine_id || ''] || 'Máquina não especificada'}
                        </h3>
                        <StatusBadge status={(intervention.status as any) || 'pending'} />
                        <PriorityBadge priority={(intervention.priority as any) || 'medium'} />
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {intervention.problem_description || 'Sem descrição do problema'}
                      </p>
                      
                      {intervention.ai_solution && (
                        <p className="text-xs text-primary/80 line-clamp-1">
                          💡 Solução IA disponível
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" />
                          {technicians[intervention.technician_id || ''] || 'Não atribuído'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(intervention.created_at), "d 'de' MMMM, HH:mm", { locale: pt })}
                        </span>
                      </div>
                    </div>
                    
                    <Link to={`/interventions/${intervention.id}`}>
                      <Button variant="secondary" size="sm" className="gap-1">
                        Ver
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
