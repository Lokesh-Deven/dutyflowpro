import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const savedAllotments = [
  { id: "save-001", name: "Final Exams - Fall 2024 Draft", date: "2024-10-25", invigilators: 22, exams: 35, status: "Draft" },
  { id: "save-002", name: "Supplementary Exams - Summer 2024", date: "2024-07-10", invigilators: 15, exams: 18, status: "Finalized" },
];

export default function SavedAllotmentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">Saved Allotments</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {savedAllotments.map((allotment) => (
          <Card key={allotment.id}>
            <CardHeader>
              <CardTitle>{allotment.name}</CardTitle>
              <CardDescription>Last updated: {allotment.date}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={allotment.status === "Draft" ? "outline" : "default"}>{allotment.status}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invigilators</span>
                <span>{allotment.invigilators}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Examinations</span>
                <span>{allotment.exams}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Open</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
