import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

type Props<T extends { id: string }> = {
  items: T[];
  onReorder: (next: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  rowClassName?: string;
  contentClassName?: string;
  listClassName?: string;
};

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  rowClassName = 'bg-[var(--color-card)]',
  contentClassName = 'pr-3 py-2.5',
  listClassName = 'space-y-2',
}: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const handleEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((it) => it.id === active.id);
    const newIndex = items.findIndex((it) => it.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={listClassName}>
          {items.map((item, idx) => (
            <SortableRow key={item.id} id={item.id} className={rowClassName} contentClassName={contentClassName}>
              {renderItem(item, idx)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children, className, contentClassName }: { id: string; children: ReactNode; className: string; contentClassName: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} className={`flex items-stretch gap-1 rounded-2xl ${className}`}>
      <button
        {...attributes}
        {...listeners}
        className="flex w-7 items-center justify-center rounded-l-2xl text-[var(--color-ink-muted)]"
        aria-label="Перетащить"
      >
        <GripVertical size={16} />
      </button>
      <div className={`min-w-0 flex-1 ${contentClassName}`}>{children}</div>
    </li>
  );
}
