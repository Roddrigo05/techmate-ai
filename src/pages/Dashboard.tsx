import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { KPICard } from '@/components/ui/kpi-card';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertCircle, 
  Package, 
  Users, 
  Plus, 
  ArrowRight,
  Settings,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Intervention {
  id: string;
  problem_description: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  machine_id: string;
  technician_id: string;
}

interface DashboardStats {
  pendingInterventions: number;
  lowStockParts: number;
  activeTechnicians: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingInterventions: 0,
    lowStockParts: 0,
    activeTechnicians: 0,
  });
  const [recentInterventions, setRecentInterventions] = useState<Intervention[]>([]);
  const [machines, setMachines] = useState<Record<string, string>>({});
  const [technicians, setTechnicians] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch pending interventions count
      const { count: pendingCount } = await supabase
        .from('interventions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);

      // Fetch low stock parts count
      const { data: partsData } = await supabase
        .from('parts')
        .select('stock_quantity, min_stock_level');
      
      const lowStockCount = partsData?.filter(
        part => part.stock_quantity < (part.min_stock_level || 5)
      ).length || 0;

      // Fetch active technicians count
      const { count: techCount } = await supabase
        .from('technicians')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch recent interventions
      const { data: interventionsData } = await supabase
        .from('interventions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch machines for display
      const { data: machinesData } = await supabase
        .from('machines')
        .select('id, model');
      
      const machinesMap: Record<string, string> = {};
      machinesData?.forEach(m => { machinesMap[m.id] = m.model; });

      // Fetch technicians for display
      const { data: techniciansData } = await supabase
        .from('technicians')
        .select('id, name');
      
      const techniciansMap: Record<string, string> = {};
      techniciansData?.forEach(t => { techniciansMap[t.id] = t.name; });

      setStats({
        pendingInterventions: pendingCount || 0,
        lowStockParts: lowStockCount,
        activeTechnicians: techCount || 0,
      });

      setRecentInterventions((interventionsData || []) as Intervention[]);
      setMachines(machinesMap);
      setTechnicians(techniciansMap);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do sistema de manutenção
            </p>
          </div>
          <Link to="/interventions/new">
            <Button className="gap-2 neon-glow">
              <Plus className="h-4 w-4" />
              Nova Intervenção
            </Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-3 stagger-children">
          <KPICard
            title="Intervenções Pendentes"
            value={stats.pendingInterventions}
            subtitle="Aguardam resolução"
            icon={<AlertCircle className="h-6 w-6" />}
            variant={stats.pendingInterventions > 5 ? 'warning' : 'primary'}
          />
          <KPICard
            title="Peças com Stock Baixo"
            value={stats.lowStockParts}
            subtitle="Abaixo do mínimo"
            icon={<Package className="h-6 w-6" />}
            variant={stats.lowStockParts > 0 ? 'warning' : 'success'}
          />
          <KPICard
            title="Técnicos Ativos"
            value={stats.activeTechnicians}
            subtitle="Disponíveis para intervenções"
            icon={<Users className="h-6 w-6" />}
            variant="default"
          />
        </div>

        {/* Recent Interventions */}
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Intervenções Recentes
              </CardTitle>
              <CardDescription>
                Últimas intervenções registadas no sistema
              </CardDescription>
            </div>
            <Link to="/interventions">
              <Button variant="ghost" size="sm" className="gap-1">
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : recentInterventions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Settings className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Nenhuma intervenção registada ainda
                </p>
                <Link to="/interventions/new" className="mt-4">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar primeira intervenção
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentInterventions.map((intervention) => (
                  <div
                    key={intervention.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {machines[intervention.machine_id] || 'Máquina não especificada'}
                        </p>
                        <StatusBadge status={intervention.status} />
                        <PriorityBadge priority={intervention.priority} />
                      </div>
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {intervention.problem_description || 'Sem descrição'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Técnico: {technicians[intervention.technician_id] || 'Não atribuído'} • 
                        {format(new Date(intervention.created_at), " d 'de' MMMM, HH:mm", { locale: pt })}
                      </p>
                    </div>
                    <Link to={`/interventions/${intervention.id}`}>
                      <Button variant="ghost" size="icon">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
