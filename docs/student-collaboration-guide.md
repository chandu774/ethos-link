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
    collaboration.ts
```

## Example Supabase queries

```ts
const { data: groups } = await supabase
  .from("groups")
  .select("*")
  .eq("created_by", user.id)
  .order("updated_at", { ascending: false });
```

```ts
const { data: messages } = await supabase
  .from("group_messages")
  .select("*, sender:profiles(id, name, username, avatar_url)")
  .eq("group_id", groupId)
  .order("created_at", { ascending: false })
  .range(0, 19);
```

```ts
const { data: assignment } = await supabase
  .from("assignments")
  .insert({
    group_id: groupId,
    title: "Module 3 worksheet",
    deadline: new Date().toISOString(),
    created_by: user.id,
  })
  .select("*")
  .single();
```

```ts
const { data: notifications } = await supabase
  .from("notifications")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });
```
