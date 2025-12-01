import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MemberForm } from "@/components/MemberForm";
import { MemberProfileDialog } from "@/components/MemberProfileDialog";
import { PageHeader, PageCard } from "@/components/layout";
import { Search, Plus, Eye, Edit, UserX, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import type { Member } from "@shared/schema";

export default function Members() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (statusFilter !== "all") params.append("status", statusFilter);
    return params.toString() ? `?${params.toString()}` : "";
  };

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: [`/api/members${buildQueryString()}`],
  });

  const deleteMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Success",
        description: "Member deactivated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeactivate = async (memberId: string) => {
    if (confirm("Are you sure you want to deactivate this member?")) {
      deleteMutation.mutate(memberId);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
      case "expired":
        return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
      case "frozen":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30";
      case "cancelled":
        return "bg-black/5 text-gray-700 dark:bg-white/10 dark:text-white/60 border-black/10 dark:border-white/20";
      default:
        return "bg-black/5 text-gray-700 dark:bg-white/10 dark:text-white/60 border-black/10 dark:border-white/20";
    }
  };

  const canEdit = user?.role === "admin";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Manage gym members and their memberships"
      >
        {canEdit && (
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white"
            data-testid="button-add-member"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        )}
      </PageHeader>

      <Card className="bg-card-dark border-white/5">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-gray-900 dark:text-white">
            Member Directory
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-white/60">
            View and manage all gym members
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" />
              <Input
                placeholder="Search members by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:border-orange-500/50"
                data-testid="input-search-members"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className="w-full sm:w-[180px] bg-white/5 border-white/10 text-gray-900 dark:text-white"
                data-testid="select-status-filter"
              >
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[hsl(220,26%,16%)] border-white/10">
                <SelectItem
                  value="all"
                  className="text-gray-800 dark:text-white/80 focus:bg-gray-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                >
                  All Statuses
                </SelectItem>
                <SelectItem
                  value="active"
                  className="text-gray-800 dark:text-white/80 focus:bg-gray-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                >
                  Active
                </SelectItem>
                <SelectItem
                  value="expired"
                  className="text-gray-800 dark:text-white/80 focus:bg-gray-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                >
                  Expired
                </SelectItem>
                <SelectItem
                  value="frozen"
                  className="text-gray-800 dark:text-white/80 focus:bg-gray-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                >
                  Frozen
                </SelectItem>
                <SelectItem
                  value="cancelled"
                  className="text-gray-800 dark:text-white/80 focus:bg-gray-100 dark:focus:bg-white/10 focus:text-gray-900 dark:focus:text-white"
                >
                  Cancelled
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center" data-testid="text-no-members">
              <p className="text-gray-500 dark:text-white/50">
                No members found
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-lg bg-muted/30 border border-white/5"
                    data-testid={`row-member-${member.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        {member.photoUrl ? (
                          <AvatarImage src={member.photoUrl} alt={member.name} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="text-sm bg-orange-500/20 text-orange-500 dark:text-orange-400">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-white/50 truncate">
                              {member.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-white/50">
                              {member.phone}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${getStatusBadgeClass(member.status)} text-xs flex-shrink-0`}
                            data-testid={`badge-status-${member.id}`}
                          >
                            {member.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                          <p className="text-xs text-gray-500 dark:text-white/50">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {member.joinDate ? format(new Date(member.joinDate), "MMM dd, yyyy") : "N/A"}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 hover:bg-gray-100 dark:hover:bg-white/10"
                              onClick={() => setViewingMember(member)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 hover:bg-gray-100 dark:hover:bg-white/10"
                                onClick={() => setEditingMember(member)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-white/5">
                      <TableHead className="text-gray-600 dark:text-white/60">Avatar</TableHead>
                      <TableHead className="text-gray-600 dark:text-white/60">Name</TableHead>
                      <TableHead className="text-gray-600 dark:text-white/60">Email</TableHead>
                      <TableHead className="text-gray-600 dark:text-white/60">Phone</TableHead>
                      <TableHead className="text-gray-600 dark:text-white/60">Status</TableHead>
                      <TableHead className="text-gray-600 dark:text-white/60">Join Date</TableHead>
                      <TableHead className="text-right text-gray-600 dark:text-white/60">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow
                        key={member.id}
                        className="border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                        data-testid={`row-member-${member.id}`}
                      >
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            {member.photoUrl ? (
                              <AvatarImage src={member.photoUrl} alt={member.name} className="object-cover" />
                            ) : null}
                            <AvatarFallback className="text-sm bg-orange-500/20 text-orange-500 dark:text-orange-400">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">{member.name}</TableCell>
                        <TableCell className="text-gray-700 dark:text-white/70">{member.email}</TableCell>
                        <TableCell className="text-gray-700 dark:text-white/70">{member.phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadgeClass(member.status)} data-testid={`badge-status-${member.id}`}>
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-white/70">
                          {member.joinDate ? format(new Date(member.joinDate), "MMM dd, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
                              onClick={() => setViewingMember(member)}
                              data-testid={`button-view-profile-${member.id}`}
                              title="View Profile"
                            >
                              <User className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white"
                                onClick={() => setEditingMember(member)}
                                data-testid={`button-edit-member-${member.id}`}
                                title="Edit member"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-600 dark:text-white/60 hover:text-red-600 dark:hover:text-red-400"
                                onClick={() => handleDeactivate(member.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-deactivate-member-${member.id}`}
                                title="Deactivate"
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Enter the member details below
            </DialogDescription>
          </DialogHeader>
          <MemberForm
            onSuccess={() => {
              setIsAddDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["/api/members"] });
            }}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update member information</DialogDescription>
          </DialogHeader>
          {editingMember && (
            <MemberForm
              member={editingMember}
              onSuccess={() => {
                setEditingMember(null);
                queryClient.invalidateQueries({ queryKey: ["/api/members"] });
              }}
              onCancel={() => setEditingMember(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <MemberProfileDialog
        member={viewingMember}
        open={!!viewingMember}
        onOpenChange={(open) => !open && setViewingMember(null)}
      />
    </div>
  );
}
