# Student Collaboration Platform

## Frontend structure

```text
src/
  pages/
    Dashboard.tsx
    GroupDetail.tsx
    Chat.tsx
    Assignments.tsx
  components/
    MessageList.tsx
    AssignmentCard.tsx
    TaskBoard.tsx
    NotificationPanel.tsx
  hooks/
    useCollaborationGroups.ts
    useGroupChat.ts
    useAssignments.ts
    useTasks.ts
    useNotifications.ts
  lib/
    apiClient.ts
    collaboration.ts
```

## Example API Queries

```ts
// Fetch groups
const groups = await api.get<Group[]>("/chat/groups");
```

```ts
// Fetch group messages
const messages = await api.get<GroupMessage[]>(`/chat/groups/${groupId}/messages`);
```

```ts
// Create assignment
const assignment = await api.post("/assignments", {
  group_id: groupId,
  title: "Module 3 worksheet",
  deadline: new Date().toISOString(),
});
```

```ts
// Fetch notifications
const notifications = await api.get<Notification[]>("/notifications");
```
