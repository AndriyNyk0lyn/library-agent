import { LoadingMessage } from "@/components/ui/feedback";
export default function LoadingLibrary() {
  return (
    <LoadingMessage className="text-muted">
      Loading your library…
    </LoadingMessage>
  );
}
