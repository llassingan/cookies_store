/**
 * Menu Manager Component (Client Component)
 *
 * Handles all cookie menu CRUD operations for the Maison Croûte admin.
 *
 * **List view:** renders each menu item as a card showing the cookie
 *   name, description (2-line clamp), formatted price, and an inline
 *   availability toggle switch. Items marked unavailable show a "Hidden"
 *   badge and are excluded from the storefront.
 *
 * **Add / Edit form fields** (shared between create and edit dialogs):
 *   - `name` — cookie display name (max 120 chars)
 *   - `description` — flavor and ingredient notes (max 2000 chars)
 *   - `price` — integer IDR price (> 0)
 *   - `imageUrl` — optional URL for the cookie photo (empty string
 *     converts to null on submit)
 *   - `sortOrder` — display ordering on the storefront (non-negative
 *     integer)
 *   - `available` — toggle controlling storefront visibility
 *
 * **Inline availability toggle** immediately PATCHes the item's
 *   `available` field. The storefront only shows items where
 *   `available: true`.
 *
 * **Delete** shows a browser `confirm()` dialog warning that carts
 *   referencing the deleted item will be rejected at checkout.
 *
 * Form validation uses zod schemas via react-hook-form's zodResolver.
 *
 * @module admin/menu-manager
 */
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ApiClientError, api } from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import type { CreateMenuItemRequest, MenuItem, UpdateMenuItemRequest } from '@cookies/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema for creating a new menu item.
// imageUrl accepts a URL, empty string (converts to undefined), or omission.
const CreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().min(1, 'Description is required').max(2000),
  price: z.coerce.number().int().positive('Price must be > 0'),
  imageUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  available: z.boolean().default(true),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
});
type CreateValues = z.infer<typeof CreateSchema>;

// Validation schema for updating an existing menu item.
// All fields are optional: only provided fields will be patched.
const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().min(1).max(2000).optional(),
  price: z.coerce.number().int().positive().optional(),
  imageUrl: z.string().url().nullable().optional(),
  available: z.boolean().optional(),
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});
type UpdateValues = z.infer<typeof UpdateSchema>;

/**
 * Main menu management component. Maintains local state for the menu
 * items list and delegates create/edit to child dialog components
 * (`CreateDialog` and `EditDialog`).
 */
export function MenuManager({ initial }: { initial: MenuItem[] }) {
  const [items, setItems] = useState(initial);
  // The item currently being edited (null = dialog closed).
  const [editing, setEditing] = useState<MenuItem | null>(null);
  // Whether the create dialog is open.
  const [creating, setCreating] = useState(false);

  // Deletes a menu item after user confirmation.
  const onDelete = async (id: string) => {
    if (!confirm('Delete this item? Existing carts referencing it will be rejected at checkout.'))
      return;
    try {
      await api.delete(`/admin/menu/${id}`);
      setItems((cur) => cur.filter((i) => i.id !== id));
      toast.success('Item removed');
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message);
      else toast.error('Could not delete');
    }
  };

  // Toggles an item's availability with an immediate API patch.
  const onToggleAvailable = async (item: MenuItem) => {
    try {
      const updated = await api.patch<MenuItem>(`/admin/menu/${item.id}`, {
        available: !item.available,
      } satisfies UpdateMenuItemRequest);
      setItems((cur) => cur.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message);
      else toast.error('Could not update');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Items</CardTitle>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet. Add one to get started.</p>
          ) : (
            items.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center gap-4 rounded-md border border-border/60 bg-card p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{i.name}</p>
                    {!i.available ? <Badge variant="secondary">Hidden</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{i.description}</p>
                </div>
                {/* Price in IDR, right-aligned with consistent tabular number width */}
                <div className="w-24 text-right font-display text-lg tabular-nums">
                  {formatRupiah(i.price)}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Live
                  </Label>
                  <Switch checked={i.available} onCheckedChange={() => onToggleAvailable(i)} />
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(i)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(i.id)}>
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <CreateDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(i) => {
          setItems((cur) => [...cur, i]);
          setCreating(false);
        }}
      />
      <EditDialog
        item={editing}
        onClose={() => setEditing(null)}
        onUpdated={(i) => {
          setItems((cur) => cur.map((x) => (x.id === i.id ? i : x)));
          setEditing(null);
        }}
      />
    </div>
  );
}

