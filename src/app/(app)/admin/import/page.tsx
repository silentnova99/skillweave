import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Admin · Bulk import" };

export default function AdminImportPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk import resources</CardTitle>
        <CardDescription>
          Paste a JSON array to add or update many resources at once. This never
          re-hosts content — it only stores links and metadata.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ImportForm />
      </CardContent>
    </Card>
  );
}
