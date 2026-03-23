"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createAssistantInvite,
  deleteAssistantLink,
  getCurrentUserContext,
  requireRole,
} from "@/lib/org";

const inviteSchema = z.object({
  agent_user_id: z.string(),
  email: z.string().email(),
});

const removeSchema = z.object({
  linkId: z.string(),
});

export async function createAssistantInviteAction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }

  const values = inviteSchema.safeParse({
    agent_user_id: formData.get("agent_user_id"),
    email: formData.get("email"),
  });
  if (!values.success) {
    redirect("/app/assistants?error=Invalid%20invite%20details");
  }

  const agentUserId = Number(values.data.agent_user_id);
  if (!Number.isFinite(agentUserId)) {
    redirect("/app/assistants?error=Invalid%20agent%20selection");
  }

  if (ctx.role === "admin") {
    // allowed
  } else if (ctx.role === "agent" && agentUserId !== ctx.userId) {
    redirect("/app/assistants?error=You%20can%20only%20invite%20assistants%20for%20yourself");
  } else if (ctx.role === "assistant") {
    redirect("/app/assistants?error=Assistants%20cannot%20invite%20others");
  }

  const token = await createAssistantInvite({
    orgId: ctx.orgId,
    agentUserId,
    email: values.data.email,
    createdByUserId: ctx.userId,
  });

  redirect(`/app/assistants?invite=${token}`);
}

export async function removeAssistantLinkAction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  const values = removeSchema.safeParse({
    linkId: formData.get("linkId"),
  });
  if (!values.success) {
    redirect("/app/assistants?error=Invalid%20link");
  }
  const linkId = Number(values.data.linkId);
  if (!Number.isFinite(linkId)) {
    redirect("/app/assistants?error=Invalid%20link");
  }

  if (ctx.role === "admin") {
    await deleteAssistantLink(ctx.orgId, linkId);
  } else if (ctx.role === "agent") {
    await deleteAssistantLink(ctx.orgId, linkId, ctx.userId);
  } else {
    redirect("/app/assistants?error=Assistants%20cannot%20remove%20links");
  }

  redirect("/app/assistants");
}
