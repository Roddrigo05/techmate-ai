import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Settings, Search, MapPin, FileText, ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Machine {
  id: string;
  model: string;
  location: string;
  manual_pdf_url: string | null;
  specifications: Record<string, unknown> | null;
  image_url: string | null;
  is_active: boolean;
}

export default function Machines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('model');

      if (error) throw error;
      setMachines(data || []);
    } catch (error) {
      console.error('Error fetching machines:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMachines = machines.filter(machine =>
    machine.model.toLowerCase().includes(search.toLowerCase()) ||
    machine.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Máquinas</h1>
            <p className="text-muted-foreground">
              Gestão de equipamentos industriais
            </p>
          </div>
          <Button className="gap-2 neon-glow">
            <Plus className="h-4 w-4" />
            Adicionar Máquina
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar máquinas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Machines Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredMachines.length === 0 ? (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center text-center">
              <Settings className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                {search ? 'Nenhuma máquina encontrada' : 'Nenhuma máquina registada'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMachines.map((machine) => (
              <Card key={machine.id} className="card-hover overflow-hidden">
                <div className="aspect-video bg-muted/30 flex items-center justify-center">
                  {machine.image_url ? (
                    <img 
                      src={machine.image_url} 
                      alt={machine.model}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Settings className="h-16 w-16 text-muted-foreground/30" />
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{machine.model}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {machine.location || 'Localização não definida'}
                      </CardDescription>
                    </div>
                    <Badge variant={machine.is_active ? 'default' : 'secondary'}>
                      {machine.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Specifications */}
                  {machine.specifications && typeof machine.specifications === 'object' && Object.keys(machine.specifications).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Especificações
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(machine.specifications).slice(0, 3).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {machine.manual_pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 flex-1"
                        asChild
                      >
                        <a href={machine.manual_pdf_url} target="_blank" rel="noopener noreferrer">
                          <FileText className="h-4 w-4" />
                          Ver Manual
                        </a>
                      </Button>
                    )}
                    <Link to={`/machines/${machine.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full gap-1">
                        Detalhes
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
