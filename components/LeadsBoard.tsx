"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import clsx from "clsx";
import { useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { leadStages, type LeadStage } from "@/lib/leadStages";
import type { Lead } from "@/lib/leads";
import { updateLeadStageBoard } from "@/app/app/actions";
import { formatLeadTypeLabel } from "@/lib/leadTypes";

type Props = {
  initialLeads: Lead[];
  memberMap?: Record<number, string>;
  showOwner?: boolean;
};

type LeadCardProps = {
  lead: Lead;
  dragging?: boolean;
  memberMap?: Record<number, string>;
  showOwner?: boolean;
};

function LeadCardView({ lead, dragging, memberMap, showOwner }: LeadCardProps) {
  const router = useRouter();
  const leadTypeLabel = formatLeadTypeLabel(lead.lead_type);
  const ownerLabel = lead.owner_user_id
    ? memberMap?.[lead.owner_user_id] ?? `User ${lead.owner_user_id}`
    : "Unassigned";
  const assignedLabel = lead.assigned_user_id
    ? memberMap?.[lead.assigned_user_id] ?? `User ${lead.assigned_user_id}`
    : null;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={clsx(
        "rounded-xl border border-slate-200 bg-white p-3 shadow-sm cursor-pointer dark:bg-slate-800 dark:border-slate-700",
        dragging ? "opacity-90 shadow-lg ring-2 ring-blue-500/20" : "hover:border-slate-400 hover:shadow-md"
      )}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (dragging) return;
        router.push(`/app/leads/${lead.id}`);
      }}
      onKeyDown={(event) => {
        if (dragging) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/app/leads/${lead.id}`);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-slate-900 dark:text-slate-100">{lead.name}</p>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        <span className="font-medium text-slate-600 dark:text-slate-400">Next Action:</span>{" "}
        {lead.next_action_text
          ? lead.next_action_text
          : lead.next_action_at
            ? new Date(lead.next_action_at).toLocaleDateString()
            : "Not scheduled"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {lead.source}
        </span>
        {leadTypeLabel ? (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {leadTypeLabel}
          </span>
        ) : null}
      </div>
      {showOwner ? (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 shadow-sm ring-1 ring-inset ring-indigo-200 dark:ring-indigo-500/30"
            title={ownerLabel}
          >
            {ownerLabel.charAt(0).toUpperCase()}
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate" title={ownerLabel}>
            {ownerLabel.split('@')[0]} {assignedLabel ? `→ ${assignedLabel.split('@')[0]}` : ""}
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}

function DraggableLeadCard({ lead, memberMap, showOwner }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    data: { leadId: lead.id, stage: lead.stage },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx("touch-none", isDragging && "opacity-50")}
      {...attributes}
      {...listeners}
    >
      <LeadCardView lead={lead} dragging={isDragging} memberMap={memberMap} showOwner={showOwner} />
    </div>
  );
}

function Column({
  stage,
  leads,
  memberMap,
  showOwner,
}: {
  stage: LeadStage;
  leads: Lead[];
  memberMap?: Record<number, string>;
  showOwner?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { stage },
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "w-full rounded-xl border border-slate-200 bg-slate-100/40 p-3 transition md:min-w-[320px] dark:border-slate-800 dark:bg-slate-900/50",
        isOver && "border-blue-400 bg-blue-50/50 shadow-sm dark:border-blue-500/50 dark:bg-blue-900/20"
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold capitalize">{stage.replace("_", " ")}</h2>
        <span className="text-xs text-slate-500">{leads.length}</span>
      </div>
      <div className="mt-3 space-y-3">
        <AnimatePresence mode="popLayout">
          {leads.length ? (
            leads.map((lead) => (
              <DraggableLeadCard
                key={lead.id}
                lead={lead}
                memberMap={memberMap}
                showOwner={showOwner}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-8 rounded-lg border border-dashed border-slate-300 dark:border-slate-700"
            >
              <p className="text-sm font-medium text-slate-500 dark:text-slate-300">No leads yet.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LeadsBoard({ initialLeads, memberMap, showOwner }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeLeadId, setActiveLeadId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const grouped = useMemo(() => {
    return leadStages.reduce<Record<LeadStage, Lead[]>>((acc, stage) => {
      acc[stage] = leads.filter((lead) => lead.stage === stage);
      return acc;
    }, {} as Record<LeadStage, Lead[]>);
  }, [leads]);

  const activeLead = activeLeadId
    ? leads.find((lead) => lead.id === activeLeadId)
    : undefined;

  const handleDragStart = (event: DragStartEvent) => {
    const leadId = event.active.data.current?.leadId;
    if (typeof leadId === "number") {
      setActiveLeadId(leadId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const leadId = event.active.data.current?.leadId as number | undefined;
    const previousStage = event.active.data.current?.stage as LeadStage | undefined;
    const nextStage = event.over?.id as LeadStage | undefined;

    setActiveLeadId(null);

    if (!leadId || !previousStage || !nextStage || previousStage === nextStage) {
      return;
    }

    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, stage: nextStage } : lead))
    );

    startTransition(() => {
      updateLeadStageBoard(leadId, nextStage).catch(() => {
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === leadId ? { ...lead, stage: previousStage } : lead
          )
        );
      });
    });
  };

  return (
    <div className="flex flex-col h-full min-w-0">
      {isPending ? (
        <p className="text-xs text-slate-500 mb-2">Saving latest changes...</p>
      ) : null}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLeadId(null)}
      >
        <div className="w-full flex-1 overflow-y-auto overflow-x-hidden pb-4 scrollbar-thin md:overflow-x-auto min-h-0">
          <div className="flex flex-col gap-4 pb-2 md:flex-row md:flex-nowrap md:min-w-max h-full">
            {leadStages.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                leads={grouped[stage] ?? []}
                memberMap={memberMap}
                showOwner={showOwner}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeLead ? (
            <LeadCardView
              lead={activeLead}
              dragging
              memberMap={memberMap}
              showOwner={showOwner}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

