
"use client";

import { useAllotment } from "@/lib/allotment-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Eye, Archive } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function HistoryPage() {
  const { savedAllotments, updateSavedAllotment } = useAllotment();

  const finalizedAllotments = savedAllotments.filter(a => a.status === 'Finalized' || a.status === 'Archived');

  const handleArchive = (allotmentId: string) => {
    updateSavedAllotment(allotmentId, { status: 'Archived' });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Allotment History</h1>
      <Card>
        <CardHeader>
          <CardTitle>Past Allotments</CardTitle>
          <CardDescription>Review and access records of previously finalized duty allotments.</CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Allotment Name</TableHead>
                  <TableHead>Date Finalized</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finalizedAllotments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No finalized allotments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  finalizedAllotments.map((allotment) => (
                    <TableRow key={allotment.id}>
                      <TableCell className="font-medium">{allotment.name}</TableCell>
                      <TableCell>{format(allotment.createdAt, "PPP")}</TableCell>
                      <TableCell>
                        <Badge variant={allotment.status === "Finalized" ? "default" : "secondary"}>
                          {allotment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>View Details (coming soon)</p></TooltipContent>
                        </Tooltip>
                        {allotment.status === 'Finalized' && (
                           <Tooltip>
                               <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleArchive(allotment.id)}>
                                        <Archive className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Archive</p></TooltipContent>
                           </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
