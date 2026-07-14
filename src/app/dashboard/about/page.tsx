import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight font-headline">About DutyFlow</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Our Mission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            DutyFlow is designed to simplify and streamline the process of assigning invigilation duties in educational institutions. Our mission is to eliminate the manual effort, reduce scheduling conflicts, and provide a fair and transparent system for both administrators and invigilators.
          </p>
          <p className="text-muted-foreground">
            Built with modern technology, DutyFlow leverages intelligent suggestions and a user-friendly interface to make duty allotment a hassle-free task. We believe that by optimizing administrative workflows, we can help educators focus on what truly matters: providing quality education.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
