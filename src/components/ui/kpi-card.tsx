import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'warning' | 'success' | 'primary';
  className?: string;
}

const variantStyles = {
  default: 'border-border',
  warning: 'border-warning/30 bg-warning/5',
  success: 'border-success/30 bg-success/5',
  primary: 'border-primary/30 bg-primary/5',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  warning: 'bg-warning/20 text-warning',
  success: 'bg-success/20 text-success',
  primary: 'bg-primary/20 text-primary',
};

export function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  variant = 'default',
  className 
}: KPICardProps) {
  return (
    <Card className={cn(
      'card-hover overflow-hidden',
      variantStyles[variant],
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground">{value}</p>
              {trend && (
                <span className={cn(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            iconStyles[variant]
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
