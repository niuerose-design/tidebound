'use client';
import { Collapsible as CollapsiblePrimitive } from 'radix-ui';

/** v3.382 접기(shadcn 기본). 닫혀 있으면 내용을 마운트하지 않습니다(도감처럼 카드가 많은 화면에서 비용을 아낌). */
function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) { return <CollapsiblePrimitive.Root data-slot="collapsible" {...props}/>; }
function CollapsibleTrigger({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) { return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props}/>; }
function CollapsibleContent({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) { return <CollapsiblePrimitive.CollapsibleContent data-slot="collapsible-content" {...props}/>; }
export { Collapsible, CollapsibleTrigger, CollapsibleContent };
