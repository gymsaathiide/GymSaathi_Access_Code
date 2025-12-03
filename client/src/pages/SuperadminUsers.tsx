import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ModernLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Shield, Mail, Phone, User, Trash2, Eye, EyeOff, AlertTriangle, UserCog } from "lucide-react";
import { format } from "date-fns";

const newUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type NewUserForm = z.infer<typeof newUserSchema>;

interface SuperadminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: number;
  isOtpVerified: number;
  createdAt: string;
  lastLogin: string | null;
}

export default function SuperadminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const form = useForm<NewUserForm>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const { data: superadmins, isLoading } = useQuery<SuperadminUser[]>({
    queryKey: ["/api/superadmin/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/superadmin/users");
      return await response.json();
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: NewUserForm) => {
      const response = await apiRequest("POST", "/api/superadmin/users", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Superadmin created",
        description: "New superadmin account has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create superadmin",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/superadmin/users/${userId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/superadmin/users"] });
      setDeleteUserId(null);
      toast({
        title: "Superadmin removed",
        description: "The superadmin account has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to remove superadmin",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewUserForm) => {
    createUserMutation.mutate(data);
  };

  return (
    <ModernLayout>
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
            <p className="text-gray-400">Manage superadmin access and permissions</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Superadmin
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1a2e] border-white/10 text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-400" />
                  Add New Superadmin
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Create a new account with superadmin privileges. They will receive an email to verify their account.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                              {...field}
                              placeholder="Enter full name"
                              className="pl-10 h-11 bg-[#0a0a0f] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="Enter email address"
                              className="pl-10 h-11 bg-[#0a0a0f] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                              {...field}
                              placeholder="Enter phone number"
                              className="pl-10 h-11 bg-[#0a0a0f] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Temporary Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Set temporary password"
                              className="pl-10 pr-10 h-11 bg-[#0a0a0f] border-white/10 text-white placeholder:text-gray-500 focus:border-orange-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1 border-white/10 text-gray-300 hover:bg-white/5"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createUserMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                    >
                      {createUserMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Create Superadmin"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-[#1a1a2e]/50 border-white/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center">
                  <UserCog className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Superadmins</p>
                  <p className="text-2xl font-bold text-white">{superadmins?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a2e]/50 border-white/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Verified</p>
                  <p className="text-2xl font-bold text-white">
                    {superadmins?.filter(u => u.isOtpVerified === 1).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a2e]/50 border-white/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Pending Verification</p>
                  <p className="text-2xl font-bold text-white">
                    {superadmins?.filter(u => u.isOtpVerified === 0).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="bg-[#1a1a2e]/50 border-white/5">
          <CardHeader>
            <CardTitle className="text-white">Superadmin Accounts</CardTitle>
            <CardDescription className="text-gray-400">
              All users with superadmin privileges
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
              </div>
            ) : superadmins && superadmins.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead className="text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-400">Phone</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Created</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {superadmins.map((user) => (
                      <TableRow key={user.id} className="border-white/5">
                        <TableCell className="text-white font-medium">{user.name}</TableCell>
                        <TableCell className="text-gray-300">{user.email}</TableCell>
                        <TableCell className="text-gray-300">{user.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.isOtpVerified === 1
                                ? "border-green-500/30 text-green-400 bg-green-500/10"
                                : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                            }
                          >
                            {user.isOtpVerified === 1 ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {deleteUserId === user.id ? (
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-red-400 text-xs">Confirm?</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                disabled={deleteUserMutation.isPending}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                              >
                                {deleteUserMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Yes"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteUserId(null)}
                                className="text-gray-400 hover:text-white hover:bg-white/5 h-8 px-2"
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteUserId(user.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 px-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <UserCog className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No superadmin accounts found</p>
                <p className="text-gray-500 text-sm mt-1">Click "Add Superadmin" to create one</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModernLayout>
  );
}
