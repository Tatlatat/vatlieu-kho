"use client";
import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { ChevronDownIcon } from "lucide-react";

interface Material {
  id: string;
  name: string;
  code: string;
  unit: string;
}

export function SearchableMaterialSelect({
  materials,
  name,
  value,
  onChange,
}: {
  materials: Material[];
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const byId = React.useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials],
  );

  const itemToStringLabel = React.useCallback(
    (id: string) => {
      const m = byId.get(id);
      return m ? `${m.name} (${m.code})` : id;
    },
    [byId],
  );

  // Filter by name OR code, case-insensitive.
  // Signature confirmed from .d.ts: (itemValue: Value, query: string, itemToString?) => boolean
  const filter = React.useCallback(
    (itemId: string, query: string) => {
      const m = byId.get(itemId);
      if (!m) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)
      );
    },
    [byId],
  );

  const ids = React.useMemo(() => materials.map((m) => m.id), [materials]);

  // NGUYÊN NHÂN GỐC (source base-ui ComboboxInput.js): base-ui chỉ tự mở popup khi gõ nếu
  // `shouldOpenOnInput = !autofillLikeInput`, mà `autofillLikeInput = !inputType`. Với bộ gõ
  // tiếng Việt / một số trình duyệt, sự kiện `input` có `inputType` RỖNG → base-ui tưởng là
  // autofill → KHÔNG mở (phải gõ space, lúc đó inputType="insertText", mới mở). Khắc phục:
  // tự kiểm soát `open` và mở qua onChange DOM thật của Input — luôn fire khi gõ, bất kể inputType.
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative w-full">
      <Combobox.Root
        items={ids}
        value={value || null}
        onValueChange={(v: string | null) => onChange(v ?? "")}
        itemToStringLabel={itemToStringLabel}
        filter={filter}
        open={open}
        onOpenChange={(next: boolean) => setOpen(next)}
        openOnInputClick
      >
        <div className="relative">
          <Combobox.Input
            placeholder="Gõ để tìm theo tên hoặc mã..."
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              // Có ký tự trong ô → mở danh sách ngay (kể cả khi inputType rỗng do bộ gõ tiếng Việt).
              if (e.target.value.length > 0) setOpen(true);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Combobox.Trigger
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label="Mở danh sách"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </Combobox.Trigger>
        </div>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} className="z-50">
            <Combobox.Popup className="max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground">
                Không tìm thấy vật tư
              </Combobox.Empty>
              <Combobox.List>
                {(itemId: string) => (
                  <Combobox.Item
                    key={itemId}
                    value={itemId}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                  >
                    {itemToStringLabel(itemId)}
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {/* Hidden input carries the selected id for form submission */}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
