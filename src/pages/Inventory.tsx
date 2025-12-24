import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, Search, AlertTriangle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Part {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock_level: number;
  compatible_machine_id: string | null;
  unit_price: number | null;
}

interface Machine {
  id: string;
  model: string;
}

export default function Inventory() {
  const [parts, setParts] = useState<Part[]>([]);
  const [machines, setMachines] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [partsRes, machinesRes] = await Promise.all([
        supabase.from('parts').select('*').order('name'),
        supabase.from('machines').select('id, model'),
      ]);

      if (partsRes.data) setParts(partsRes.data);
      
      if (machinesRes.data) {
        const map: Record<string, string> = {};
        machinesRes.data.forEach(m => { map[m.id] = m.model; });
        setMachines(map);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredParts = parts.filter(part =>
    part.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = parts.filter(p => p.stock_quantity < (p.min_stock_level || 5)).length;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inventário</h1>
            <p className="text-muted-foreground">
              Gestão de peças e stock
            </p>
          </div>
          <Button className="gap-2 neon-glow">
            <Plus className="h-4 w-4" />
            Adicionar Peça
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{parts.length}</p>
                <p className="text-sm text-muted-foreground">Total de Peças</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className={cn(
            'card-hover',
            lowStockCount > 0 && 'border-warning/30 bg-warning/5'
          )}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl',
                lowStockCount > 0 ? 'bg-warning/20' : 'bg-success/20'
              )}>
                <AlertTriangle className={cn(
                  'h-6 w-6',
                  lowStockCount > 0 ? 'text-warning' : 'text-success'
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold">{lowStockCount}</p>
                <p className="text-sm text-muted-foreground">Stock Baixo</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-hover">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {parts.reduce((sum, p) => sum + p.stock_quantity, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Unidades Totais</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Table */}
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Peças</CardTitle>
                <CardDescription>
                  {filteredParts.length} peças encontradas
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar peças..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredParts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  {search ? 'Nenhuma peça encontrada' : 'Nenhuma peça registada'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Peça</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Mín. Stock</TableHead>
                    <TableHead>Máquina Compatível</TableHead>
                    <TableHead>Preço Unit.</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => {
                    const isLowStock = part.stock_quantity < (part.min_stock_level || 5);
                    
                    return (
                      <TableRow key={part.id}>
                        <TableCell className="font-medium">{part.name}</TableCell>
                        <TableCell className={cn(
                          'font-mono',
                          isLowStock && 'text-destructive font-bold'
                        )}>
                          {part.stock_quantity}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {part.min_stock_level || 5}
                        </TableCell>
                        <TableCell>
                          {part.compatible_machine_id 
                            ? machines[part.compatible_machine_id] || 'N/A'
                            : <span className="text-muted-foreground">Universal</span>
                          }
                        </TableCell>
                        <TableCell className="font-mono">
                          {part.unit_price 
                            ? `€${part.unit_price.toFixed(2)}`
                            : <span className="text-muted-foreground">-</span>
                          }
                        </TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Stock Baixo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-success/20 text-success">
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
