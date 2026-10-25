import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLang } from '@/lib/lang';
import { cn } from '@/lib/utils';

// Searchable store picker (by store name or town).
export default function StoreCombobox({ stores, value, onChange, disabled, placeholder }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const selected = stores.find((s) => s.id === value);
  const options = stores.filter((s) => s.is_active !== false || s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" disabled={disabled} className="h-10 w-full justify-between bg-card font-normal">
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? `${selected.name} · ${selected.town}` : placeholder || t('בחירת חנות', 'Select a store')}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
        <Command>
          <CommandInput placeholder={t('חיפוש חנות או עיר...', 'Search store or town...')} />
          <CommandList>
            <CommandEmpty>{t('לא נמצאו חנויות', 'No stores found')}</CommandEmpty>
            <CommandGroup>
              {options.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.name} ${s.town}`}
                  onSelect={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('h-4 w-4', value === s.id ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{s.name}</span>
                  <span className="ms-auto shrink-0 text-xs text-muted-foreground">{s.town}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}