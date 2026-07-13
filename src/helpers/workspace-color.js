import { WORKSPACE_COLORS } from '@/constants/workspace-colors';

export const getWorkspaceColor = workspaceId => {
    if (!workspaceId) return WORKSPACE_COLORS[0];
    let hash = 0;
    for (let i = 0; i < workspaceId.length; i += 1) {
        hash = (hash * 31 + workspaceId.charCodeAt(i)) | 0;
    }
    return WORKSPACE_COLORS[Math.abs(hash) % WORKSPACE_COLORS.length];
};

// Prefer the workspace's own (owner-editable) color; the hash above is only
// the fallback for workspaces that don't have one set yet.
export const resolveWorkspaceColor = workspace =>
    workspace?.color ?? getWorkspaceColor(workspace?.id);
