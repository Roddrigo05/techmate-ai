import { cn } from '@/lib/utils';

type Status = 'pending' | 'in_progress' | 'resolved' | 'cancelled';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: {
    label: 'Pendente',
    className: 'bg-warning/20 text-warning border-warning/30',
  },
  in_progress: {
    label: 'Em Progresso',
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  resolved: {
    label: 'Resolvido',
    className: 'bg-success/20 text-success border-success/30',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-muted text-muted-foreground border-muted',
  },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low: {
    label: 'Baixa',
    className: 'bg-muted text-muted-foreground border-muted',
  },
  medium: {
    label: 'Média',
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  high: {
    label: 'Alta',
    className: 'bg-warning/20 text-warning border-warning/30',
  },
  critical: {
    label: 'Crítica',
    className: 'bg-destructive/20 text-destructive border-destructive/30',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        status === 'pending' && 'bg-warning status-pulse',
        status === 'in_progress' && 'bg-primary status-pulse',
        status === 'resolved' && 'bg-success',
        status === 'cancelled' && 'bg-muted-foreground'
      )} />
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.medium;
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
