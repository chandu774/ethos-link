import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { MessageList } from "@/components/MessageList";
import { AssignmentCard } from "@/components/AssignmentCard";
import { TaskBoard } from "@/components/TaskBoard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAssignments, useCreateAssignment } from "@/hooks/useAssignments";
import { useGroupTyping, useGroupMessages, useSendGroupChatMessage } from "@/hooks/useGroupChat";
import {
  useAddCollaborationGroupMember,
  useCollaborationGroupMembers,
  useDashboardGroups,
  useGroupRole,
  useRemoveCollaborationGroupMember,
} from "@/hooks/useCollaborationGroups";
import { useCreateTask, useTasks, useUpdateTaskStatus } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useConnections } from "@/hooks/useConnections";
import { Loader2, User, UserMinus, UserPlus } from "lucide-react";
import { formatUsername } from "@/lib/utils";

export default function GroupDetail() {
  const { groupId = "" } = useParams();
  const { user } = useAuth();
  const { data: groups } = useDashboardGroups();
  const { data: members = [] } = useCollaborationGroupMembers(groupId);
  const { data: role } = useGroupRole(groupId);
  const { data: assignments = [] } = useAssignments(groupId);
  const { data: tasks = [] } = useTasks(groupId);
  const { messages, fetchNextPage, hasNextPage, isFetchingNextPage } = useGroupMessages(groupId);
  const sendMessage = useSendGroupChatMessage(groupId);
  const createAssignment = useCreateAssignment(groupId);
  const createTask = useCreateTask(groupId);
  const updateTaskStatus = useUpdateTaskStatus(groupId);
  const addMember = useAddCollaborationGroupMember(groupId);
  const removeMember = useRemoveCollaborationGroupMember(groupId);
  const { data: connections = [] } = useConnections();
  const { typingUsers, sendTyping } = useGroupTyping(groupId);
  const [message, setMessage] = useState("");
  const [messageFile, setMessageFile] = useState<File | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [pendingAddUserId, setPendingAddUserId] = useState<string | null>(null);
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null);

  const group = useMemo(() => groups?.find((item) => item.id === groupId) ?? null, [groupId, groups]);
  const canManage = role === "admin" || role === "moderator";
  const connectionCandidates = useMemo(() => {
    const candidateMap = new Map<string, { id: string; name: string; username: string | null }>();
    connections.forEach((connection) => {
      const isRequester = connection.requester_id === user?.id;
      const partner = isRequester ? connection.receiver : connection.requester;
      const partnerId = partner?.id || (isRequester ? connection.receiver_id : connection.requester_id);
      if (!partnerId) return;
      candidateMap.set(partnerId, {
        id: partnerId,
        name: partner?.name || "Connection",
        username: partner?.username || null,
      });
    });
    return Array.from(candidateMap.values());
  }, [connections, user?.id]);

  const memberUserIds = useMemo(() => new Set(members.map((member) => member.user_id)), [members]);
  const availableUsers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return connectionCandidates.filter((profile) => {
      if (memberUserIds.has(profile.id)) return false;
      if (!query) return true;
      const name = (profile.name || "").toLowerCase();
      const username = (profile.username || "").toLowerCase();
      return name.includes(query) || username.includes(query);
    });
  }, [connectionCandidates, memberSearch, memberUserIds]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle>{group?.name || "Group workspace"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {group?.description || "Collaborate in real time with messages, tasks, and assignments."}
            </p>
            {group?.invite_code && (
              <p className="text-xs text-muted-foreground">Invite code: {group.invite_code}</p>
            )}
          </CardHeader>
        </Card>

        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <Card className="border-border/60 bg-card/85">
                <CardHeader>
                  <CardTitle className="text-base">Group chat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasNextPage && (
                    <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                      {isFetchingNextPage ? "Loading..." : "Load older messages"}
                    </Button>
                  )}
                  <MessageList messages={messages} typingCount={typingUsers.length} />
                  <div className="space-y-3 border-t border-border/60 pt-4">
                    <Textarea
                      value={message}
                      onChange={(event) => {
                        setMessage(event.target.value);
                        sendTyping();
                      }}
                      placeholder="Write a message..."
                    />
                    <Input
                      type="file"
                      onChange={(event) => setMessageFile(event.target.files?.[0] || null)}
                    />
                    <Button
                      onClick={() => {
                        sendMessage.mutate({ content: message, file: messageFile });
                        setMessage("");
                        setMessageFile(null);
                      }}
                      disabled={sendMessage.isPending || (!message.trim() && !messageFile)}
                    >
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/85">
                <CardHeader>
                  <CardTitle className="text-base">Members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canManage && (
                    <div className="space-y-3 rounded-lg border border-border/60 p-3">
                      <p className="text-sm font-medium text-foreground">Add member</p>
                      <Input
                        value={memberSearch}
                        onChange={(event) => setMemberSearch(event.target.value)}
                        placeholder="Search your connections"
                      />
                      <div className="space-y-2">
                        {availableUsers.length > 0 ? (
                          availableUsers.slice(0, 5).map((person) => (
                            <div
                              key={person.id}
                              className="flex items-center justify-between rounded-md border border-border/50 p-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {person.name || "User"}
                                </p>
                                {person.username && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {formatUsername(person.username).display}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={addMember.isPending}
                                onClick={async () => {
                                  setPendingAddUserId(person.id);
                                  try {
                                    await addMember.mutateAsync(person.id);
                                    setMemberSearch("");
                                  } finally {
                                    setPendingAddUserId(null);
                                  }
                                }}
                              >
                                {addMember.isPending && pendingAddUserId === person.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <UserPlus className="mr-1 h-4 w-4" />
                                    Add
                                  </>
                                )}
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No connections available to add.</p>
                        )}
                      </div>
                    </div>
                  )}
                  {members.map((member) => (
                    <div key={member.id} className="rounded-lg border border-border/60 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <p className="truncate font-medium text-foreground">
                              {member.profile?.name || member.profile?.username || "Member"}
                            </p>
                          </div>
                          {member.profile?.username && (
                            <p className="text-xs text-muted-foreground">
                              {formatUsername(member.profile.username).display}
                            </p>
                          )}
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{member.role}</p>
                        </div>
                        {role === "admin" && member.user_id !== user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            disabled={removeMember.isPending}
                            onClick={async () => {
                              setPendingRemoveUserId(member.user_id);
                              try {
                                await removeMember.mutateAsync(member.user_id);
                              } finally {
                                setPendingRemoveUserId(null);
                              }
                            }}
                          >
                            {removeMember.isPending && pendingRemoveUserId === member.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <UserMinus className="mr-1 h-4 w-4" />
                                Remove
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            {canManage && (
              <Card className="border-border/60 bg-card/85">
                <CardHeader>
                  <CardTitle className="text-base">Create assignment</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  <Input value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} placeholder="Title" />
                  <Input type="datetime-local" value={assignmentDeadline} onChange={(e) => setAssignmentDeadline(e.target.value)} />
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp"
                    onChange={(event) => setAssignmentFile(event.target.files?.[0] || null)}
                  />
                  <Button
                    onClick={() => {
                      createAssignment.mutate({
                        title: assignmentTitle,
                        deadline: new Date(assignmentDeadline).toISOString(),
                        file: assignmentFile,
                      });
                      setAssignmentTitle("");
                      setAssignmentDeadline("");
                      setAssignmentFile(null);
                    }}
                    disabled={!assignmentTitle.trim() || !assignmentDeadline}
                  >
                    Publish
                  </Button>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {assignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            {canManage && (
              <Card className="border-border/60 bg-card/85">
                <CardHeader>
                  <CardTitle className="text-base">Create task</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 md:flex-row">
                  <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" />
                  <Button
                    onClick={() => {
                      createTask.mutate({
                        title: taskTitle,
                        assignedTo: user?.id || null,
                      });
                      setTaskTitle("");
                    }}
                    disabled={!taskTitle.trim()}
                  >
                    Add task
                  </Button>
                </CardContent>
              </Card>
            )}
            <TaskBoard
              tasks={tasks}
              onStatusChange={(taskId, status) => updateTaskStatus.mutate({ taskId, status })}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
