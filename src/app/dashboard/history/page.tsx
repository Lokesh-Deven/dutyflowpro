import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const pastAllotments = [
  { id: "hist-001", name: "Final Exams - Spring 2024", date: "2024-05-20", status: "Completed" },
  { id: "hist-002", name: "Mid-Term Exams - Fall 2023", date: "2023-10-15", status: "Completed" },
  { id: "hist-003", name: "Entrance Exams - 2023", date: "2023-08-01", status: "Archived" },
];

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Allotment History</h1>
      <Card>
        <CardHeader>
          <CardTitle>Past Allotments</CardTitle>
          <CardDescription>Review and access records of previously generated duty allotments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Allotment Name</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastAllotments.map((allotment) => (
                <TableRow key={allotment.id}>
                  <TableCell className="font-medium">{allotment.name}</TableCell>
                  <TableCell>{allotment.date}</TableCell>
                  <TableCell>
                    <Badge variant={allotment.status === "Completed" ? "default" : "secondary"}>
                      {allotment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Actions like View, Download would go here */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
