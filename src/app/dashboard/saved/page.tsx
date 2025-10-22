
"use client";

import { useAllotment } from "@/lib/allotment-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MoreVertical, Edit, Trash2, CheckCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";

export default function SavedAllotmentsPage() {
  const { savedAllotments, setActiveAllotment, deleteSavedAllotment, updateSavedAllotment } = useAllotment();
  const router = useRouter();
  const { toast } = useToast();

  const handleOpen = (allotmentId: string) => {
    const allotmentToOpen = savedAllotments.find(a => a.id === allotmentId);
    if (allotmentToOpen) {
      setActiveAllotment(allotmentToOpen);
      router.push("/dashboard/allotment");
    }
  };
  
  const handleFinalize = (allotmentId: string) => {
    updateSavedAllotment(allotmentId, { status: 'Finalized' });
    toast({
        title: "Allotment Finalized",
        description: "The allotment has been moved to History."
    })
  }
  
  const draftAllotments = savedAllotments.filter(a => a.status === 'Draft');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Saved Allotments</h1>
      
      {draftAllotments.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>No Saved Drafts</CardTitle>
            <CardDescription>You haven't saved any allotment sheets yet. Once you save one, it will appear here.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {draftAllotments.map((allotment) => (
            <Card key={allotment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{allotment.name}</CardTitle>
                        <CardDescription>Last updated: {format(allotment.createdAt, "PPP")}</CardDescription>
                    </div>
                    <AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpen(allotment.id)}>
                                    <Edit className="mr-2 h-4 w-4" /> Open
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleFinalize(allotment.id)}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Finalize
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the allotment sheet named "{allotment.name}".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSavedAllotment(allotment.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={allotment.status === "Draft" ? "outline" : "default"}>{allotment.status}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invigilators</span>
                  <span>{allotment.invigilators.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Examinations</span>
                  <span>{allotment.examinations.length}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleOpen(allotment.id)}>Open</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
