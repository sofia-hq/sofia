import React from "react"
import type { SofiaDecision } from "@/types"
import { 
  Collapsible, 
  CollapsibleTrigger, 
  CollapsibleContent 
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Wrench, ArrowRight, MessageSquare, X } from "lucide-react"

interface DecisionDetailsProps {
  decision: SofiaDecision
}

export function DecisionDetails({ decision }: DecisionDetailsProps) {
  if (!decision) return null
  
  return (
    <div className="flex flex-col gap-2 mt-2 text-sm">
      {/* Reasoning Section */}
      {decision.reasoning && decision.reasoning.length > 0 && (
        <Collapsible className="w-full border rounded-md overflow-hidden">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <ChevronRight className="w-4 h-4 collapsible-closed" />
              <ChevronDown className="w-4 h-4 collapsible-open" />
              <span>Reasoning</span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 py-2 border-t bg-muted/20">
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              {decision.reasoning.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {/* Action Section */}
      <div className="flex items-center gap-2 px-2">
        <span className="text-xs font-medium text-muted-foreground">Action:</span>
        <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-md">
          {decision.action === "ANSWER" && <MessageSquare className="w-3 h-3" />}
          {decision.action === "ASK" && <MessageSquare className="w-3 h-3" />}
          {decision.action === "TOOL_CALL" && <Wrench className="w-3 h-3" />}
          {decision.action === "MOVE" && <ArrowRight className="w-3 h-3" />}
          {decision.action === "END" && <X className="w-3 h-3" />}
          <span className="text-xs">{decision.action}</span>
        </div>
      </div>
      
      {/* Next Step Section */}
      {decision.action === "MOVE" && decision.next_step_id && (
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs font-medium text-muted-foreground">Next Step:</span>
          <code className="px-2 py-1 bg-muted/30 rounded-md text-xs">{decision.next_step_id}</code>
        </div>
      )}
      
      {/* Tool Call Section */}
      {decision.action === "TOOL_CALL" && decision.tool_name && (
        <Collapsible className="w-full border rounded-md overflow-hidden">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted/50">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <ChevronRight className="w-4 h-4 collapsible-closed" />
              <ChevronDown className="w-4 h-4 collapsible-open" />
              <Wrench className="w-3 h-3 mr-1" />
              <span>Tool: {decision.tool_name}</span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 py-2 border-t bg-muted/20">
            <pre className="p-2 bg-muted/30 rounded-md overflow-x-auto text-xs">
              {JSON.stringify(decision.tool_kwargs, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
