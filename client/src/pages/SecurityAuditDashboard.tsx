import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, Shield, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SecurityAuditLog {
  id: string;
  userName: string;
  role: string;
  errorMessage: string;
  action: string;
  createdAt: string;
}

export default function SecurityAuditDashboard() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: logs, isLoading, refetch } = useQuery<SecurityAuditLog[]>({
    queryKey: ['/api/superadmin/security-audit'],
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/superadmin/security-audit/cleanup');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Cleanup Complete',
        description: `Removed ${data.deletedCount} expired log entries.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/security-audit'] });
    },
    onError: () => {
      toast({
        title: 'Cleanup Failed',
        description: 'Could not clean up expired logs. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.errorMessage.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || log.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'default';
      case 'member':
        return 'secondary';
      case 'trainer':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const totalErrors = logs?.length || 0;
  const memberErrors = logs?.filter(l => l.role === 'member').length || 0;
  const adminErrors = logs?.filter(l => l.role === 'admin').length || 0;
  const trainerErrors = logs?.filter(l => l.role === 'trainer').length || 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
            Security Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            User-facing errors from the last 3 days
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Cleanup
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalErrors}</div>
            <p className="text-xs text-muted-foreground mt-1">In last 3 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Issues</CardTitle>
            <Badge variant="secondary" className="text-xs">Member</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberErrors}</div>
            <p className="text-xs text-muted-foreground mt-1">Member actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Issues</CardTitle>
            <Badge variant="default" className="text-xs">Admin</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminErrors}</div>
            <p className="text-xs text-muted-foreground mt-1">Admin actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trainer Issues</CardTitle>
            <Badge variant="outline" className="text-xs">Trainer</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainerErrors}</div>
            <p className="text-xs text-muted-foreground mt-1">Trainer actions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Error Logs</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead className="hidden md:table-cell">Action</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs && filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(log.role)}>
                          {log.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="text-sm">{log.errorMessage}</span>
                        <span className="md:hidden block text-xs text-muted-foreground mt-1">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {log.action}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(log.createdAt)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No issues found. Your system is running smoothly!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
