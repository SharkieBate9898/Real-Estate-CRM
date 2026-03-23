"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import {
  createOrgInvite,
  getCurrentUserContext,
  getOrgMember,
  requireRole,
  updateOrgName,
  updateOrgMemberRole,
  updateOrgMemberStatus,
} from "@/lib/org";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "agent", "assistant"]),
});

const memberRoleSchema = z.object({
  memberId: z.string(),
  role: z.enum(["admin", "agent", "assistant"]),
});

const memberStatusSchema = z.object({
  memberId: z.string(),
  status: z.enum(["active", "disabled"]),
});

const orgNameSchema = z.object({
  name: z.string().min(2),
});

export async function createInviteAction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  requireRole(ctx, ["admin"]);

  const values = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!values.success) {
    redirect("/app/org?error=Invalid%20invite%20details");
  }

  const token = await createOrgInvite({
    orgId: ctx.orgId,
    email: values.data.email,
    role: values.data.role,
    createdByUserId: ctx.userId,
  });

  redirect(`/app/org?invite=${token}`);
}

export async function updateMemberRoleAction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  requireRole(ctx, ["admin"]);

  const values = memberRoleSchema.safeParse({
    memberId: formData.get("memberId"),
    role: formData.get("role"),
  });
  if (!values.success) {
    redirect("/app/org?error=Invalid%20member%20role");
  }

  await updateOrgMemberRole(ctx.orgId, Number(values.data.memberId), values.data.role);
  redirect("/app/org");
}

export async function updateMemberStatusAction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  requireRole(ctx, ["admin"]);

  const values = memberStatusSchema.safeParse({
    memberId: formData.get("memberId"),
    status: formData.get("status"),
  });
  if (!values.success) {
    redirect("/app/org?error=Invalid%20member%20status");
  }

  const memberId = Number(values.data.memberId);
  const member = await getOrgMember(ctx.orgId, memberId);
  if (!member) {
    redirect("/app/org?error=Member%20not%20found");
  }
  if (member.user_id === ctx.userId && values.data.status === "disabled") {
    redirect("/app/org?error=You%20cannot%20disable%20your%20own%20account");
  }

  await updateOrgMemberStatus(ctx.orgId, memberId, values.data.status);
  redirect("/app/org");
}

export async function updateOrgNameAction(formData: FormData) {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  requireRole(ctx, ["admin"]);

  const values = orgNameSchema.safeParse({
    name: formData.get("name"),
  });
  if (!values.success) {
    redirect("/app/org?error=Invalid%20org%20name");
  }

  await updateOrgName(ctx.orgId, values.data.name.trim());
  redirect("/app/org");
}