/**
 * Dialog for creating a new menu item.
 *
 * All fields match the CreateSchema: name, description, price (IDR),
 * image URL (optional), availability toggle, and sort order.
 * On success, the new item is appended to the parent's local state.
 */
function CreateDialog({
  open,
  onOpenChange,
  onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (i: MenuItem) => void }) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(CreateSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      available: true,
      sortOrder: 0,
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      // Map form values to API request body.
      // Empty imageUrl string becomes null.
      const body: CreateMenuItemRequest = {
        name: values.name,
        description: values.description,
        price: values.price,
        imageUrl: values.imageUrl || null,
        available: values.available,
        sortOrder: values.sortOrder,
      };
      const item = await api.post<MenuItem>('/admin/menu', body);
      toast.success('Item created');
      form.reset();
      onCreated(item);
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message);
      else toast.error('Could not create');
    } finally {
      setSubmitting(false);
    }
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New menu item</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>
          <Field label="Description" error={form.formState.errors.description?.message}>
            <Textarea rows={3} {...form.register('description')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (IDR)" error={form.formState.errors.price?.message}>
              <Input type="number" min={1} {...form.register('price')} />
            </Field>
            <Field label="Sort order" error={form.formState.errors.sortOrder?.message}>
              <Input type="number" min={0} {...form.register('sortOrder')} />
            </Field>
          </div>
          <Field label="Image URL (optional)" error={form.formState.errors.imageUrl?.message}>
            <Input {...form.register('imageUrl')} />
          </Field>
          <div className="flex items-center gap-3 pt-2">
            <Switch id="available" {...form.register('available')} defaultChecked />
            <Label htmlFor="available">Available</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Dialog for editing an existing menu item.
 *
 * Pre-fills all form fields from the selected item. When the dialog
 * closes, `onClose` resets the parent's `editing` state to null.
 * On successful save, `onUpdated` replaces the edited item in the
 * parent's local state.
 */
function EditDialog({
  item,
  onClose,
  onUpdated,
}: { item: MenuItem | null; onClose: () => void; onUpdated: (i: MenuItem) => void }) {
  const form = useForm<UpdateValues>({ resolver: zodResolver(UpdateSchema) });
  const [submitting, setSubmitting] = useState(false);
  // Initialize form values when the dialog opens with a new item.
  useState(() => {
    if (item)
      form.reset({
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl ?? '',
        available: item.available,
        sortOrder: item.sortOrder,
      });
  });

  if (!item) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const body: UpdateMenuItemRequest = {
        name: values.name,
        description: values.description,
        price: values.price,
        // Empty string means "no image" → send null. Otherwise send the
        // provided URL or undefined (omitted) if the field wasn't changed.
        imageUrl: values.imageUrl === '' ? null : (values.imageUrl ?? undefined),
        available: values.available,
        sortOrder: values.sortOrder,
      };
      const updated = await api.patch<MenuItem>(`/admin/menu/${item.id}`, body);
      toast.success('Item updated');
      onUpdated(updated);
    } catch (e) {
      if (e instanceof ApiClientError) toast.error(e.message);
      else toast.error('Could not update');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog
      open={!!item}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>
          <Field label="Description" error={form.formState.errors.description?.message}>
            <Textarea rows={3} {...form.register('description')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (IDR)" error={form.formState.errors.price?.message}>
              <Input type="number" min={1} {...form.register('price')} />
            </Field>
            <Field label="Sort order" error={form.formState.errors.sortOrder?.message}>
              <Input type="number" min={0} {...form.register('sortOrder')} />
            </Field>
          </div>
          <Field label="Image URL (optional)" error={form.formState.errors.imageUrl?.message}>
            <Input {...form.register('imageUrl')} />
          </Field>
          <div className="flex items-center gap-3 pt-2">
            <Switch
              id="edit-available"
              {...form.register('available')}
              defaultChecked={item.available}
            />
            <Label htmlFor="edit-available">Available</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shared form field wrapper used by both CreateDialog and EditDialog.
 * Renders a label, the input element, and a validation error message.
 */
function Field({
  label,
  error,
  children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
