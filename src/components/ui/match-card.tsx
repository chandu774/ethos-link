import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Loader2, Check, X, MessageCircle, Clock, UserCheck, AtSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { formatUsername } from "@/lib/utils";

export type ConnectionState = "none" | "pending_sent" | "pending_received" | "connected";

interface MatchCardProps {
  userId: string;
  username: string;
  displayUsername?: string | null;
  avatarUrl?: string | null;
  similarity: number;
  connectionState: ConnectionState;
  connectionId?: string | null;
  onConnect: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function MatchCard({ 
  userId,
  username, 
  displayUsername,
  avatarUrl,
  similarity, 
  connectionState,
  connectionId,
  onConnect,
  onAccept,
  onReject,
  onCancel,
  isLoading,
}: MatchCardProps) {
  const navigate = useNavigate();

  const handleChat = () => {
    navigate(`/connections?chat=${userId}`);
  };

  const renderActionButton = () => {
    switch (connectionState) {
      case "connected":
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Connected
            </Button>
            <Button
              onClick={handleChat}
              className="gradient-neural text-primary-foreground hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        );
      
      case "pending_sent":
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled
            >
              <Clock className="h-4 w-4 mr-2" />
              Request Sent
            </Button>
            {onCancel && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      
      case "pending_received":
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onReject}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              onClick={onAccept}
              className="flex-1 gradient-neural text-primary-foreground hover:opacity-90"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Accept
                </>
              )}
            </Button>
          </div>
        );
      
      case "none":
      default:
        return (
          <Button 
            onClick={onConnect}
            className="w-full gradient-neural text-primary-foreground hover:opacity-90 transition-opacity"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Connect"
            )}
          </Button>
        );
    }
  };

  return (
    <Card className="group overflow-hidden shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border border-border/40">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={username} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
              <User className="h-7 w-7 text-primary" />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{username}</h3>
              {displayUsername && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <AtSign className="h-3 w-3" />
                  {(() => {
                    const formatted = formatUsername(displayUsername);
                    return <span title={formatted.raw}>{formatted.display}</span>;
                  })()}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mindset Match</span>
                <span className="font-semibold text-primary">{similarity}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full gradient-neural transition-all duration-500"
                  style={{ width: `${similarity}%` }}
                />
              </div>
            </div>
            
            {renderActionButton()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
