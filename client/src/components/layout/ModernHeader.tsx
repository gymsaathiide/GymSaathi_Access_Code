import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileEditDialog } from "@/components/ProfileEditDialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: number;
  createdAt: string;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "member" | "lead";
  status?: string;
}

export function ModernHeader() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    members: SearchResult[];
    leads: SearchResult[];
  } | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { data: gymData } = useQuery({
    queryKey: ["/api/gym"],
    enabled: user?.role === "admin" || user?.role === "trainer",
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/notifications/unread-count"],
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }
    try {
      const response = await fetch(
        `/api/admin/search?q=${encodeURIComponent(searchQuery)}`,
        {
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") {
      setShowSearchResults(false);
      setSearchQuery("");
    }
  };

  const navigateToResult = (result: SearchResult) => {
    if (result.type === "member") {
      navigate("/admin/members");
    } else {
      navigate("/admin/leads");
    }
    setShowSearchResults(false);
    setSearchQuery("");
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <header className="h-12 sm:h-14 px-2 sm:px-3 md:px-4 flex items-center justify-between gap-2 sm:gap-3 bg-transparent w-full">
      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <p className="text-xs text-white/40">{formattedDate}</p>
          <h1 className="font-semibold text-white">
            {getGreeting()},{" "}
            <span className="text-orange-500">{user?.name?.split(" ")[0]}</span>
          </h1>
        </div>
      </div>

      <div className="flex-1 max-w-md hidden lg:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            type="text"
            placeholder="Search members, leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-orange-500/50 focus:ring-orange-500/20"
          />
          {showSearchResults && searchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto bg-[hsl(220,26%,16%)] border-white/10">
              {searchResults.members.length === 0 &&
              searchResults.leads.length === 0 ? (
                <div className="p-4 text-center text-white/50">
                  No results found
                </div>
              ) : (
                <>
                  {searchResults.members.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs font-semibold px-2 py-1 text-white/50">
                        Members
                      </div>
                      {searchResults.members.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => navigateToResult(m)}
                          className="w-full px-2 py-2 rounded flex items-center gap-3 text-left hover:bg-white/10"
                        >
                          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 text-xs font-medium">
                            {m.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {m.name}
                            </div>
                            <div className="text-xs text-white/50">
                              {m.email}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.leads.length > 0 && (
                    <div className="p-2 border-t border-white/10">
                      <div className="text-xs font-semibold px-2 py-1 text-white/50">
                        Leads
                      </div>
                      {searchResults.leads.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => navigateToResult(l)}
                          className="w-full px-2 py-2 rounded flex items-center gap-3 text-left hover:bg-white/10"
                        >
                          <div className="rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 text-xs font-medium ">
                            {l.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {l.name}
                            </div>
                            <div className="text-xs text-white/50">
                              {l.status}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-lg transition-colors hover:bg-white/10 text-white/60 hover:text-white">
              <Bell className="h-5 w-5" />
              {(unreadCount?.count ?? 0) > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center bg-orange-500 rounded-full text-[10px] text-white font-bold px-1">
                  {unreadCount!.count > 9 ? "9+" : unreadCount!.count}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 p-0 bg-[hsl(220,26%,16%)] border-white/10"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-semibold text-white">Notifications</span>
              {(unreadCount?.count ?? 0) > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-xs text-orange-500 hover:text-orange-600"
                >
                  Mark all read
                </button>
              )}
            </div>
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-white/50">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "px-4 py-3 cursor-pointer hover:bg-white/5",
                        notification.isRead === 0 && "bg-orange-500/5",
                      )}
                    >
                      <div className="flex gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-white">
                            {notification.title}
                          </p>
                          <p className="text-xs line-clamp-2 text-white/60">
                            {notification.message}
                          </p>
                          <p className="text-xs mt-1 text-white/40">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                        {notification.isRead === 0 && (
                          <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1.5"></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 md:gap-3 p-1.5 md:p-2 rounded-xl transition-colors hover:bg-white/5">
              <Avatar className="h-8 w-8 md:h-9 md:w-9 border-2 border-orange-500/30">
                <AvatarImage
                  src={user?.profileImageUrl || undefined}
                  alt={user?.name || ""}
                />
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs md:text-sm font-semibold">
                  {getInitials(user?.name || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs capitalize text-white/40">{user?.role}</p>
              </div>
              <ChevronDown className="hidden md:block h-4 w-4 text-white/40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-[hsl(220,26%,16%)] border-white/10"
          >
            <div className="px-3 py-2 md:hidden">
              <p className="font-medium text-white">{user?.name}</p>
              <p className="text-sm capitalize text-white/60">{user?.role}</p>
            </div>
            <DropdownMenuSeparator className="md:hidden bg-white/10" />
            {user?.role !== "superadmin" && (
              <>
                <DropdownMenuItem
                  onClick={() => setIsProfileDialogOpen(true)}
                  className="cursor-pointer text-white/80 hover:text-white hover:bg-white/10"
                >
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
              </>
            )}
            <DropdownMenuItem
              onClick={logout}
              className="text-red-500 hover:text-red-600 hover:bg-red-500/10 cursor-pointer"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ProfileEditDialog
        open={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
      />
    </header>
  );
}
