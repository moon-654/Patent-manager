import { WorkspaceView } from "@/components/workspace-view";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <WorkspaceView>{children}</WorkspaceView>;
}
