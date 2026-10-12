import { Card } from '@app/ui';

export type DashboardWelcomeViewProps = {
  title: string;
  subtitle: string;
};

export function DashboardWelcomeView({ title, subtitle }: DashboardWelcomeViewProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
    </Card>
  );
}
