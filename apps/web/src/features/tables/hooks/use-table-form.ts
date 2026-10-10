import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const tableFormSchema = z.object({
  label: z.string().trim().min(1).max(50),
});

export type TableFormValues = z.infer<typeof tableFormSchema>;

export function useTableForm() {
  return useForm<TableFormValues, unknown, TableFormValues>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: { label: '' },
  });
}
