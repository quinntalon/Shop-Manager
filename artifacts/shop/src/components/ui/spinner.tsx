import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

// Cast needed: lucide-react ships its own @types/react peer (19.1.x) which
// conflicts with the workspace version (19.2.x) pulled in by Expo packages.
const _Loader2Icon = Loader2Icon as React.FC<React.SVGProps<SVGSVGElement>>

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <_Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
