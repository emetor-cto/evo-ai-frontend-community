import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';

const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

type SalesToolLayoutProps = {
  title: string;
  subtitle?: string;
  children: (year: number) => ReactNode;
};

export default function SalesToolLayout({ title, subtitle, children }: SalesToolLayoutProps) {
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2" asChild>
            <Link to="/sales-tools">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Ferramentas
            </Link>
          </Button>
          <BaseHeader title={title} subtitle={subtitle} />
        </div>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map(y => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {children(year)}
    </div>
  );
}
