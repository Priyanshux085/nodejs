import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, ownerAc, adminAc, memberAc } from "better-auth/plugins/organization/access";

/**
 * Custom permissions statement extending default statements.
 * We include standard 'create', 'delete', and 'view' for the organization resource
 * as requested.
 */
export const statement = {
  ...defaultStatements,
  organization: ["create", "update", "delete", "view"],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
  ...ownerAc.statements,
  organization: ["create", "delete", "view", "update"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  organization: ["create", "view", "update"],
});

export const member = ac.newRole({
  ...memberAc.statements,
  organization: ["view"],
});

export const nonMember = ac.newRole({
  organization: [],
});
